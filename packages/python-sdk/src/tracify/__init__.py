import os
import time
import json
import uuid
import functools
import asyncio
import threading
import re
import contextlib
import contextvars
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeout
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Union

try:
    import httpx
    _HAS_HTTPX = True
except ImportError:
    _HAS_HTTPX = False

import requests as _requests_fallback



# The current run and step for this thread or async task. Context variables keep concurrent runs apart, so
# steps from two agents running at once never land in each other's trace.
_current_run: "contextvars.ContextVar[Optional[str]]" = contextvars.ContextVar("tracify_run", default=None)
_current_span: "contextvars.ContextVar[Optional[str]]" = contextvars.ContextVar("tracify_span", default=None)

_current_client = contextvars.ContextVar("tracify_client", default=None)
_current_trace = contextvars.ContextVar("tracify_trace", default=None)

MAX_PAYLOAD_CHARS = 10_000
_SECRET_PATTERNS = [
    re.compile(r"(?i)\bbearer\s+[a-z0-9._~+/=-]{12,}"),
    re.compile(r"\b(?:sk|pk|rk)[-_](?:live|test|proj|ant)?[-_]?[A-Za-z0-9_-]{16,}"),
    re.compile(r"\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}"),
    re.compile(r"(?i)((?:api[_-]?key|password|secret|token)[\"']?\s*[:=]\s*[\"']?)[^\s\"',}]{6,}"),
]


def _redact(text: str) -> str:
    for pattern in _SECRET_PATTERNS:
        text = pattern.sub(lambda m: (m.group(1) if m.lastindex else "") + "[redacted]", text)
    return text


class TracifyError(ValueError):
    """A problem the SDK ran into. `hint` says in plain words how to fix it."""

    def __init__(self, code: str, message: str, hint: str, status: Optional[int] = None):
        super().__init__(f"{message} {hint}")
        self.code = code
        self.hint = hint
        self.status = status


_PII_PATTERNS = [
    re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"),
    re.compile(r"(?<![\w.])\+?\d{1,3}[\s.-]?\(?\d{2,4}\)?[\s.-]\d{3,4}[\s.-]\d{3,4}\b"),
]


_CARD_NUMBER = re.compile(r"\b(?:\d[ -]?){13,19}\b")


def _passes_luhn(digits: str) -> bool:
    """Card-number check, so long ids and timestamps are left alone."""
    total = 0
    for i, ch in enumerate(reversed(digits)):
        d = int(ch)
        if i % 2 == 1:
            d *= 2
            if d > 9:
                d -= 9
        total += d
    return total % 10 == 0


def build_redactor(pii: bool = True, patterns: Optional[List[Any]] = None, fn: Optional[Callable[[str], str]] = None, replacement: str = "[redacted]") -> Optional[Callable[[str], str]]:
    """Build the clean-up applied to prompts and answers. Emails, phone numbers and card numbers are masked unless pii=False."""
    compiled = list(_PII_PATTERNS) if pii else []
    for pattern in patterns or []:
        if isinstance(pattern, str):
            if pattern:
                compiled.append(re.compile(re.escape(pattern)))
        else:
            compiled.append(pattern)
    if not compiled and not pii and fn is None:
        return None

    def _card(match: "re.Match[str]") -> str:
        digits = re.sub(r"\D", "", match.group(0))
        return replacement if len(digits) >= 13 and _passes_luhn(digits) else match.group(0)

    def redact(text: str) -> str:
        if pii:
            text = _CARD_NUMBER.sub(_card, text)
        for pattern in compiled:
            text = pattern.sub(replacement, text)
        return fn(text) if fn else text

    return redact


def sample_bucket(run_id: str) -> float:
    """Stable number in [0, 1) for a run id, so every span of a run gets the same sampling decision."""
    h = 2166136261
    for ch in str(run_id):
        h = ((h ^ ord(ch)) * 16777619) & 0xFFFFFFFF
    return h / 4294967296


def _payload(value: Any) -> str:
    """Serialise an input or output, remove obvious secrets and cap its size."""
    if value is None:
        return ""
    if not isinstance(value, str):
        try:
            value = json.dumps(value, default=str)
        except Exception:
            value = str(value)
    value = _redact(value)
    if len(value) > MAX_PAYLOAD_CHARS:
        value = value[:MAX_PAYLOAD_CHARS] + f"… [truncated {len(value) - MAX_PAYLOAD_CHARS} chars]"
    return value


