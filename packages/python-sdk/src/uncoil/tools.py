import functools
import inspect
import time
from typing import Any, Callable, Dict, Optional


def _wrap(name: str, fn: Callable, client: Any = None) -> Callable:
    from . import _client  # imported late: this module is loaded from the package itself

    def record(args, kwargs, output, started, error=None):
        data = {
            "spanType": "tool_call",
            "toolName": name,
            "input": {"args": list(args), "kwargs": kwargs} if kwargs or len(args) != 1 else args[0],
            "output": output,
            "latencyMs": int((time.time() - started) * 1000),
        }
        if error is not None:
            data["errorType"] = type(error).__name__
            data["errorMessage"] = str(error)
        try:
            _client(client).ingest(**data)
        except Exception:
            pass  # telemetry must never change how the tool behaves

    if inspect.iscoroutinefunction(fn):
        @functools.wraps(fn)
        async def async_wrapper(*args, **kwargs):
            started = time.time()
            try:
                result = await fn(*args, **kwargs)
            except Exception as error:
                record(args, kwargs, None, started, error)
                raise
            record(args, kwargs, result, started)
            return result
        return async_wrapper

    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        started = time.time()
        try:
            result = fn(*args, **kwargs)
        except Exception as error:
            record(args, kwargs, None, started, error)
            raise
        record(args, kwargs, result, started)
        return result
    return wrapper


def trace_tools(tools: Dict[str, Callable], client: Optional[Any] = None) -> Dict[str, Callable]:
    """Trace a set of tools in one line.

        tools = trace_tools({"search_docs": search_docs, "send_email": send_email})

    The returned dict has the same keys and the functions behave the same; each call is recorded as a tool step.
    Works with plain and async functions.
    """
    return {name: _wrap(name, fn, client) if callable(fn) else fn for name, fn in tools.items()}
