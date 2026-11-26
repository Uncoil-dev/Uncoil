import importlib
import sys
import types
import uuid

import pytest

import uncoil
from test_steps import Recorder


@pytest.fixture(autouse=True)
def off():
    yield
    uncoil.uninit()


@pytest.fixture
def module(monkeypatch):
    """Import uncoil.langgraph against a minimal stand-in for langchain_core."""
    core, callbacks = types.ModuleType("langchain_core"), types.ModuleType("langchain_core.callbacks")
    callbacks.BaseCallbackHandler = type("BaseCallbackHandler", (), {})
    core.callbacks = callbacks
    monkeypatch.setitem(sys.modules, "langchain_core", core)
    monkeypatch.setitem(sys.modules, "langchain_core.callbacks", callbacks)
    monkeypatch.delitem(sys.modules, "uncoil.langgraph", raising=False)
    loaded = importlib.import_module("uncoil.langgraph")
    yield loaded
    sys.modules.pop("uncoil.langgraph", None)


def spans(recorder, kind):
    return [s for s in recorder.sent if s["spanType"] == kind]


def test_missing_optional_dependency_raises_helpful_error(monkeypatch):
    monkeypatch.setitem(sys.modules, "langchain_core", None)
    monkeypatch.setitem(sys.modules, "langchain_core.callbacks", None)
    monkeypatch.delitem(sys.modules, "uncoil.langgraph", raising=False)
    with pytest.raises(ImportError, match=r"uncoil-sdk\[langgraph\]"):
        importlib.import_module("uncoil.langgraph")


def test_chain_with_nested_tool_and_llm_links_parents(module):
    recorder = Recorder()
    handler = module.UncoilCallbackHandler(client=recorder)
    graph, tool, llm = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    handler.on_chain_start({"name": "ignored"}, {"q": "hi"}, run_id=graph, name="my-graph")
    handler.on_tool_start({"name": "search"}, "query", run_id=tool, parent_run_id=graph)
    handler.on_tool_end("result", run_id=tool)
    handler.on_llm_start({}, ["prompt"], run_id=llm, parent_run_id=graph, invocation_params={"model": "m-1"})
    handler.on_llm_new_token("x", run_id=llm)
    handler.on_llm_end(
        {"generations": [[{"message": {"usage_metadata": {"input_tokens": 7, "output_tokens": 2}}}]]}, run_id=llm
    )
    handler.on_chain_end({"a": 1}, run_id=graph)

    tool_span, = spans(recorder, "tool_call")
    llm_span, = spans(recorder, "llm_call")
    root, = spans(recorder, "run_end")
    assert tool_span["toolName"] == "search" and tool_span["output"] == "result"
    assert (llm_span["modelId"], llm_span["inputTokens"], llm_span["outputTokens"]) == ("m-1", 7, 2)
    assert "ttftMs" in llm_span
    assert root["toolName"] == "my-graph" and root["output"] == "{\"a\": 1}"
    assert tool_span["parentSpanId"] == llm_span["parentSpanId"] == root["spanId"] == str(graph)
    assert {s["runId"] for s in recorder.sent} == {str(graph)}
    assert handler.runs == {}


def test_error_callbacks_record_error_and_clear_state(module):
    recorder = Recorder()
    handler = module.UncoilCallbackHandler(client=recorder)
    run = uuid.uuid4()
    handler.on_tool_start({}, "in", run_id=run)
    assert run in handler.runs
    handler.on_tool_error(ValueError("boom"), run_id=run)
    span, = recorder.sent
    assert span["errorType"] == "ValueError" and span["errorMessage"] == "boom"
    assert span["toolName"] == "tool" and handler.runs == {}


def test_duplicate_start_and_unknown_end_are_ignored(module):
    recorder = Recorder()
    handler = module.UncoilCallbackHandler(client=recorder)
    run = uuid.uuid4()
    handler.on_chain_start({}, {}, run_id=run)
    handler.on_chain_start({}, {}, run_id=run)
    assert len(handler.runs) == 1
    handler.on_chain_end({}, run_id=uuid.uuid4())
    assert recorder.sent == []


def test_disabled_handler_records_nothing(module):
    recorder = Recorder()
    handler = module.UncoilCallbackHandler(client=recorder)
    handler.enabled = False
    handler.on_chain_start({}, {}, run_id=uuid.uuid4())
    assert handler.runs == {} and recorder.sent == []


def test_capture_input_option_redacts_input(module):
    recorder = Recorder()
    handler = module.UncoilCallbackHandler(client=recorder, capture_input=False)
    run = uuid.uuid4()
    handler.on_tool_start({}, "secret", run_id=run)
    handler.on_tool_end("ok", run_id=run)
    assert recorder.sent[0]["input"] == "[not captured]"


def test_real_graph_interrupt_ends_the_run_as_paused_not_failed():
    from typing import TypedDict

    from langgraph.checkpoint.memory import InMemorySaver
    from langgraph.graph import END, START, StateGraph
    from langgraph.types import interrupt

    sys.modules.pop("uncoil.langgraph", None)
    from uncoil.langgraph import UncoilCallbackHandler

    class State(TypedDict):
        answer: str

    graph = StateGraph(State)
    graph.add_node("ask", lambda state: {"answer": interrupt("approve?")})
    graph.add_edge(START, "ask")
    graph.add_edge("ask", END)
    recorder = Recorder()
    config = {"callbacks": [UncoilCallbackHandler(client=recorder)], "configurable": {"thread_id": "t1"}}
    graph.compile(checkpointer=InMemorySaver()).invoke({"answer": ""}, config=config)

    assert spans(recorder, "error") == [] and all("errorType" not in s for s in recorder.sent)
    root, = spans(recorder, "run_end")
    node, = spans(recorder, "agent")
    assert root["metadata"]["interrupted"] is True and node["metadata"]["interrupted"] is True