def current_run_id() -> str:
    return _current_run.get() or os.environ.get("TRACIFY_CURRENT_RUN_ID") or "unknown"


def current_span_id() -> Optional[str]:
    return _current_span.get()


class LatencyBudgetExceeded(Exception):
    """Raised when a call exceeds the latency budget and is aborted."""
    pass


class CancellationToken:
    """
    Cooperative cancellation token passed to the user's call function.

    When the latency budget expires, the SDK sets this token as cancelled.
    The user's call function should check ``token.is_cancelled`` periodically
    and raise or return early if true.

    Example::

        def my_llm_call(model: str, token: CancellationToken) -> dict:
            # Check before making the HTTP call
            if token.is_cancelled:
                raise LatencyBudgetExceeded("Cancelled")
            response = httpx.post(..., timeout=30)
            return response.json()

    For true cancellation of in-flight HTTP requests, the user should use
    ``token`` with an httpx client::

        def my_llm_call(model: str, token: CancellationToken) -> dict:
            with httpx.Client(timeout=30) as client:
                # httpx will close the connection if the client is garbage collected
                # after the timeout fires and this function returns
                return client.post(...).json()
    """

    def __init__(self):
        self._cancelled = threading.Event()

    @property
    def is_cancelled(self) -> bool:
        return self._cancelled.is_set()

    def cancel(self):
        self._cancelled.set()

    def check(self):
        """Raise LatencyBudgetExceeded if cancelled. Call this in long-running loops."""
        if self._cancelled.is_set():
            raise LatencyBudgetExceeded("Call cancelled by latency budget")


@dataclass
class RuntimePolicy:
    enforcement_mode: str = "observe"  # "observe" | "enforce"
    max_cost_per_run: Optional[float] = None
    max_cost_per_day: Optional[float] = None
    fallback_chain: List[str] = field(default_factory=list)
    max_attempts: int = 3
    backoff_ms: float = 1000
    backoff_multiplier: float = 2
    retryable_errors: List[str] = field(default_factory=lambda: ["timeout", "5xx"])
    latency_budget_ms: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "enforcementMode": self.enforcement_mode,
            "maxCostPerRun": self.max_cost_per_run,
            "maxCostPerDay": self.max_cost_per_day,
            "fallbackChain": self.fallback_chain,
            "retryPolicy": {
                "maxAttempts": self.max_attempts,
                "backoffMs": self.backoff_ms,
                "backoffMultiplier": self.backoff_multiplier,
                "retryableErrors": self.retryable_errors,
            },
            "latencyBudgetMs": self.latency_budget_ms,
        }


def _is_retryable_error(error: Exception, retryable_errors: List[str]) -> bool:
    if isinstance(error, LatencyBudgetExceeded):
        return False
    msg = str(error).lower()
    status = getattr(error, "status_code", None) or getattr(error, "status", None) or 0

    for code in retryable_errors:
        if code == "timeout" and ("timeout" in msg or "timed out" in msg):
            return True
        if code == "5xx" and isinstance(status, int) and 500 <= status < 600:
            return True
        if code == "429" and (status == 429 or "rate limit" in msg or "too many requests" in msg):
            return True
        if code == "rate_limit" and (status == 429 or "rate limit" in msg or "throttl" in msg):
            return True
        if code == "overloaded" and ("overloaded" in msg or "capacity" in msg or "busy" in msg):
            return True
    return False


def _is_latency_abort(error: Exception) -> bool:
    return isinstance(error, LatencyBudgetExceeded)


_EXECUTOR = ThreadPoolExecutor(max_workers=4, thread_name_prefix="tracify-latency")


def _run_with_timeout(
    func: Callable[[CancellationToken], Any],
    timeout_ms: Optional[int],
) -> Any:
    """
    Run func(token) in a thread with a cooperative timeout.

    The function receives a CancellationToken. When the timeout fires,
    the token is set to cancelled. The function is responsible for checking
    token.is_cancelled (or calling token.check()) and exiting cleanly.

    If the function does not check the token, it will continue running in
    the background after LatencyBudgetExceeded is raised. This is the same
    behavior as TS's AbortController when the user's call ignores the signal,
    but in Python the "background" thread is more visible.

    Returns the function's result, or raises LatencyBudgetExceeded on timeout.
    """
    if timeout_ms is None:
        token = CancellationToken()
        return func(token)

    token = CancellationToken()
    result = [None]
    exception = [None]

    def target():
        try:
            result[0] = func(token)
        except Exception as e:
            exception[0] = e

    future = _EXECUTOR.submit(target)
    try:
        future.result(timeout=timeout_ms / 1000)
    except FuturesTimeout:
        token.cancel()
        # Give the function a brief window to notice the cancellation
        # and clean up (e.g., close HTTP connections).
        try:
            future.result(timeout=0.5)
        except (FuturesTimeout, Exception):
            pass
        raise LatencyBudgetExceeded(
            f"Call exceeded latency budget of {timeout_ms}ms. "
            "The underlying call may still be running in the background."
        )
    except Exception as e:
        if exception[0] is not None:
            raise exception[0]
        raise

    if exception[0] is not None:
        raise exception[0]

    return result[0]


