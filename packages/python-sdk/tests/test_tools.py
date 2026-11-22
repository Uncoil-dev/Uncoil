import asyncio
import json

import pytest
from test_steps import Recorder
from uncoil import trace_tools


def tool_spans(recorder):
    return [s for s in recorder.sent if s.get("spanType") == "tool_call"]


def test_returns_same_keys_and_result():
    recorder = Recorder()
    tools = trace_tools({"add": lambda a, b: a + b, "neg": lambda x: -x}, client=recorder)
    assert set(tools) == {"add", "neg"}
    assert tools["add"](2, 3) == 5
    assert tools["neg"](4) == -4


def test_non_callable_values_pass_through():
    recorder = Recorder()
    tools = trace_tools({"version": "1.0", "run": lambda: 1}, client=recorder)
    assert tools["version"] == "1.0"
    assert tools["run"]() == 1


def test_records_tool_span_with_name_and_output():
    recorder = Recorder()
    tools = trace_tools({"echo": lambda text: text.upper()}, client=recorder)
    tools["echo"]("hi")
    spans = tool_spans(recorder)
    assert len(spans) == 1
    assert spans[0]["toolName"] == "echo"
    assert spans[0]["output"] == "HI"
    assert spans[0]["input"] == "hi"
    assert spans[0]["latencyMs"] >= 0


def test_multiple_args_and_kwargs_are_recorded_together():
    recorder = Recorder()
    tools = trace_tools({"join": lambda a, b, sep="-": f"{a}{sep}{b}"}, client=recorder)
    assert tools["join"]("x", "y", sep="+") == "x+y"
    recorded = tool_spans(recorder)[0]["input"]
    assert json.loads(recorded) == {"args": ["x", "y"], "kwargs": {"sep": "+"}}


def test_exception_is_recorded_and_reraised():
    recorder = Recorder()

    def boom(value):
        raise ValueError("bad " + value)

    tools = trace_tools({"boom": boom}, client=recorder)
    with pytest.raises(ValueError, match="bad x"):
        tools["boom"]("x")
    span = tool_spans(recorder)[0]
    assert span["errorType"] == "ValueError"
    assert span["errorMessage"] == "bad x"


def test_telemetry_failure_does_not_change_tool_behavior():
    class Broken(Recorder):
        def _send_span(self, span):
            raise RuntimeError("ingest down")

    tools = trace_tools({"inc": lambda n: n + 1}, client=Broken())
    assert tools["inc"](1) == 2


def test_wrapper_preserves_function_metadata():
    def documented(x):
        """Does a thing."""
        return x

    wrapped = trace_tools({"documented": documented}, client=Recorder())["documented"]
    assert wrapped.__name__ == "documented"
    assert wrapped.__doc__ == "Does a thing."


def test_async_tool_is_awaited_and_recorded():
    recorder = Recorder()

    async def fetch(url):
        return "body:" + url

    tools = trace_tools({"fetch": fetch}, client=recorder)
    assert asyncio.run(tools["fetch"]("u")) == "body:u"
    span = tool_spans(recorder)[0]
    assert span["toolName"] == "fetch" and span["output"] == "body:u"


def test_async_tool_exception_is_recorded_and_reraised():
    recorder = Recorder()

    async def fail():
        raise KeyError("missing")

    tools = trace_tools({"fail": fail}, client=recorder)
    with pytest.raises(KeyError):
        asyncio.run(tools["fail"]())
    assert tool_spans(recorder)[0]["errorType"] == "KeyError"
