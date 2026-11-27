import json
import httpx2 as httpx
import pytest
from openai import OpenAI
import uncoil
from uncoil import UncoilClient, trace_tools
from test_integrations import CHAT, chat_events, streaming_transport, transport

KEY = "uncoil_sk_live_eu_abcdefghijklmnop"
SECRET = "zebra-secret-text"


@pytest.fixture
def requests_sent(monkeypatch):
    """Every request body that leaves the SDK; only the network call is replaced."""
    sent = []
    monkeypatch.setattr("uncoil._requests_fallback.post", lambda url, **kw: sent.append((url, kw["json"])))
    monkeypatch.delenv("UNCOIL_CAPTURE_CONTENT", raising=False)
    return sent


def make(**options):
    client = UncoilClient(api_key=KEY, project_id="proj_1", **options)
    client._http = None
    return client


def spans(sent, client):
    assert client.flush(30)
    return [body for url, body in sent if url.endswith("/api/ingest")]


def test_off_sends_no_content_for_any_step_kind(requests_sent, monkeypatch):
    monkeypatch.setenv("UNCOIL_CAPTURE_CONTENT", "Off")
    client = make()

    @uncoil.trace_agent(client=client, name="agent")
    def agent():
        with uncoil.span("lookup", type="tool", input=SECRET, client=client) as step:
            step.set_output(SECRET)
        uncoil.llm_call(SECRET, SECRET, "model-a", 0.02, 40, client=client, input_tokens=11, output_tokens=7, name="chat")
        uncoil.tool_call("search", SECRET, SECRET, 5, client=client)
        with pytest.raises(ValueError):
            with uncoil.span("broken", client=client):
                raise ValueError(SECRET)
        wrapped = trace_tools({"fail": lambda x: (_ for _ in ()).throw(KeyError(SECRET))}, client=client)
        with pytest.raises(KeyError):
            wrapped["fail"](SECRET)
        raise RuntimeError(SECRET)

    with pytest.raises(RuntimeError):
        agent()
    sent = spans(requests_sent, client)
    assert len(sent) >= 6
    assert SECRET not in json.dumps(sent)
    by_name = {s["toolName"]: s for s in sent if s.get("toolName")}
    assert all(s["metadata"]["contentRecorded"] is False for s in sent)
    assert all(s["input"] == "" and s["output"] == "" and "errorMessage" not in s for s in sent)
    chat = by_name["chat"]
    assert (chat["modelId"], chat["costUsd"], chat["latencyMs"], chat["inputTokens"], chat["outputTokens"]) == ("model-a", 0.02, 40, 11, 7)
    assert by_name["broken"]["errorType"] == "ValueError"
    assert by_name["fail"]["errorType"] == "KeyError"
    assert by_name["agent"]["spanType"] == "error" and by_name["agent"]["errorType"] == "RuntimeError"


@pytest.mark.parametrize("stream", [False, True])
def test_off_provider_calls_send_no_content(requests_sent, monkeypatch, stream):
    monkeypatch.setenv("UNCOIL_CAPTURE_CONTENT", "0")
    client = make()
    body = streaming_transport(chat_events()) if stream else transport(CHAT)
    raw = OpenAI(api_key="test", http_client=httpx.Client(transport=body))
    wrapped = uncoil.wrap_openai(raw, client=client)
    result = wrapped.chat.completions.create(model="test-model", messages=[dict(role="user", content=SECRET)], stream=stream)
    list(result) if stream else None
    failing = OpenAI(api_key="test", max_retries=0, http_client=httpx.Client(transport=transport(dict(error=dict(message=SECRET, type="invalid_request_error")), 400)))
    with pytest.raises(Exception):
        uncoil.wrap_openai(failing, client=client).chat.completions.create(model="test-model", messages=[dict(role="user", content=SECRET)])
    sent = spans(requests_sent, client)
    assert SECRET not in json.dumps(sent) and "hello" not in json.dumps(sent)
    llm = [s for s in sent if s["spanType"] == "llm_call" and "errorType" not in s][0]
    assert llm["inputTokens"] == 8 and llm["outputTokens"] == 3
    assert [s for s in sent if s.get("errorType") == "BadRequestError"]
    raw.close()
    failing.close()


def test_off_feedback_and_scores_send_no_text(requests_sent):
    client = make(capture_content=False)
    client.feedback("t1", SECRET, comment=SECRET, reason=SECRET)
    client.score("t1", "accuracy", 0.9, comment=SECRET)
    bodies = [body for url, body in requests_sent if url.endswith("/api/feedback")]
    assert len(bodies) == 2 and SECRET not in json.dumps(bodies)
    assert bodies[1]["name"] == "accuracy" and bodies[1]["value"] == 0.9


@pytest.mark.parametrize("value", [None, "", "true", "1", "yes", "on", "maybe"])
def test_other_values_keep_capturing(requests_sent, monkeypatch, value):
    if value is not None:
        monkeypatch.setenv("UNCOIL_CAPTURE_CONTENT", value)
    client = make()
    uncoil.llm_call(SECRET, "answer", "m", 0, 1, client=client)
    sent = spans(requests_sent, client)
    assert SECRET in sent[0]["input"] and "contentRecorded" not in sent[0]["metadata"]


def test_option_overrides_env_and_env_is_read_at_creation(requests_sent, monkeypatch):
    monkeypatch.setenv("UNCOIL_CAPTURE_CONTENT", "false")
    kept = make(capture_content=True)
    monkeypatch.setenv("UNCOIL_CAPTURE_CONTENT", "true")
    uncoil.llm_call(SECRET, "a", "m", 0, 1, client=kept)
    monkeypatch.setenv("UNCOIL_CAPTURE_CONTENT", "no")
    later = make()
    monkeypatch.setenv("UNCOIL_CAPTURE_CONTENT", "true")
    uncoil.llm_call(SECRET, "a", "m", 0, 1, client=later)
    assert later.flush(30)
    kept_span, later_span = spans(requests_sent, kept)
    assert SECRET in kept_span["input"] and later_span["input"] == ""


def feedback_bodies(sent):
    return [body for url, body in sent if url.endswith("/api/feedback")]


def test_off_text_score_and_string_thumb_values_are_not_sent(requests_sent):
    client = make(capture_content=False)
    client.score("t1", "tone", SECRET)
    client.feedback("t1", SECRET, kind="thumb")
    client.score("t1", "label", "good", data_type="categorical")
    bodies = feedback_bodies(requests_sent)
    assert len(bodies) == 3 and SECRET not in json.dumps(bodies)
    assert bodies[0]["value"] == "[not recorded]" and bodies[1]["value"] == "[not recorded]"
    assert bodies[2]["value"] == "good"


def test_off_stack_trace_is_not_sent(requests_sent):
    client = make(capture_content=False)
    client.ingest(spanType="error", toolName="t", errorType="ValueError", stackTrace=SECRET)
    sent = spans(requests_sent, client)
    assert SECRET not in json.dumps(sent) and "stackTrace" not in sent[0]


def test_explicit_false_beats_env_true(requests_sent, monkeypatch):
    monkeypatch.setenv("UNCOIL_CAPTURE_CONTENT", "true")
    client = make(capture_content=False)
    uncoil.llm_call(SECRET, SECRET, "m", 0, 1, client=client)
    sent = spans(requests_sent, client)
    assert SECRET not in json.dumps(sent)
