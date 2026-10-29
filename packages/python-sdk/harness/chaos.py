"""
Chaos harness for Python SDK orchestration testing.

Makes real (or realistically delayed) HTTP calls so timing and
cancellation behavior are tested under real network conditions.

Usage:
    python -m harness.chaos --iterations 20 --policy enforce
"""

import argparse
import random
import time
import uuid
import sys
import os
from typing import Any, Callable, Dict, List, Optional, Tuple
from dataclasses import dataclass, field

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from uncoil import (
    UncoilClient,
    RuntimePolicy,
    CancellationToken,
    LatencyBudgetExceeded,
)

try:
    import httpx
except ImportError:
    httpx = None

# ─── Failure modes ────────────────────────────────────────────────
FailureMode = str  # "success" | "timeout" | "429" | "500" | "cost_overrun"

@dataclass
class ChaosConfig:
    iterations: int = 20
    failure_mix: Dict[str, float] = field(default_factory=lambda: {
        "success": 0.4,
        "timeout": 0.15,
        "429": 0.15,
        "500": 0.15,
        "cost_overrun": 0.15,
    })
    primary_model: str = "gpt-4o"
    fallback_models: List[str] = field(default_factory=lambda: ["claude-sonnet-4-20250514", "gpt-4o-mini"])
    latency_budget_ms: int = 5000
    max_cost_per_run: float = 0.05
    max_cost_per_day: float = 0.50
    base_url: str = "https://api.openai.com"
    api_key: str = ""
    run_id: str = ""
    host: str = "http://localhost:3000"

    def __post_init__(self):
        if not self.run_id:
            self.run_id = f"chaos_{int(time.time())}"
        if not self.api_key:
            self.api_key = os.environ.get("OPENAI_API_KEY", "")


@dataclass
class IterationResult:
    iteration: int
    model: str
    failure_mode: str
    success: bool
    latency_ms: int
    error: Optional[str] = None
    blocked: Optional[bool] = None
    fallback_reason: Optional[str] = None
    fail_open: Optional[bool] = None


# ─── Chaos call factory ───────────────────────────────────────────
def create_chaos_call(config: ChaosConfig, mode: str) -> Callable[[str, CancellationToken], Any]:
    def call_fn(model: str, token: CancellationToken) -> Any:
        if mode == "success":
            token.check()  # Check before starting
            if httpx:
                client = httpx.Client(timeout=30)
                try:
                    resp = client.post(
                        f"{config.base_url}/v1/chat/completions",
                        headers={
                            "Content-Type": "application/json",
                            "Authorization": f"Bearer {config.api_key}",
                        },
                        json={
                            "model": model,
                            "messages": [{"role": "user", "content": "Say exactly: chaos test ok"}],
                            "max_tokens": 10,
                        },
                    )
                    if resp.status_code != 200:
                        raise Exception(f"HTTP {resp.status_code}: {resp.text}")
                    return resp.json()
                finally:
                    client.close()
            else:
                import requests as req
                resp = req.post(
                    f"{config.base_url}/v1/chat/completions",
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {config.api_key}",
                    },
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": "Say exactly: chaos test ok"}],
                        "max_tokens": 10,
                    },
                    timeout=30,
                )
                if resp.status_code != 200:
                    raise Exception(f"HTTP {resp.status_code}: {resp.text}")
                return resp.json()

        elif mode == "timeout":
            sleep_ms = config.latency_budget_ms + 2000
            start = time.time()
            while (time.time() - start) * 1000 < sleep_ms:
                token.check()
                time.sleep(0.1)
            return {"content": "should not reach here"}

        elif mode == "429":
            err = Exception("429 Rate limit exceeded")
            err.status_code = 429
            raise err

        elif mode == "500":
            err = Exception("500 Internal Server Error")
            err.status_code = 500
            raise err

        elif mode == "cost_overrun":
            return {"content": "x" * 10000, "_metadata": {"estimatedCostUsd": 1.0}}

        else:
            raise ValueError(f"Unknown failure mode: {mode}")

    return call_fn


def pick_failure_mode(mix: Dict[str, float]) -> str:
    modes = list(mix.keys())
    weights = list(mix.values())
    return random.choices(modes, weights=weights, k=1)[0]


