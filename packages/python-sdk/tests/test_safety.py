import asyncio
import pytest
import uncoil
from uncoil import UncoilClient, UncoilError, build_redactor, sample_bucket, trace_tools

KEY = "uncoil_sk_live_eu_abcdefghijklmnop"


class Recorder(UncoilClient):
    def __init__(self, **options):
        super().__init__(api_key=KEY, **options)
        self.sent = []

    def _send_span(self, span):
        self.sent.append(span)


class FakeResponse:
    def __init__(self, status_code):
        self.status_code = status_code


def test_missing_key_explains_the_fix(monkeypatch):
    monkeypatch.delenv("UNCOIL_API_KEY", raising=False)
    with pytest.raises(UncoilError) as caught:
        UncoilClient()
    assert caught.value.code == "missing_key"
    assert "UNCOIL_API_KEY" in str(caught.value)
    assert isinstance(caught.value, ValueError)  # older code catching ValueError keeps working


def test_odd_key_is_flagged_without_failing():
    seen = []
    UncoilClient(api_key="sk-openai-123", on_error=seen.append)
    assert seen[0].code == "odd_key"


def test_bad_options_are_rejected_clearly():
    with pytest.raises(UncoilError, match="0 to 1"):
        UncoilClient(api_key=KEY, sample_rate=2)
    with pytest.raises(UncoilError, match="valid web address"):
        UncoilClient(api_key=KEY, host="nonsense")
    with pytest.raises(UncoilError, match="region"):
        UncoilClient(api_key=KEY, region="mars")


def test_rejected_key_is_reported_once():
    seen = []
    client = UncoilClient(api_key=KEY, on_error=seen.append)
    client._check_response(401)
    client._check_response(401)
    client._check_response(200)
    assert [e.code for e in seen] == ["bad_key"]
    assert seen[0].status == 401


def test_network_failure_does_not_raise(monkeypatch):
    seen = []
    client = UncoilClient(api_key=KEY, on_error=seen.append)

    def boom(*a, **k):
        raise OSError("offline")

    client._http = None
    monkeypatch.setattr("uncoil._requests_fallback.post", boom)
    client.ingest(spanType="llm_call", runId="r1")
    assert seen[0].code == "network"


def test_status_codes_map_to_helpful_messages():
    seen = []
    client = UncoilClient(api_key=KEY, on_error=seen.append)
    for status in (403, 429, 503, 422):
        client._check_response(status)
    assert [e.code for e in seen] == ["forbidden", "rate_limited", "server_error", "rejected"]


def test_sampling_is_stable_and_proportional():
    assert sample_bucket("run-a") == sample_bucket("run-a")
    kept = sum(1 for i in range(2000) if sample_bucket(f"run-{i}") < 0.25)
    assert 0.2 < kept / 2000 < 0.3


def test_sampling_drops_whole_runs_but_keeps_errors():
    dropped = next(r for r in (f"run-{i}" for i in range(100)) if sample_bucket(r) >= 0.5)
    client = Recorder(sample_rate=0.5)
    client.ingest(spanType="llm_call", runId=dropped)
    client.ingest(spanType="llm_call", runId=dropped)
    client.ingest(spanType="error", runId=dropped, errorType="Boom")
    assert [s["spanType"] for s in client.sent] == ["error"]


def test_sample_rate_extremes():
    zero = Recorder(sample_rate=0)
    zero.ingest(spanType="llm_call", runId="x")
    assert zero.sent == []
    full = Recorder()
    full.ingest(spanType="llm_call", runId="x")
    assert len(full.sent) == 1


def test_pii_redaction():
    redact = build_redactor(pii=True)
    out = redact("Mail jane.doe@example.com or call +44 20 7946 0958, card 4242 4242 4242 4242.")
    assert "jane.doe" not in out and "4242" not in out and "7946" not in out


def test_custom_redaction():
    import re
    redact = build_redactor(patterns=[re.compile(r"ACME-\d+"), "secret.word"], fn=str.upper, replacement="X")
    assert redact("ACME-99 and secret.word") == "X AND X"
    assert build_redactor(pii=False) is None


def test_masking_is_on_by_default():
    client = Recorder()
    client.ingest(spanType="llm_call", runId="r", input="bob@example.com paid with 4242 4242 4242 4242")
    assert client.sent[0]["input"] == "[redacted] paid with [redacted]"


def test_long_numbers_that_are_not_cards_are_kept():
    assert build_redactor()("order 1761400000000 shipped") == "order 1761400000000 shipped"


def test_masking_can_be_turned_off():
    client = Recorder(redact={"pii": False})
    client.ingest(spanType="llm_call", runId="r", input="bob@example.com")
    assert client.sent[0]["input"] == "bob@example.com"


def test_redaction_applies_to_what_is_sent():
    client = Recorder(redact={"pii": True})
    client.ingest(spanType="llm_call", runId="r", input="hi from bob@example.com", output={"to": "bob@example.com"})
    assert client.sent[0]["input"] == "hi from [redacted]"
    assert "bob@" not in client.sent[0]["output"]


def test_trace_tools_sync_async_and_failures():
    client = Recorder()
    tools = trace_tools({
        "add": lambda a, b: a + b,
        "lookup": None,
    }, client=client)
    assert tools["add"](1, 2) == 3
    assert tools["lookup"] is None

    async def fetch(q):
        return f"found {q}"

    def broken():
        raise RuntimeError("nope")

    traced = trace_tools({"fetch": fetch, "broken": broken}, client=client)
    assert asyncio.run(traced["fetch"]("cats")) == "found cats"
    with pytest.raises(RuntimeError):
        traced["broken"]()
    names = [(s["toolName"], s.get("errorMessage")) for s in client.sent]
    assert ("add", None) in names and ("fetch", None) in names and ("broken", "nope") in names
    assert all(s["spanType"] == "tool_call" for s in client.sent)


def test_templates_are_valid_python():
    import pathlib
    import py_compile
    folder = pathlib.Path(__file__).resolve().parent.parent / "templates"
    files = sorted(folder.glob("*.py"))
    assert files, "templates are missing"
    for file in files:
        py_compile.compile(str(file), doraise=True)
