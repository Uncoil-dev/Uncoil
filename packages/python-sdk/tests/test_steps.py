import asyncio
import threading
import pytest
import uncoil
from uncoil import UncoilClient


class Recorder(UncoilClient):
    def __init__(self, **options):
        super().__init__(api_key="uncoil_sk_live_eu_test", **options)
        self.sent = []

    def _send_span(self, span):
        self.sent.append(span)


@pytest.fixture
def client():
    return Recorder()


def by_name(spans):
    return {span.get("toolName") or span.get("modelId"): span for span in spans}


def test_nested_steps_link_to_their_parent_and_root(client):
    @uncoil.trace_agent(client=client, name="answer")
    def answer(question):
        with uncoil.span("plan", type="agent", client=client):
            with uncoil.span("search", type="tool", input=question, client=client) as step:
                step.set_output(["doc"])
            uncoil.llm_call("prompt", "reply", "claude", 0.01, 5, client=client, input_tokens=10, output_tokens=3, name="chat")
        return "done"

    assert answer("why?") == "done"
    spans = by_name(client.sent)
    root = spans["answer"]
    assert root["spanType"] == "run_end" and "parentSpanId" not in root
    assert spans["plan"]["parentSpanId"] == root["spanId"]
    assert spans["search"]["parentSpanId"] == spans["plan"]["spanId"]
    assert spans["chat"]["parentSpanId"] == spans["plan"]["spanId"]
    assert spans["chat"]["inputTokens"] == 10 and spans["chat"]["outputTokens"] == 3
    assert {span["runId"] for span in client.sent} == {root["runId"]}
    assert spans["search"]["output"] == '["doc"]'


def test_model_and_tool_calls_keep_client_defaults():
    client = Recorder(session_id="s1", end_user_id="u1", environment="staging", release="v2", tags=["beta"])

    @uncoil.trace_agent(client=client, name="answer")
    def answer():
        uncoil.llm_call("prompt", "reply", "claude", 0.01, 5, client=client, name="chat")
        uncoil.tool_call("search", "q", "hits", 3, client=client)

    answer()
    spans = by_name(client.sent)
    for step in (spans["chat"], spans["search"]):
        assert step["sessionId"] == "s1"
        assert step["endUserId"] == "u1"
        assert step["environment"] == "staging"
        assert step["release"] == "v2"
        assert step["tags"] == ["beta"]
        assert step["traceName"] == "answer"


def test_failure_marks_step_and_root(client):
    @uncoil.trace_agent(client=client)
    def run():
        with uncoil.span("lookup", type="tool", client=client):
            raise ValueError("boom")

    with pytest.raises(ValueError):
        run()
    spans = by_name(client.sent)
    assert spans["lookup"]["errorType"] == "ValueError"
    assert spans["run"]["spanType"] == "error" and spans["run"]["errorMessage"] == "boom"


def test_concurrent_runs_stay_apart(client):
    @uncoil.trace_agent(client=client)
    def run(tag):
        with uncoil.span(f"step-{tag}", client=client):
            threading.Event().wait(0.02)

    threads = [threading.Thread(target=run, args=(i,)) for i in range(4)]
    for thread in threads: thread.start()
    for thread in threads: thread.join()
    roots = {span["spanId"]: span["runId"] for span in client.sent if span["spanType"] == "run_end"}
    for span in client.sent:
        if span["spanType"] != "run_end":
            assert roots[span["parentSpanId"]] == span["runId"]
    assert len(set(roots.values())) == 4


def test_async_observe_nests(client):
    @uncoil.observe(type="tool", client=client)
    async def fetch(url):
        return {"url": url}

    @uncoil.trace_agent(client=client)
    async def run():
        return await asyncio.gather(fetch("a"), fetch("b"))

    asyncio.run(run())
    root = next(span for span in client.sent if span["spanType"] == "run_end")
    fetches = [span for span in client.sent if span.get("toolName") == "fetch"]
    assert len(fetches) == 2 and all(span["parentSpanId"] == root["spanId"] for span in fetches)


def test_payloads_are_redacted_and_capped(client):
    secret = "sk-ant-" + "a" * 30
    with uncoil.span("call", input={"api_key": "hunter2hunter2", "auth": f"Bearer {'x' * 40}", "k": secret}, client=client) as step:
        step.set_output("y" * 20_000)
    sent = client.sent[-1]
    assert "hunter2" not in sent["input"] and secret not in sent["input"] and "x" * 40 not in sent["input"]
    assert len(sent["output"]) < 10_100 and "truncated" in sent["output"]


def test_run_id_falls_back_to_environment_outside_a_step(monkeypatch):
    monkeypatch.setenv("UNCOIL_CURRENT_RUN_ID", "parent-run")
    assert uncoil.current_run_id() == "parent-run"
    assert uncoil.current_span_id() is None

    monkeypatch.delenv("UNCOIL_CURRENT_RUN_ID")
    assert uncoil.current_run_id() == "unknown"
    assert uncoil.current_span_id() is None


def test_last_run_id_names_the_run_a_traced_call_just_sent(client):
    @uncoil.trace_agent(client=client)
    def answer():
        return "ok"

    @uncoil.trace_agent(client=client)
    async def answer_async():
        return "ok"

    answer()
    assert uncoil.last_run_id() == client.sent[-1]["runId"]
    async def check():
        await answer_async()
        return uncoil.last_run_id()
    assert asyncio.run(check()) == client.sent[-1]["runId"] != client.sent[0]["runId"]
