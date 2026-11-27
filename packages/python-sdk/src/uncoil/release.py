"""Release detection: picks a release label when the caller did not set one."""
import os
import subprocess
from typing import Dict, Optional

# Deploy platform -> environment variable holding the commit being deployed.
PLATFORM_RELEASE_VARIABLES: Dict[str, str] = {
    "vercel": "VERCEL_GIT_COMMIT_SHA",
    "railway": "RAILWAY_GIT_COMMIT_SHA",
    "render": "RENDER_GIT_COMMIT",
    "netlify": "COMMIT_REF",
    "cloudflare_pages": "CF_PAGES_COMMIT_SHA",
    "github_actions": "GITHUB_SHA",
    "gitlab_ci": "CI_COMMIT_SHA",
}

GIT_TIMEOUT_SECONDS = 0.2
_SHORT_SHA_LENGTH = 7

_git_checked = False
_git_release: Optional[str] = None


def _shorten(value: str) -> str:
    value = value.strip()
    if len(value) == 40 and all(char in "0123456789abcdefABCDEF" for char in value):
        return value[:_SHORT_SHA_LENGTH]
    return value


def _local_git_release() -> Optional[str]:
    """Short HEAD of the current checkout. Looked up once per process; never raises."""
    global _git_checked, _git_release
    if _git_checked:
        return _git_release
    _git_checked = True
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            capture_output=True,
            text=True,
            timeout=GIT_TIMEOUT_SECONDS,
            stdin=subprocess.DEVNULL,
        )
        if result.returncode == 0:
            _git_release = result.stdout.strip() or None
    except Exception:
        _git_release = None
    return _git_release


def resolve_release(explicit: Optional[str] = None) -> Optional[str]:
    """Explicit value, then UNCOIL_RELEASE (and its legacy name), then platform commit variables, then local git."""
    if explicit:
        return explicit
    configured = (os.environ.get("UNCOIL_RELEASE") or os.environ.get("TRACIFY_RELEASE") or "").strip()
    if configured:
        return configured
    for name in PLATFORM_RELEASE_VARIABLES.values():
        value = (os.environ.get(name) or "").strip()
        if value:
            return _shorten(value)
    return _local_git_release()