class TracifyClient:
    REGION_HOSTS = {
        "eu": "https://eu.cloud.tracify.tech",
        "us": "https://us.cloud.tracify.tech",
    }

    def __init__(self, api_key: Optional[str] = None, host: Optional[str] = None, project_id: Optional[str] = None, region: Optional[str] = None, release: Optional[str] = None, environment: Optional[str] = None, deployment_id: Optional[str] = None, session_id: Optional[str] = None, end_user_id: Optional[str] = None, tags: Optional[List[str]] = None, sample_rate: float = 1.0, keep_errors: bool = True, redact: Optional[Dict[str, Any]] = None, on_error: Optional[Callable[["TracifyError"], None]] = None):
        self.on_error = on_error
        self._warned: set = set()
        self.api_key = (api_key or os.environ.get("TRACIFY_API_KEY") or "").strip()
        if not self.api_key:
            raise TracifyError("missing_key", "No Tracify API key was found.", "Pass api_key=... to TracifyClient or set the TRACIFY_API_KEY environment variable. You can create a key on the API keys page of your dashboard.")
        if not self.api_key.startswith("tracify_sk_"):
            self._report(TracifyError("odd_key", "That API key does not look like a Tracify key (they start with tracify_sk_).", "Copy the key again from the API keys page of your dashboard; make sure no other service's key was pasted by mistake."))
        if not isinstance(sample_rate, (int, float)) or isinstance(sample_rate, bool) or not 0 <= sample_rate <= 1:
            raise TracifyError("bad_sample_rate", f"sample_rate must be a number from 0 to 1, but got {sample_rate!r}.", "Use 1 to record every run, 0.1 to record about one in ten.")
        self.sample_rate = float(sample_rate)
        self.keep_errors = keep_errors
        self._redactor = build_redactor(**(redact or {}))
        selected_region = (region or os.environ.get("TRACIFY_REGION") or "eu").strip().lower()
        if selected_region not in self.REGION_HOSTS:
            raise TracifyError("bad_region", f"The region {selected_region!r} is not one Tracify offers.", "Use region='eu' or region='us' (or set TRACIFY_REGION to one of them).")
        self.host = (host or os.environ.get("TRACIFY_HOST") or self.REGION_HOSTS[selected_region]).rstrip("/")
        if not self.host.startswith(("http://", "https://")):
            raise TracifyError("bad_host", f"The host {self.host!r} is not a valid web address.", "Use a full address such as 'https://eu.cloud.tracify.tech', or drop the host option and use region='eu' or 'us'.")
        host_region = next((key for key, value in self.REGION_HOSTS.items() if value == self.host), None)
        key_region = self._api_key_region(self.api_key)
        if key_region and host_region and key_region != host_region:
            raise TracifyError("region_mismatch", f"Tracify API key region mismatch: this key belongs to {key_region.upper()}, but the client is configured for {host_region.upper()}.", f"Set region='{key_region}' (or TRACIFY_REGION={key_region}), or create a key in the {host_region.upper()} region.")
        self.project_id = project_id
        self.release = release
        self.environment = environment
        self.deployment_id = deployment_id
        self.session_id = session_id
        self.end_user_id = end_user_id
        self.tags = tags or []
        self.ingest_url = f"{self.host}/api/ingest"
        self.check_cost_url = f"{self.host}/api/orchestration/check-cost"
        self._http = httpx.Client(timeout=10) if _HAS_HTTPX else None
        self._last_fail_open = False
        self._prompt_cache: Dict[str, Any] = {}

    @staticmethod
    def _api_key_region(api_key: str) -> Optional[str]:
        if api_key.startswith("tracify_sk_live_eu_"):
            return "eu"
        if api_key.startswith("tracify_sk_live_us_"):
            return "us"
        if api_key.startswith("tracify_sk_live_"):
            return "eu"
        return None

    def _report(self, error: "TracifyError"):
        """Tell the app about a problem once per kind: through on_error if given, otherwise as a printed warning."""
        if error.code in self._warned:
            return
        self._warned.add(error.code)
        if self.on_error:
            try:
                self.on_error(error)
            except Exception:
                pass  # a faulty handler must never break the app
        else:
            print(f"Tracify Warning: {error}")

    def _check_response(self, status: int):
        if status < 400:
            return
        if status == 401:
            self._report(TracifyError("bad_key", "Tracify rejected the API key (401).", "The key is wrong, was revoked, or belongs to another region. Check TRACIFY_API_KEY and TRACIFY_REGION.", status))
        elif status == 403:
            self._report(TracifyError("forbidden", "This API key is not allowed to send data (403).", "Check that the key belongs to the project you expect and has not been disabled.", status))
        elif status == 429:
            self._report(TracifyError("rate_limited", "Tracify is receiving too much data from this app (429).", "Lower the volume with sample_rate (for example 0.2), or upgrade your plan.", status))
        elif status >= 500:
            self._report(TracifyError("server_error", f"Tracify had a problem on its side ({status}).", "Your app is not affected; data from this moment may be missing. Check the status page if it keeps happening.", status))
        else:
            self._report(TracifyError("rejected", f"Tracify did not accept a span ({status}).", "Update the SDK to the latest version; if it still happens, contact support.", status))

    def _sampled_out(self, span: Dict[str, Any]) -> bool:
        if self.sample_rate >= 1:
            return False
        if self.keep_errors and (span.get("errorType") or span.get("errorMessage")):
            return False
        return sample_bucket(span.get("runId") or "") >= self.sample_rate

    def _send_span(self, span: Dict[str, Any]):
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            if self._http:
                response = self._http.post(self.ingest_url, headers=headers, json=span)
            else:
                response = _requests_fallback.post(self.ingest_url, headers=headers, json=span, timeout=2)
            self._check_response(getattr(response, "status_code", 200))
        except Exception as e:
            self._report(TracifyError("network", f"Could not reach Tracify ({e}).", "Check your internet connection and the host setting. Your app keeps running; these spans are dropped."))

    def ingest(self, **kwargs):
        span = {
            "spanId": str(uuid.uuid4()),
            "createdAt": datetime.utcnow().isoformat() + "Z",
            "metadata": {},
            **kwargs
        }
        if not span.get("runId"):
            span["runId"] = current_run_id()
        span.setdefault("traceName", _current_trace.get())
        parent = current_span_id()
        if not span.get("parentSpanId") and parent and parent != span["spanId"]:
            span["parentSpanId"] = parent
        for key in ("input", "output"):
            if key in span:
                span[key] = _payload(span[key])
                if self._redactor and span[key]:
                    span[key] = self._redactor(span[key])
        span.setdefault("release", self.release or os.environ.get("TRACIFY_RELEASE"))
        span.setdefault("environment", self.environment or os.environ.get("TRACIFY_ENVIRONMENT"))
        span.setdefault("deploymentId", self.deployment_id)
        span.setdefault("sessionId", self.session_id)
        span.setdefault("endUserId", self.end_user_id)
        span.setdefault("tags", self.tags)
        # Optional unset fields must be omitted: ingestion rejects JSON null for strings.
        span = {key: value for key, value in span.items() if value is not None}
        if self._sampled_out(span):
            return
        self._send_span(span)

    def get_prompt(self, name: str, environment: str = "production", cache_ttl_seconds: float = 60, fallback: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Resolve a deployed prompt, using a short-lived cache and stale/fallback recovery."""
        key = f"{name}:{environment}"
        now = time.time()
        cached = self._prompt_cache.get(key)
        if cached and cached["expires_at"] > now:
            return cached["value"]
        try:
            response = (self._http.get if self._http else _requests_fallback.get)(f"{self.host}/api/prompts/{name}", headers={"Authorization": f"Bearer {self.api_key}"}, params={"environment": environment}, timeout=10)
            if response.status_code >= 400:
                raise RuntimeError(f"Prompt resolution failed ({response.status_code}): {response.text[:300]}")
            value = response.json()
            self._prompt_cache[key] = {"value": value, "expires_at": now + cache_ttl_seconds}
            return value
        except Exception:
            if cached:
                return cached["value"]
            if fallback is not None:
                return fallback
            raise

    def _send_feedback(self, payload: Dict[str, Any]):
        if not self.project_id:
            print("Tracify Warning: project_id is required for feedback and score helpers")
            return
        try:
            headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
            if self._http:
                self._http.post(f"{self.host}/api/feedback", headers=headers, json={"projectId": self.project_id, **payload}, timeout=5)
            else:
                _requests_fallback.post(f"{self.host}/api/feedback", headers=headers, json={"projectId": self.project_id, **payload}, timeout=5)
        except Exception as e:
            print(f"Tracify Warning: Failed to record evaluation signal: {e}")

    def feedback(self, trace_id: str, value: Union[bool, float, int, str], kind: Optional[str] = None, span_id: Optional[str] = None, reason: Optional[str] = None, comment: Optional[str] = None, end_user_id: Optional[str] = None, dedupe_key: Optional[str] = None):
        inferred_kind = kind or ("star" if isinstance(value, (int, float)) and not isinstance(value, bool) else "thumb" if isinstance(value, bool) else "text")
        self._send_feedback({"traceId": trace_id, "spanId": span_id, "kind": inferred_kind, "value": value, "reason": reason, "comment": comment, "endUserId": end_user_id, "dedupeKey": dedupe_key})

    def score(self, trace_id: str, name: str, value: Union[bool, float, int, str], data_type: Optional[str] = None, span_id: Optional[str] = None, comment: Optional[str] = None):
        self._send_feedback({"traceId": trace_id, "spanId": span_id, "kind": "text", "name": name, "value": value, "dataType": data_type, "comment": comment})

    def _check_cost(self, run_id: str, increment_usd: float) -> Dict[str, Any]:
        """Server-side cost check. Returns the server's decision."""
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            if self._http:
                resp = self._http.post(
                    self.check_cost_url,
                    headers=headers,
                    json={"runId": run_id, "incrementUsd": increment_usd},
                )
            else:
                resp = _requests_fallback.post(
                    self.check_cost_url,
                    headers=headers,
                    json={"runId": run_id, "incrementUsd": increment_usd},
                    timeout=5,
                )
            if resp.status_code != 200:
                self._last_fail_open = True
                return {"allowed": True, "reason": "check_failed"}
            self._last_fail_open = False
            return resp.json()
        except Exception:
            self._last_fail_open = True
            return {"allowed": True, "reason": "network_error"}

    def orchestrate(
        self,
        policy: RuntimePolicy,
        call: Callable[[str, CancellationToken], Any],
        model: str,
        input_data: Any = None,
        calculate_cost: Optional[Callable[[Any, str], float]] = None,
        run_id: Optional[str] = None,
    ) -> Any:
        run_id = run_id or _current_run.get() or os.environ.get("TRACIFY_CURRENT_RUN_ID") or str(uuid.uuid4())
        all_models = [model] + [m for m in policy.fallback_chain if m != model]
        last_error: Optional[Exception] = None

        for model_index, current_model in enumerate(all_models):
            is_fallback = model_index > 0
            fallback_reason = None
            if is_fallback:
                if last_error and _is_latency_abort(last_error):
                    fallback_reason = "latency_budget"
                elif last_error:
                    fallback_reason = "provider_error"
                else:
                    fallback_reason = "cost_ceiling"

            max_attempts = 1 if is_fallback else (policy.max_attempts + 1)

            for attempt in range(1, max_attempts + 1):
                span_id = str(uuid.uuid4())
                start_time = time.time()

                # Server-side cost ceiling enforcement
                if policy.enforcement_mode == "enforce":
                    estimated_cost = 0.01 if calculate_cost else 0

                    if policy.max_cost_per_run is not None:
                        check = self._check_cost(run_id, estimated_cost)
                        if not check.get("allowed") and check.get("reason") == "maxCostPerRun":
                            self.ingest(
                                spanId=span_id,
                                runId=run_id,
                                spanType="llm_call",
                                input=json.dumps(input_data) if input_data is not None else "",
                                output=json.dumps({"blocked": True, "reason": "cost_ceiling"}),
                                modelId=current_model,
                                costUsd=0,
                                latencyMs=0,
                                metadata={
                                    "orchestrationBlocked": True,
                                    "orchestrationReason": "cost_ceiling",
                                    "orchestrationAttempt": attempt,
                                    "orchestrationModel": current_model,
                                    "orchestrationOriginalModel": model,
                                    "orchestrationServerCost": check.get("currentCost"),
                                    "orchestrationCeiling": check.get("ceiling"),
                                    "orchestrationFailOpen": self._last_fail_open,
                                    "orchestrationPolicy": json.dumps(policy.to_dict()),
                                },
                            )
                            if model_index < len(all_models) - 1:
                                last_error = Exception(f"Cost ceiling reached: ${check.get('currentCost', 0):.4f} >= ${check.get('ceiling')}")
                                break
                            raise Exception(f"Cost ceiling reached: ${check.get('currentCost', 0):.4f} >= ${check.get('ceiling')}")

                    if policy.max_cost_per_day is not None:
                        check = self._check_cost(run_id, estimated_cost)
                        if not check.get("allowed") and check.get("reason") == "maxCostPerDay":
                            self.ingest(
                                spanId=span_id,
                                runId=run_id,
                                spanType="llm_call",
                                input=json.dumps(input_data) if input_data is not None else "",
                                output=json.dumps({"blocked": True, "reason": "daily_cost_ceiling"}),
                                modelId=current_model,
                                costUsd=0,
                                latencyMs=0,
                                metadata={
                                    "orchestrationBlocked": True,
                                    "orchestrationReason": "daily_cost_ceiling",
                                    "orchestrationAttempt": attempt,
                                    "orchestrationModel": current_model,
                                    "orchestrationOriginalModel": model,
                                    "orchestrationServerCost": check.get("currentCost"),
                                    "orchestrationCeiling": check.get("ceiling"),
                                    "orchestrationFailOpen": self._last_fail_open,
                                    "orchestrationPolicy": json.dumps(policy.to_dict()),
                                },
                            )
                            if model_index < len(all_models) - 1:
                                last_error = Exception(f"Daily cost ceiling reached: ${check.get('currentCost', 0):.4f} >= ${check.get('ceiling')}")
                                break
                            raise Exception(f"Daily cost ceiling reached: ${check.get('currentCost', 0):.4f} >= ${check.get('ceiling')}")

                # Latency budget enforcement via cooperative cancellation
                try:
                    timeout = policy.latency_budget_ms if policy.enforcement_mode == "enforce" else None
                    result = _run_with_timeout(
                        lambda token, m=current_model: call(m, token),
                        timeout,
                    )
                    latency_ms = int((time.time() - start_time) * 1000)
                    cost_usd = calculate_cost(result, current_model) if calculate_cost else 0

                    # Report actual cost to server
                    if policy.enforcement_mode == "enforce" and cost_usd > 0:
                        self._check_cost(run_id, cost_usd)

                    self.ingest(
                        spanId=span_id,
                        runId=run_id,
                        spanType="llm_call",
                        input=json.dumps(input_data) if input_data is not None else "",
                        output=json.dumps(result) if not isinstance(result, str) else result,
                        modelId=current_model,
                        costUsd=cost_usd,
                        latencyMs=latency_ms,
                        metadata={
                            "orchestrationAttempt": attempt,
                            "orchestrationModel": current_model,
                            "orchestrationOriginalModel": model,
                            "orchestrationIsFallback": is_fallback,
                            "orchestrationFallbackReason": fallback_reason,
                            "orchestrationFinal": True,
                            "orchestrationFailOpen": self._last_fail_open,
                            "orchestrationPolicy": json.dumps(policy.to_dict()),
                        },
                    )
                    return result

                except Exception as error:
                    latency_ms = int((time.time() - start_time) * 1000)
                    last_error = error

                    retryable = _is_retryable_error(error, policy.retryable_errors)
                    is_last_attempt = attempt == max_attempts
                    was_latency_abort = _is_latency_abort(error)

                    self.ingest(
                        spanId=span_id,
                        runId=run_id,
                        spanType="llm_call" if (retryable and not is_last_attempt) else "error",
                        input=json.dumps(input_data) if input_data is not None else "",
                        output=str(error),
                        modelId=current_model,
                        costUsd=0,
                        latencyMs=latency_ms,
                        metadata={
                            "orchestrationAttempt": attempt,
                            "orchestrationModel": current_model,
                            "orchestrationOriginalModel": model,
                            "orchestrationIsFallback": is_fallback,
                            "orchestrationFallbackReason": fallback_reason,
                            "orchestrationError": True,
                            "orchestrationLatencyAbort": was_latency_abort,
                            "orchestrationRetryable": retryable,
                            "orchestrationWillRetry": retryable and not is_last_attempt,
                            "orchestrationFailOpen": self._last_fail_open,
                            "orchestrationPolicy": json.dumps(policy.to_dict()),
                        },
                    )

                    if retryable and not is_last_attempt:
                        delay = policy.backoff_ms * (policy.backoff_multiplier ** (attempt - 1))
                        time.sleep(delay / 1000)
                        continue

                    break

        raise last_error or Exception("All fallback models exhausted")


_default_client: Optional[TracifyClient] = None


def _client(client: Optional[TracifyClient]) -> TracifyClient:
    global _default_client
    if client is not None:
        return client
    if _current_client.get() is not None:
        return _current_client.get()
    if _default_client is None:
        _default_client = TracifyClient()
    return _default_client


class Span:
    """A step in progress. Set its output and any measured fields before it ends."""

    def __init__(self, name: str, span_type: str, input_data: Any = None, metadata: Optional[Dict[str, Any]] = None):
        self.id = str(uuid.uuid4())
        self.name = name
        self.span_type = span_type
        self.input = input_data
        self.output: Any = None
        self.metadata: Dict[str, Any] = dict(metadata or {})
        self.fields: Dict[str, Any] = {}

    def set_output(self, output: Any) -> "Span":
        self.output = output
        return self

    def set(self, model: Optional[str] = None, input_tokens: Optional[int] = None, output_tokens: Optional[int] = None,
            cost_usd: Optional[float] = None, **metadata: Any) -> "Span":
        """Record what the step measured (model, tokens, cost); anything else goes into metadata."""
        if model is not None: self.fields["modelId"] = model
        if input_tokens is not None: self.fields["inputTokens"] = int(input_tokens)
        if output_tokens is not None: self.fields["outputTokens"] = int(output_tokens)
        if cost_usd is not None: self.fields["costUsd"] = float(cost_usd)
        self.metadata.update(metadata)
        return self


@contextlib.contextmanager
def span(name: str, type: str = "span", input: Any = None, metadata: Optional[Dict[str, Any]] = None,
         client: Optional[TracifyClient] = None, run_id: Optional[str] = None, root: bool = False, **fields: Any):
    """
    Record one step of the agent. Steps opened inside it become its children, so the trace shows which step
    called which. `type` is what the step is: "agent", "llm", "tool", "retrieval" or "span".

        with tracify.span("search-docs", type="tool", input=query) as step:
            step.set_output(search(query))
    """
    current = Span(name, type, input, metadata)
    if fields: current.set(**fields)
    if not run_id and current_run_id() == "unknown":
        run_id = str(uuid.uuid4())
    run_token = _current_run.set(run_id) if run_id else None
    client_token = _current_client.set(_client(client))
    trace_token = _current_trace.set(name if root else _current_trace.get())
    span_token = _current_span.set(current.id)
    started = time.time()
    error: Optional[BaseException] = None
    try:
        yield current
    except BaseException as exc:
        error = exc
        raise
    finally:
        _current_span.reset(span_token)
        payload: Dict[str, Any] = {
            "spanId": current.id, "spanType": current.span_type, "toolName": current.name,
            "input": current.input, "output": current.output if error is None else str(error),
            "latencyMs": int((time.time() - started) * 1000), "costUsd": 0,
            "createdAt": datetime.fromtimestamp(started, timezone.utc).isoformat().replace("+00:00", "Z"), "metadata": current.metadata,
            **current.fields,
        }
        if root:
            # The root closes the run: run_end or error is what marks a run completed or failed.
            payload["spanType"] = "error" if error is not None else "run_end"
            payload["metadata"] = {**current.metadata, "stepType": current.span_type}
        if error is not None and not isinstance(error, (GeneratorExit, KeyboardInterrupt)):
            payload["errorType"] = error.__class__.__name__
            payload["errorMessage"] = _payload(str(error))
        try:
            _client(client).ingest(**payload)
        finally:
            if run_token is not None:
                _current_run.reset(run_token)
            _current_client.reset(client_token)
            _current_trace.reset(trace_token)


def observe(name: Optional[str] = None, type: str = "span", capture_input: bool = True, capture_output: bool = True,
            client: Optional[TracifyClient] = None):
    """
    Decorator form of `span`: records each call of the function as a step, with its arguments and result.

        @tracify.observe(type="tool")
        def search_docs(query): ...
    """
    def decorator(func: Callable):
        step_name = name or func.__name__

        def describe(args, kwargs):
            if not capture_input: return None
            return {"args": list(args), "kwargs": kwargs} if kwargs else list(args)

        if asyncio.iscoroutinefunction(func):
            @functools.wraps(func)
            async def async_wrapper(*args, **kwargs):
                with span(step_name, type=type, input=describe(args, kwargs), client=client) as step:
                    result = await func(*args, **kwargs)
                    if capture_output: step.set_output(result)
                    return result
            return async_wrapper

        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            with span(step_name, type=type, input=describe(args, kwargs), client=client) as step:
                result = func(*args, **kwargs)
                if capture_output: step.set_output(result)
                return result
        return sync_wrapper
    return decorator


def trace_agent(client: Optional[TracifyClient] = None, environment: Optional[str] = None, release: Optional[str] = None, deployment_id: Optional[str] = None, session_id: Optional[str] = None, end_user_id: Optional[str] = None, tags: Optional[List[str]] = None, name: Optional[str] = None):
    """
    Decorator to wrap an agent's main entry point. Each call is one trace: a new run id, and a root step that
    every step recorded inside it hangs from. The root is sent as run_end (or error) when the call returns.
    """
    def decorator(func: Callable):
        step_name = name or func.__name__

        def make_client():
            nonlocal client
            if client is None:
                client = TracifyClient(environment=environment, release=release, deployment_id=deployment_id, session_id=session_id, end_user_id=end_user_id, tags=tags)
            return client

        if asyncio.iscoroutinefunction(func):
            @functools.wraps(func)
            async def async_wrapper(*args, **kwargs):
                with span(step_name, type="agent", client=make_client(), run_id=str(uuid.uuid4()), root=True) as step:
                    result = await func(*args, **kwargs)
                    step.set_output(result)
                    return result
            return async_wrapper

        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            with span(step_name, type="agent", client=make_client(), run_id=str(uuid.uuid4()), root=True) as step:
                result = func(*args, **kwargs)
                step.set_output(result)
                return result
        return sync_wrapper
    return decorator


def llm_call(input_data: Any, output_data: Any, model_id: str, cost_usd: float, latency_ms: int, client: Optional[TracifyClient] = None, session_id: Optional[str] = None, end_user_id: Optional[str] = None, environment: Optional[str] = None, release: Optional[str] = None, tags: Optional[List[str]] = None, trace_name: Optional[str] = None, input_tokens: Optional[int] = None, output_tokens: Optional[int] = None, name: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None):
    """Record a finished model call. It is attached to the step it was made in."""
    extra: Dict[str, Any] = {}
    if input_tokens is not None: extra["inputTokens"] = int(input_tokens)
    if output_tokens is not None: extra["outputTokens"] = int(output_tokens)
    if name: extra["toolName"] = name
    _client(client).ingest(
        spanType="llm_call",
        input=input_data,
        output=output_data,
        modelId=model_id,
        costUsd=cost_usd,
        latencyMs=latency_ms,
        sessionId=session_id or "",
        endUserId=end_user_id or "",
        environment=environment or "",
        release=release or "",
        tags=tags or [],
        traceName=trace_name or "",
        metadata=metadata or {},
        **extra,
    )


def tool_call(tool_name: str, input_data: Any, output_data: Any, latency_ms: int, client: Optional[TracifyClient] = None, session_id: Optional[str] = None, end_user_id: Optional[str] = None, environment: Optional[str] = None, release: Optional[str] = None, tags: Optional[List[str]] = None, trace_name: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None):
    """Record a finished tool call. It is attached to the step it was made in."""
    _client(client).ingest(
        spanType="tool_call",
        toolName=tool_name,
        input=input_data,
        output=output_data,
        latencyMs=latency_ms,
        costUsd=0,
        sessionId=session_id or "",
        endUserId=end_user_id or "",
        environment=environment or "",
        release=release or "",
        tags=tags or [],
        traceName=trace_name or "",
        metadata=metadata or {},
    )

from .integrations import wrap_openai, wrap_anthropic
from .tools import trace_tools

def langgraph_callback(**options):
    """Create a LangGraph callback; install tracify-sdk[langgraph] first."""
    from .langgraph import TracifyCallbackHandler
    return TracifyCallbackHandler(**options)
