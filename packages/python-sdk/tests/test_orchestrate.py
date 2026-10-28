import time
import json
import pytest
from unittest.mock import patch, MagicMock, PropertyMock
from uncoil import (
    UncoilClient,
    RuntimePolicy,
    CancellationToken,
    LatencyBudgetExceeded,
    _is_retryable_error,
)

HTTP_TARGET = "uncoil.httpx.Client.post" if True else "uncoil._requests_fallback.post"

try:
    import httpx
    _HAS_HTTPX = True
except ImportError:
    _HAS_HTTPX = False

MOCK_TARGET = "uncoil.httpx.Client.post" if _HAS_HTTPX else "uncoil._requests_fallback.post"


class TestRuntimePolicy:
    def test_to_dict_minimal(self):
        p = RuntimePolicy(fallback_chain=["gpt-4o"])
        d = p.to_dict()
        assert d["enforcementMode"] == "observe"
        assert d["fallbackChain"] == ["gpt-4o"]
        assert d["maxCostPerRun"] is None
        assert d["maxCostPerDay"] is None
        assert d["retryPolicy"]["maxAttempts"] == 3
        assert d["retryPolicy"]["backoffMs"] == 1000
        assert d["retryPolicy"]["backoffMultiplier"] == 2.0
        assert d["retryPolicy"]["retryableErrors"] == ["timeout", "5xx"]
        assert d["latencyBudgetMs"] is None

    def test_to_dict_full(self):
        p = RuntimePolicy(
            enforcement_mode="enforce",
            max_attempts=5,
            backoff_ms=200,
            backoff_multiplier=1.5,
            fallback_chain=["gpt-4o", "claude-sonnet-4-20250514"],
            retryable_errors=["rate_limit"],
            max_cost_per_run=0.1,
            max_cost_per_day=5.0,
            latency_budget_ms=10000,
        )
        d = p.to_dict()
        assert d["enforcementMode"] == "enforce"
        assert d["retryPolicy"]["maxAttempts"] == 5
        assert d["retryPolicy"]["backoffMs"] == 200
        assert d["retryPolicy"]["backoffMultiplier"] == 1.5
        assert d["fallbackChain"] == ["gpt-4o", "claude-sonnet-4-20250514"]
        assert d["retryPolicy"]["retryableErrors"] == ["rate_limit"]
        assert d["maxCostPerRun"] == 0.1
        assert d["maxCostPerDay"] == 5.0
        assert d["latencyBudgetMs"] == 10000

    def test_to_dict_strips_non_serializable(self):
        p = RuntimePolicy(fallback_chain=["gpt-4o"])
        d = p.to_dict()
        assert "call" not in str(d)


class TestCancellationToken:
    def test_initial_state(self):
        t = CancellationToken()
        assert t.is_cancelled is False

    def test_cancel(self):
        t = CancellationToken()
        t.cancel()
        assert t.is_cancelled is True

    def test_check_raises_when_cancelled(self):
        t = CancellationToken()
        t.cancel()
        with pytest.raises(LatencyBudgetExceeded):
            t.check()

    def test_check_noop_when_not_cancelled(self):
        t = CancellationToken()
        t.check()


