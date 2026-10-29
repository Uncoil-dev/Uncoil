"""One-line, optional provider instrumentation. Provider libraries remain optional."""
import contextvars
import inspect
import time
import uuid
from . import _client, _current_trace, current_run_id, current_span_id, _payload


def _dict(value):
    if isinstance(value, dict): return value
    if hasattr(value, "model_dump"): return value.model_dump()
    return {}


class Observation:
    def __init__(self, provider, model, input_data, options, scope=None):
        self.options = options
        self.client = _client(options.get("client"))
        self.started = time.time()
        self.ended = False
        self.text = ""
        inherited = current_run_id()
        self.implicit = scope is None and inherited == "unknown"
        self.root_id = str(uuid.uuid4()) if self.implicit else None
        scope = scope or {}
        self.data = dict(runId=scope.get("run_id") or (str(uuid.uuid4()) if self.implicit else inherited), spanId=scope.get("span_id") or str(uuid.uuid4()),
                         parentSpanId=scope.get("parent_span_id") or self.root_id or current_span_id(), spanType=scope.get("type", "llm_call"),
                         toolName=scope.get("name") or "%s.%s" % (provider, model or "call"), modelId=model,
                         traceName=_current_trace.get() or options.get("name") or provider,
                         input="[not captured]" if options.get("capture_input") is False else input_data,
                         createdAt=__import__("datetime").datetime.fromtimestamp(self.started, __import__("datetime").timezone.utc).isoformat(),
                         metadata=dict(provider=provider, costKnown=False))
        self.root = scope.get("root", False)

    def usage(self, raw, model=None):
        usage = _dict(raw)
        self.data["modelId"] = model or self.data["modelId"]
        self.data["inputTokens"] = int(usage.get("input_tokens", usage.get("prompt_tokens", 0)) or 0)
        if self.data["metadata"]["provider"] == "anthropic":
            self.data["inputTokens"] += int(usage.get("cache_creation_input_tokens", 0) or 0) + int(usage.get("cache_read_input_tokens", 0) or 0)
        self.data["outputTokens"] = int(usage.get("output_tokens", usage.get("completion_tokens", 0)) or 0)
        self.data["metadata"]["usage"] = usage
        calculate = self.options.get("calculate_cost")
        if calculate:
            try:
                cost = float(calculate(dict(provider=self.data["metadata"]["provider"], model=self.data["modelId"], input_tokens=self.data["inputTokens"], output_tokens=self.data["outputTokens"], usage=usage)))
                if cost >= 0 and __import__("math").isfinite(cost):
                    self.data["costUsd"] = cost
                    self.data["metadata"]["costKnown"] = True
            except Exception: pass

    def collect(self, value):
        event = _dict(value)
        result = event.get("response") or event.get("message") or event
        if result.get("usage") and event.get("type") != "message_delta": self.usage(result["usage"], result.get("model"))
        if result.get("model"): self.data["modelId"] = result["model"]
        delta = event.get("delta") or {}
        choices = event.get("choices") or []
        text = (choices[0].get("delta", {}).get("content") if choices else None) or (delta.get("text") if isinstance(delta, dict) else delta if event.get("type") == "response.output_text.delta" else "") or ""
        if text:
            self.data.setdefault("ttftMs", int((time.time() - self.started) * 1000))
            self.text = (self.text + text)[:10000]
        if event.get("type") == "message_delta" and event.get("usage"):
            self.usage(dict(self.data["metadata"].get("usage", {}), **{key: value for key, value in event["usage"].items() if value is not None}))
        reason = (choices[0].get("finish_reason") if choices else None) or (delta.get("stop_reason") if isinstance(delta, dict) else None) or result.get("stop_reason")
        if reason: self.data["metadata"]["finishReason"] = reason
        if event.get("type") in ("error", "response.failed"):
            error = event.get("error") or result.get("error") or {}
            self.finish(error=RuntimeError(error.get("message", "Provider stream failed")))
        return text

    def finish(self, output=None, error=None, cancelled=False):
        if self.ended: return
        self.ended = True
        self.data["latencyMs"] = int((time.time() - self.started) * 1000)
        self.data["output"] = "[not captured]" if self.options.get("capture_output") is False else output if output is not None else self.text
        self.data["metadata"]["cancelled"] = cancelled
        if error is not None or cancelled:
            self.data["errorType"] = "AbortError" if cancelled else error.__class__.__name__
            self.data["errorMessage"] = _payload("Stream cancelled before completion" if cancelled else str(error))
        if self.root: self.data["spanType"] = "error" if error is not None or cancelled else "run_end"
        try: self.client.ingest(**self.data)
        except Exception: pass
        if self.implicit:
            root = dict(self.data, spanId=self.root_id, spanType="error" if error is not None or cancelled else "run_end", toolName=self.options.get("name") or self.data["metadata"]["provider"], parentSpanId=None, costUsd=0, inputTokens=0, outputTokens=0)
            root["metadata"] = dict(provider=self.data["metadata"]["provider"], implicitRoot=True)
            try: self.client.ingest(**root)
            except Exception: pass


