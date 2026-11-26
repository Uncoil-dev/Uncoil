import pytest
from uncoil import UncoilClient

KEY = "uncoil_sk_live_eu_abcdefghijklmnop"
PROMPT = {"name": "greeting", "version": 3, "template": "Hello {{name}}"}


class FakeResponse:
    def __init__(self, status_code, body=None):
        self.status_code = status_code
        self._body = body
        self.text = "server said no"

    def json(self):
        return self._body


@pytest.fixture
def server(monkeypatch):
    """Route prompt requests to a list of queued responses and record each call."""
    state = {"responses": [], "calls": []}

    def fake_get(url, **kwargs):
        state["calls"].append({"url": url, **kwargs})
        return state["responses"].pop(0)

    monkeypatch.setattr("uncoil._requests_fallback.get", fake_get)
    return state


@pytest.fixture
def clock(monkeypatch):
    now = {"t": 1000.0}
    monkeypatch.setattr("uncoil.time.time", lambda: now["t"])
    return now


def make_client():
    client = UncoilClient(api_key=KEY)
    client._http = None
    return client


def test_second_call_inside_ttl_uses_the_cache(server, clock):
    server["responses"] = [FakeResponse(200, PROMPT)]
    client = make_client()
    first = client.get_prompt("greeting", cache_ttl_seconds=60)
    clock["t"] += 59
    second = client.get_prompt("greeting", cache_ttl_seconds=60)
    assert first == second == PROMPT
    assert len(server["calls"]) == 1


def test_call_after_ttl_makes_a_new_request(server, clock):
    newer = {**PROMPT, "version": 4}
    server["responses"] = [FakeResponse(200, PROMPT), FakeResponse(200, newer)]
    client = make_client()
    client.get_prompt("greeting", cache_ttl_seconds=60)
    clock["t"] += 61
    assert client.get_prompt("greeting", cache_ttl_seconds=60) == newer
    assert len(server["calls"]) == 2


@pytest.mark.parametrize("status", [404, 500])
def test_error_response_returns_the_fallback(server, clock, status):
    server["responses"] = [FakeResponse(status)]
    fallback = {"template": "Hi"}
    assert make_client().get_prompt("greeting", fallback=fallback) == fallback


@pytest.mark.parametrize("status", [404, 500])
def test_error_response_without_fallback_raises(server, clock, status):
    server["responses"] = [FakeResponse(status)]
    with pytest.raises(RuntimeError, match=str(status)):
        make_client().get_prompt("greeting")


def test_request_sends_environment_as_a_query_parameter(server, clock):
    server["responses"] = [FakeResponse(200, PROMPT)]
    make_client().get_prompt("greeting", environment="staging")
    call = server["calls"][0]
    assert call["url"].endswith("/api/prompts/greeting")
    assert call["params"] == {"environment": "staging"}
