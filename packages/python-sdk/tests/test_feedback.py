import pytest
from uncoil import UncoilClient

KEY = "uncoil_sk_live_eu_abcdefghijklmnop"


@pytest.fixture
def posts(monkeypatch):
    """Record every feedback request sent through the requests fallback."""
    sent = []

    def fake_post(url, **kwargs):
        sent.append({"url": url, **kwargs})

    monkeypatch.setattr("uncoil._requests_fallback.post", fake_post)
    return sent


def make_client(project_id="proj_123"):
    client = UncoilClient(api_key=KEY, project_id=project_id)
    client._http = None
    return client


@pytest.mark.parametrize(
    "value, kind",
    [(True, "thumb"), (False, "thumb"), (4, "star"), (3.5, "star"), ("too slow", "text")],
)
def test_feedback_infers_kind_from_value(posts, value, kind):
    make_client().feedback("trace_1", value)
    body = posts[0]["json"]
    assert body["kind"] == kind
    assert body["value"] == value
    assert body["traceId"] == "trace_1"


def test_score_posts_name_value_and_data_type(posts):
    make_client().score("trace_1", "accuracy", 0.9, data_type="numeric")
    call = posts[0]
    assert call["url"].endswith("/api/feedback")
    body = call["json"]
    assert body["projectId"] == "proj_123"
    assert body["name"] == "accuracy"
    assert body["value"] == 0.9
    assert body["dataType"] == "numeric"


def test_missing_project_id_warns_and_sends_nothing(posts, capsys):
    client = make_client(project_id=None)
    client.feedback("trace_1", True)
    client.score("trace_1", "accuracy", 1)
    assert posts == []
    assert "project_id is required" in capsys.readouterr().out


def test_failed_request_warns_without_raising(monkeypatch, capsys):
    def boom(*a, **k):
        raise OSError("offline")

    monkeypatch.setattr("uncoil._requests_fallback.post", boom)
    make_client().score("trace_1", "accuracy", 1)
    assert "Failed to record evaluation signal: offline" in capsys.readouterr().out