class _Stream:
    def __init__(self, raw, observation): self.raw, self.observation = raw, observation
    def __getattr__(self, key):
        if key == "text_stream":
            if hasattr(self.raw, "__aiter__"):
                async def texts():
                    async for event in self:
                        text = _dict(event).get("delta", {}).get("text")
                        if text: yield text
                return texts()
            def texts():
                for event in self:
                    text = _dict(event).get("delta", {}).get("text")
                    if text: yield text
            return texts()
        return getattr(self.raw, key)
    def __iter__(self):
        complete = False
        try:
            for value in self.raw:
                self.observation.collect(value)
                yield value
            complete = True
        except GeneratorExit: raise
        except BaseException as error:
            self.observation.finish(error=error)
            raise
        finally: self.observation.finish(cancelled=not complete)
    async def __aiter__(self):
        complete = False
        try:
            async for value in self.raw:
                self.observation.collect(value)
                yield value
            complete = True
        except GeneratorExit: raise
        except BaseException as error:
            self.observation.finish(error=error)
            raise
        finally: self.observation.finish(cancelled=not complete)
    def close(self):
        try: return self.raw.close()
        finally: self.observation.finish(cancelled=True)
    async def aclose(self):
        try:
            result = self.raw.close()
            if inspect.isawaitable(result): await result
        finally: self.observation.finish(cancelled=True)
    def __enter__(self): return self
    def __exit__(self, typ, error, tb):
        self.observation.finish(error=error, cancelled=not self.observation.ended)
        return self.raw.__exit__(typ, error, tb)
    async def __aenter__(self): return self
    async def __aexit__(self, typ, error, tb):
        self.observation.finish(error=error, cancelled=not self.observation.ended)
        return await self.raw.__aexit__(typ, error, tb)
    def get_final_message(self):
        if hasattr(self.raw, "__aiter__"):
            async def final():
                async for _ in self: pass
                message = await self.raw.get_final_message()
                self.observation.collect(message)
                self.observation.finish(_dict(message).get("content"))
                return message
            return final()
        for _ in self: pass
        message = self.raw.get_final_message()
        self.observation.collect(message)
        self.observation.finish(_dict(message).get("content"))
        return message
    def until_done(self):
        if hasattr(self.raw, "__aiter__"):
            async def done():
                async for _ in self: pass
            return done()
        for _ in self: pass


