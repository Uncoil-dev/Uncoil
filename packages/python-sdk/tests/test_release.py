import subprocess
import time

import pytest

from uncoil import release as release_module
from uncoil.release import PLATFORM_RELEASE_VARIABLES, resolve_release

SHA = "0123456789abcdef0123456789abcdef01234567"
ALL_VARIABLES = ["UNCOIL_RELEASE", "TRACIFY_RELEASE", *PLATFORM_RELEASE_VARIABLES.values()]


@pytest.fixture(autouse=True)
def clean(monkeypatch):
    for name in ALL_VARIABLES:
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setattr(release_module, "_git_checked", False)
    monkeypatch.setattr(release_module, "_git_release", None)


def fake_git(monkeypatch, stdout="abc1234\n", returncode=0, error=None):
    calls = []

    def run(*args, **kwargs):
        calls.append((args, kwargs))
        if error:
            raise error
        return subprocess.CompletedProcess(args[0], returncode, stdout, "")

    monkeypatch.setattr(release_module.subprocess, "run", run)
    return calls


@pytest.mark.parametrize("platform,name", sorted(PLATFORM_RELEASE_VARIABLES.items()))
def test_every_platform_variable_maps_to_a_short_release(monkeypatch, platform, name):
    calls = fake_git(monkeypatch)
    monkeypatch.setenv(name, SHA)
    assert resolve_release() == SHA[:7]
    assert calls == []


def test_non_sha_values_are_kept_as_is(monkeypatch):
    monkeypatch.setenv("RENDER_GIT_COMMIT", "v1.2.3")
    assert resolve_release() == "v1.2.3"


def test_explicit_option_wins_over_everything(monkeypatch):
    monkeypatch.setenv("UNCOIL_RELEASE", "from-env")
    monkeypatch.setenv("VERCEL_GIT_COMMIT_SHA", SHA)
    assert resolve_release("manual") == "manual"


@pytest.mark.parametrize("legacy", ["UNCOIL_RELEASE", "TRACIFY_RELEASE"])
def test_release_variable_wins_over_platform(monkeypatch, legacy):
    monkeypatch.setenv(legacy, "pinned")
    monkeypatch.setenv("GITHUB_SHA", SHA)
    assert resolve_release() == "pinned"


def test_local_git_is_used_last_and_only_once(monkeypatch):
    calls = fake_git(monkeypatch)
    assert resolve_release() == "abc1234"
    assert resolve_release() == "abc1234"
    assert len(calls) == 1
    assert calls[0][1]["timeout"] <= 0.5


@pytest.mark.parametrize(
    "kwargs",
    [
        {"error": FileNotFoundError("git")},
        {"returncode": 128, "stdout": ""},
        {"error": subprocess.TimeoutExpired("git", 0.2)},
        {"error": OSError("boom")},
    ],
)
def test_missing_git_non_repo_or_slow_git_leave_release_empty(monkeypatch, kwargs):
    fake_git(monkeypatch, **kwargs)
    assert resolve_release() is None


def test_slow_git_does_not_delay_startup(monkeypatch):
    monkeypatch.setattr(release_module, "GIT_TIMEOUT_SECONDS", 0.05)
    real_run = subprocess.run

    def slow(args, **kwargs):
        return real_run(["python3", "-c", "import time; time.sleep(5)"], **kwargs)

    monkeypatch.setattr(release_module.subprocess, "run", slow)
    started = time.monotonic()
    assert resolve_release() is None
    assert time.monotonic() - started < 1


def test_client_picks_up_the_platform_release(monkeypatch):
    import uncoil

    monkeypatch.setenv("VERCEL_GIT_COMMIT_SHA", SHA)
    client = uncoil.UncoilClient(api_key="uncoil_sk_live_eu_test")
    assert client.release == SHA[:7]