class TestUncoilClient:
    def test_selects_requested_region(self):
        client = UncoilClient(api_key="test-key", region="us")
        assert client.host == "https://us.cloud.uncoil.dev"

    def test_rejects_wrong_region_key(self):
        with pytest.raises(ValueError, match="belongs to EU"):
            UncoilClient(api_key="uncoil_sk_live_eu_example", region="us")

    def test_legacy_keys_belong_to_eu(self):
        with pytest.raises(ValueError, match="belongs to EU"):
            UncoilClient(api_key="uncoil_sk_live_legacy", region="us")

    @patch(MOCK_TARGET)
    def test_ingest_sends_correct_payload(self, mock_http):
        mock_http.return_value = MagicMock(status_code=202)

        client = UncoilClient(api_key="test-key")
        client.ingest(
            runId="run-1",
            spanType="llm_call",
            input="hello",
            output="world",
            modelId="gpt-4o",
            costUsd=0.001,
            latencyMs=100,
        )

        mock_http.assert_called_once()
        payload = mock_http.call_args.kwargs.get("json") or mock_http.call_args[1].get("json")
        assert payload["runId"] == "run-1"
        assert payload["spanType"] == "llm_call"
        assert payload["modelId"] == "gpt-4o"
        assert payload["costUsd"] == 0.001
        assert payload["latencyMs"] == 100

    @patch(MOCK_TARGET)
    def test_ingest_preserves_custom_metadata(self, mock_http):
        mock_http.return_value = MagicMock(status_code=202)

        client = UncoilClient(api_key="test-key")
        client.ingest(
            runId="run-1",
            spanType="llm_call",
            input="hello",
            output="world",
            modelId="gpt-4o",
            costUsd=0.001,
            latencyMs=100,
            metadata={"customKey": "customValue"},
        )

        mock_http.assert_called_once()
        payload = mock_http.call_args.kwargs.get("json") or mock_http.call_args[1].get("json")
        assert payload["metadata"]["customKey"] == "customValue"

    @patch(MOCK_TARGET)
    def test_client_context_is_added_to_ingested_payload(self, mock_http):
        mock_http.return_value = MagicMock(status_code=202)
        client = UncoilClient(
            api_key="test-key",
            release="release-42",
            environment="production",
            session_id="session-1",
            tags=["checkout"],
        )

        client.ingest(runId="run-1", spanType="llm_call")

        payload = mock_http.call_args.kwargs.get("json") or mock_http.call_args[1].get("json")
        assert payload["release"] == "release-42"
        assert payload["environment"] == "production"
        assert payload["sessionId"] == "session-1"
        assert payload["tags"] == ["checkout"]

    @patch(MOCK_TARGET)
    def test_orchestrate_success_on_first_model(self, mock_http):
        mock_http.return_value = MagicMock(status_code=202)
        client = UncoilClient(api_key="test-key")

        def mock_call(model, token):
            return {"result": "ok", "model": model}

        policy = RuntimePolicy(fallback_chain=["gpt-4o", "claude-sonnet-4-20250514"])
        result = client.orchestrate(
            input_data={"prompt": "hello"},
            policy=policy,
            call=mock_call,
            model="gpt-4o",
        )
        assert result == {"result": "ok", "model": "gpt-4o"}

    @patch(MOCK_TARGET)
    def test_orchestrate_fallback_on_error(self, mock_http):
        mock_http.return_value = MagicMock(status_code=202)
        client = UncoilClient(api_key="test-key")

        def mock_call(model, token):
            if model == "gpt-4o":
                raise Exception("rate limit exceeded")
            return {"result": "ok", "model": model}

        policy = RuntimePolicy(
            fallback_chain=["gpt-4o", "claude-sonnet-4-20250514"],
            retryable_errors=["rate_limit"],
            max_attempts=1,
        )
        result = client.orchestrate(
            input_data={"prompt": "hello"},
            policy=policy,
            call=mock_call,
            model="gpt-4o",
        )
        assert result == {"result": "ok", "model": "claude-sonnet-4-20250514"}

    @patch(MOCK_TARGET)
    def test_orchestrate_terminal_error_when_all_fail(self, mock_http):
        mock_http.return_value = MagicMock(status_code=202)
        client = UncoilClient(api_key="test-key")

        def mock_call(model, token):
            raise Exception(f"{model} failed")

        policy = RuntimePolicy(
            fallback_chain=["gpt-4o", "claude-sonnet-4-20250514"],
            max_attempts=1,
        )
        with pytest.raises(Exception, match="failed"):
            client.orchestrate(
                input_data={"prompt": "hello"},
                policy=policy,
                call=mock_call,
                model="gpt-4o",
            )

    @patch(MOCK_TARGET)
    def test_orchestrate_passes_cancellation_token(self, mock_http):
        mock_http.return_value = MagicMock(status_code=202)
        client = UncoilClient(api_key="test-key")
        received_tokens = []

        def mock_call(model, token):
            received_tokens.append(token)
            return "ok"

        policy = RuntimePolicy(fallback_chain=["gpt-4o"])
        client.orchestrate(
            input_data={"prompt": "hello"},
            policy=policy,
            call=mock_call,
            model="gpt-4o",
        )
        assert len(received_tokens) == 1
        assert isinstance(received_tokens[0], CancellationToken)
        assert received_tokens[0].is_cancelled is False

    @patch(MOCK_TARGET)
    def test_orchestrate_latency_abort_falls_back(self, mock_http):
        mock_http.return_value = MagicMock(status_code=202)
        client = UncoilClient(api_key="test-key")

        def mock_call(model, token):
            if model == "gpt-4o":
                raise LatencyBudgetExceeded("timeout")
            return {"result": "fallback-ok", "model": model}

        policy = RuntimePolicy(
            fallback_chain=["gpt-4o", "claude-sonnet-4-20250514"],
            latency_budget_ms=1,
        )
        result = client.orchestrate(
            input_data={"prompt": "hello"},
            policy=policy,
            call=mock_call,
            model="gpt-4o",
        )
        assert result == {"result": "fallback-ok", "model": "claude-sonnet-4-20250514"}

    @patch(MOCK_TARGET)
    def test_orchestrate_failopen_on_check_cost_failure(self, mock_http):
        mock_http.return_value = MagicMock(status_code=500)
        client = UncoilClient(api_key="test-key")
        policy = RuntimePolicy(
            enforcement_mode="enforce",
            fallback_chain=["gpt-4o"],
            max_cost_per_run=0.01,
        )
        result = client.orchestrate(
            input_data={"prompt": "hello"},
            policy=policy,
            call=lambda m, t: {"result": "ok"},
            model="gpt-4o",
        )
        assert result == {"result": "ok"}
        assert client._last_fail_open is True

    @patch(MOCK_TARGET)
    def test_orchestrate_success_resets_failopen_flag(self, mock_http):
        call_count = {"n": 0}

        def side_effect(*args, **kwargs):
            call_count["n"] += 1
            if call_count["n"] <= 2:
                fail_resp = MagicMock()
                fail_resp.status_code = 500
                return fail_resp
            ok = MagicMock()
            ok.status_code = 200
            ok.json.return_value = {"allowed": True}
            return ok

        mock_http.side_effect = side_effect
        client = UncoilClient(api_key="test-key")
        policy = RuntimePolicy(
            enforcement_mode="enforce",
            fallback_chain=["gpt-4o"],
            max_cost_per_run=0.01,
            max_cost_per_day=0.01,
        )

        client.orchestrate(
            input_data={"prompt": "hello"},
            policy=policy,
            call=lambda m, t: {"result": "ok"},
            model="gpt-4o",
        )
        assert client._last_fail_open is True

        client.orchestrate(
            input_data={"prompt": "hello"},
            policy=policy,
            call=lambda m, t: {"result": "ok"},
            model="gpt-4o",
        )
        assert client._last_fail_open is False


class TestLatencyBudgetExceeded:
    def test_is_exception(self):
        e = LatencyBudgetExceeded("timeout")
        assert isinstance(e, Exception)
        assert str(e) == "timeout"

    def test_not_retryable(self):
        assert _is_retryable_error(LatencyBudgetExceeded("timeout"), ["timeout"]) is False