# ─── Run harness ──────────────────────────────────────────────────
def run_chaos_harness(config: ChaosConfig) -> List[IterationResult]:
    client = UncoilClient(api_key=config.api_key, host=config.host)
    results: List[IterationResult] = []

    for i in range(config.iterations):
        mode = pick_failure_mode(config.failure_mix)
        all_models = [config.primary_model] + config.fallback_models
        policy = RuntimePolicy(
            enforcement_mode="enforce",
            fallback_chain=all_models,
            max_cost_per_run=config.max_cost_per_run,
            max_cost_per_day=config.max_cost_per_day,
            latency_budget_ms=config.latency_budget_ms,
            max_attempts=2,
            backoff_ms=500,
            backoff_multiplier=2,
            retryable_errors=["429", "5xx", "rate_limit", "timeout"],
        )

        calculate_cost = (lambda result, model: 1.0) if mode == "cost_overrun" else None

        start = time.time()
        success = False
        error_msg = None

        try:
            client.orchestrate(
                input_data={"chaosIteration": i, "failureMode": mode},
                policy=policy,
                call=create_chaos_call(config, mode),
                model=config.primary_model,
                calculate_cost=calculate_cost,
                run_id=f"{config.run_id}_iter{i}",
            )
            success = True
        except Exception as e:
            error_msg = str(e)

        latency_ms = int((time.time() - start) * 1000)
        results.append(IterationResult(
            iteration=i,
            model=config.primary_model,
            failure_mode=mode,
            success=success,
            latency_ms=latency_ms,
            error=error_msg,
            fail_open=client._last_fail_open,
        ))

    return results


# ─── Report ───────────────────────────────────────────────────────
def print_report(results: List[IterationResult]):
    print("\n" + "=" * 72)
    print("  CHAOS HARNESS REPORT (Python)")
    print("=" * 72)

    by_mode: Dict[str, List[IterationResult]] = {}
    for r in results:
        by_mode.setdefault(r.failure_mode, []).append(r)

    for mode, items in by_mode.items():
        successes = sum(1 for r in items if r.success)
        avg_latency = sum(r.latency_ms for r in items) / len(items)
        fail_opens = sum(1 for r in items if r.fail_open)

        print(f"\n  {mode.upper():16s} {len(items)} iterations")
        print(f"    Success:      {successes}/{len(items)}")
        print(f"    Avg latency:  {avg_latency:.0f}ms")
        if fail_opens > 0:
            print(f"    Fail-open:    {fail_opens}")
        for r in items:
            if r.error:
                print(f"    Error:        [iter {r.iteration}] {r.error}")

    total_success = sum(1 for r in results if r.success)
    total_fail_open = sum(1 for r in results if r.fail_open)
    print(f"\n  TOTAL: {total_success}/{len(results)} succeeded, {total_fail_open} fail-open")
    print("=" * 72 + "\n")


# ─── CLI entry ────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Chaos harness for Python SDK")
    parser.add_argument("--iterations", type=int, default=20)
    parser.add_argument("--latency-budget", type=int, default=5000)
    parser.add_argument("--max-cost-run", type=float, default=0.05)
    parser.add_argument("--max-cost-day", type=float, default=0.50)
    parser.add_argument("--base-url", default="https://api.openai.com")
    parser.add_argument("--api-key", default="")
    parser.add_argument("--host", default="http://localhost:3000")
    parser.add_argument("--run-id", default="")
    args = parser.parse_args()

    config = ChaosConfig(
        iterations=args.iterations,
        latency_budget_ms=args.latency_budget,
        max_cost_per_run=args.max_cost_run,
        max_cost_per_day=args.max_cost_day,
        base_url=args.base_url,
        api_key=args.api_key,
        host=args.host,
        run_id=args.run_id,
    )

    print(f"Running {config.iterations} chaos iterations...")
    print(f"Policy: enforce, latency={config.latency_budget_ms}ms, "
          f"cost/run=${config.max_cost_per_run}, cost/day=${config.max_cost_per_day}")
    print(f"Failure mix: {config.failure_mix}")

    results = run_chaos_harness(config)
    print_report(results)


if __name__ == "__main__":
    main()