class _StreamManager:
    def __init__(self, raw, observation): self.raw, self.observation = raw, observation
    def __enter__(self):
        try: return _Stream(self.raw.__enter__(), self.observation)
        except BaseException as e:
            self.observation.finish(error=e)
            raise
    def __exit__(self, typ, error, tb):
        try: return self.raw.__exit__(typ, error, tb)
        finally: self.observation.finish(error=error, cancelled=not self.observation.ended)
    async def __aenter__(self):
        try: return _Stream(await self.raw.__aenter__(), self.observation)
        except BaseException as e:
            self.observation.finish(error=e)
            raise
    async def __aexit__(self, typ, error, tb):
        try: return await self.raw.__aexit__(typ, error, tb)
        finally: self.observation.finish(error=error, cancelled=not self.observation.ended)


def _observe_result(result, obs):
    if hasattr(result, "__iter__") and hasattr(result, "close") or hasattr(result, "__aiter__"):
        return _Stream(result, obs)
    if hasattr(result, "__enter__") or hasattr(result, "__aenter__"):
        return _StreamManager(result, obs)
    obs.collect(result)
    value = _dict(result)
    obs.finish(value.get("choices", value.get("output", value.get("content", value))))
    return result


# Set while a wrapped client calls the provider, so auto-instrumentation does not record the call twice.
_inside_wrapped = contextvars.ContextVar("uncoil_inside_wrapped", default=False)


def _traced_call(provider, path, value, args, kwargs, options):
    """Run one provider call (`value`) and record it. Shared by wrapped clients and `auto_instrument`."""
    params = dict(kwargs)
    if provider == "openai" and path.startswith("chat.") and params.get("stream") and "include_usage" not in (params.get("stream_options") or {}): params["stream_options"] = dict(params.get("stream_options") or {}, include_usage=True)
    input_data = params.get("messages", params.get("input", ""))
    if params.get("system"): input_data = [dict(role="system", content=params["system"])] + list(params.get("messages", []))
    if params.get("instructions"): input_data = dict(instructions=params["instructions"], input=params.get("input"))
    obs = Observation(provider, params.get("model", ""), input_data, options)
    try: result = value(*args, **params)
    except BaseException as error:
        obs.finish(error=error)
        raise
    if inspect.isawaitable(result):
        async def resolve():
            try: return _observe_result(await result, obs)
            except BaseException as error:
                obs.finish(error=error)
                raise
        return resolve()
    return _observe_result(result, obs)


class _ClientProxy:
    def __init__(self, target, provider, options, path="", cache=None):
        self._target, self._provider, self._options, self._path = target, provider, options, path
        self._cache = cache if cache is not None else {}
    def __enter__(self):
        self._target.__enter__()
        return self
    def __exit__(self, *args): return self._target.__exit__(*args)
    async def __aenter__(self):
        await self._target.__aenter__()
        return self
    async def __aexit__(self, *args): return await self._target.__aexit__(*args)
    def __getattr__(self, key):
        value = getattr(self._target, key)
        path = self._path + ("." if self._path else "") + key
        allowed = ("chat.completions.create", "responses.create") if self._provider == "openai" else ("messages.create", "messages.stream", "beta.messages.create", "beta.messages.stream")
        if path in allowed and callable(value):
            def call(*args, **kwargs):
                token = _inside_wrapped.set(True)
                try: return _traced_call(self._provider, path, value, args, kwargs, self._options)
                finally: _inside_wrapped.reset(token)
            return call
        if path in ("chat", "chat.completions", "responses", "messages", "beta", "beta.messages"):
            if path not in self._cache: self._cache[path] = _ClientProxy(value, self._provider, self._options, path, self._cache)
            return self._cache[path]
        return value


def wrap_openai(provider_client, **options):
    """Wrap an OpenAI/AsyncOpenAI client without importing the provider SDK."""
    return provider_client if isinstance(provider_client, _ClientProxy) else _ClientProxy(provider_client, "openai", options)


def wrap_anthropic(provider_client, **options):
    """Wrap an Anthropic/AsyncAnthropic client, including messages.stream helpers."""
    return provider_client if isinstance(provider_client, _ClientProxy) else _ClientProxy(provider_client, "anthropic", options)
