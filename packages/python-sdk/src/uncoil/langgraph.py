"""Optional LangGraph/LangChain callback integration."""
import threading
try:
    from langchain_core.callbacks import BaseCallbackHandler
except ImportError as error:
    raise ImportError("Install uncoil-sdk[langgraph] to use LangGraph tracing") from error
from .integrations import Observation, _dict
from . import current_run_id, current_span_id


class UncoilCallbackHandler(BaseCallbackHandler):
    run_inline = True
    enabled = True
    raise_error = False
    def __init__(self, **options):
        self.options = options
        self.runs = {}
        self.lock = threading.RLock()
    def _start(self, kind, name, inputs, run_id, parent_run_id=None, model=""):
        with self.lock:
            if not self.enabled or run_id in self.runs: return
            parent = self.runs.get(parent_run_id)
            outer = not parent and current_run_id() != "unknown"
            self.runs[run_id] = Observation("langgraph", model, inputs, self.options, dict(run_id=parent.data["runId"] if parent else current_run_id() if outer else str(run_id), span_id=str(run_id), parent_span_id=parent.data["spanId"] if parent else current_span_id() if outer else None, root=parent is None and not outer, type=kind, name=name))
    def _end(self, run_id, output=None, error=None, interrupted=False):
        with self.lock:
            run = self.runs.pop(run_id, None)
            if not run: return
            # An interrupt pauses the whole run, so the steps still open around it are marked too.
            for step in [run, *self.runs.values()] if interrupted else []:
                if step.data["runId"] == run.data["runId"]: step.data["metadata"]["interrupted"] = True
        run.finish(output, error)
    def on_chain_start(self, serialized, inputs, *, run_id, parent_run_id=None, **kwargs):
        self._start("agent", kwargs.get("name") or (serialized or {}).get("name") or "graph", inputs, run_id, parent_run_id)
    def on_chain_end(self, outputs, *, run_id, **kwargs): self._end(run_id, outputs)
    def on_chain_error(self, error, *, run_id, **kwargs):
        # A human-in-the-loop pause raises GraphInterrupt; it ends the step normally instead of failing the run.
        if any(cls.__name__ == "GraphInterrupt" for cls in type(error).__mro__): self._end(run_id, interrupted=True)
        else: self._end(run_id, error=error)
    def on_tool_start(self, serialized, input_str, *, run_id, parent_run_id=None, **kwargs): self._start("tool_call", kwargs.get("name") or (serialized or {}).get("name") or "tool", input_str, run_id, parent_run_id)
    def on_tool_end(self, output, *, run_id, **kwargs): self._end(run_id, output)
    def on_tool_error(self, error, *, run_id, **kwargs): self._end(run_id, error=error)
    def on_retriever_start(self, serialized, query, *, run_id, parent_run_id=None, **kwargs): self._start("retrieval", kwargs.get("name") or (serialized or {}).get("name") or "retriever", query, run_id, parent_run_id)
    def on_retriever_end(self, documents, *, run_id, **kwargs): self._end(run_id, [getattr(doc, "page_content", doc) for doc in documents or []])
    def on_retriever_error(self, error, *, run_id, **kwargs): self._end(run_id, error=error)
    def on_llm_start(self, serialized, prompts, *, run_id, parent_run_id=None, **kwargs):
        model = (kwargs.get("invocation_params") or {}).get("model") or (serialized or {}).get("name") or "model"
        self._start("llm_call", model, prompts, run_id, parent_run_id, model)
    def on_chat_model_start(self, serialized, messages, *, run_id, parent_run_id=None, **kwargs): self.on_llm_start(serialized, messages, run_id=run_id, parent_run_id=parent_run_id, **kwargs)
    def on_llm_new_token(self, token, *, run_id, **kwargs):
        with self.lock: run = self.runs.get(run_id)
        if run: run.data.setdefault("ttftMs", int((__import__("time").time() - run.started) * 1000))
    def on_llm_end(self, response, *, run_id, **kwargs):
        with self.lock: run = self.runs.get(run_id)
        if run:
            raw = _dict(response)
            generations = raw.get("generations") or [[]]
            message = generations[0][0].get("message", {}) if generations and generations[0] else {}
            usage = (raw.get("llm_output") or {}).get("token_usage") or message.get("usage_metadata")
            if usage: run.usage(usage)
        self._end(run_id, _dict(response))
    def on_llm_error(self, error, *, run_id, **kwargs): self._end(run_id, error=error)
