"""Setup checker: `uncoil-doctor` or `python -m uncoil.doctor`.

Checks the API key, region and network, then sends one test trace.
"""
import argparse
import json
import os
import re
import sys
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

REGION_HOSTS = {
    "eu": "https://eu.cloud.uncoil.dev",
    "us": "https://us.cloud.uncoil.dev",
}
MARKS = {"ok": "✓", "warn": "!", "fail": "✗", "skip": "-"}


def mask_key(api_key: str) -> str:
    """Shows enough of a key to recognise it without leaking it."""
    if len(api_key) <= 12:
        return "***"
    return f"{api_key[:16]}…{api_key[-4:]}"


def _key_region(api_key: str) -> Optional[str]:
    if re.match(r"^(uncoil|tracify)_sk_live_eu_", api_key):
        return "eu"
    if re.match(r"^(uncoil|tracify)_sk_live_us_", api_key):
        return "us"
    if re.match(r"^(uncoil|tracify)_sk_live_", api_key):
        return "eu"
    return None


def _request(method: str, url: str, timeout: float, headers: Optional[Dict[str, str]] = None, body: Optional[Dict[str, Any]] = None) -> int:
    """Returns the HTTP status; raises on network trouble. Uses httpx or requests, whichever the SDK already needs."""
    try:
        import httpx
        response = httpx.request(method, url, headers=headers, json=body, timeout=timeout, follow_redirects=False)
    except ImportError:
        import requests
        response = requests.request(method, url, headers=headers, json=body, timeout=timeout, allow_redirects=False)
    return response.status_code


def _error_text(error: BaseException) -> str:
    text = str(error) or error.__class__.__name__
    return text if len(text) < 160 else text[:157] + "..."


def run_doctor(api_key: Optional[str] = None, region: Optional[str] = None, host: Optional[str] = None, send: bool = True, timeout: float = 10.0) -> Dict[str, Any]:
    """Runs every setup check in order and never raises. Returns {"ok", "host", "checks", "runId"}."""
    checks: List[Dict[str, Any]] = []
    state: Dict[str, Any] = {"runId": None}

    def add(check_id: str, title: str, status: str, message: str, hint: Optional[str] = None):
        checks.append({"id": check_id, "title": title, "status": status, "message": message, "hint": hint})

    key = (api_key or (os.environ.get("UNCOIL_API_KEY") or os.environ.get("TRACIFY_API_KEY")) or "").strip()
    env_region = ((os.environ.get("UNCOIL_REGION") or os.environ.get("TRACIFY_REGION")) or "").strip().lower()
    wanted = (region or (env_region if env_region in REGION_HOSTS else "") or "").lower() or None
    found = _key_region(key)
    target = (host or (os.environ.get("UNCOIL_HOST") or os.environ.get("TRACIFY_HOST")) or REGION_HOSTS[wanted or found or "eu"]).rstrip("/")

    def report() -> Dict[str, Any]:
        return {"ok": not any(c["status"] == "fail" for c in checks), "host": target, "checks": checks, "runId": state["runId"]}

    add("runtime", "Runtime", "ok", f"Python {sys.version.split()[0]}")

    if not key:
        add("key", "API key", "fail", "No API key was found.", "Set the UNCOIL_API_KEY environment variable, or run with --key. Create a key on the API keys page of your dashboard.")
        return report()
    if not re.match(r"^(uncoil|tracify)_sk_", key):
        add("key", "API key", "fail", f"{mask_key(key)} does not look like an Uncoil key (they start with uncoil_sk_).", "Copy the key again from the API keys page; make sure no other service's key was pasted by mistake.")
        return report()
    add("key", "API key", "ok", f"Found {mask_key(key)}")

    if not target.startswith(("http://", "https://")):
        add("region", "Region and host", "fail", f'The host "{target}" is not a valid web address.', 'Use a full address such as "https://eu.cloud.uncoil.dev", or drop the host option and use --region eu or us.')
        return report()
    host_region = next((k for k, v in REGION_HOSTS.items() if v == target), None)
    if found and host_region and found != host_region:
        add("region", "Region and host", "fail", f"This key belongs to {found.upper()}, but you are pointing at {host_region.upper()}.", f"Set UNCOIL_REGION={found} (or run with --region {found}), or create a key in the {host_region.upper()} region.")
        return report()
    add("region", "Region and host", "ok", f"{host_region.upper()} · {target}" if host_region else f"Custom host · {target}")

    try:
        status = _request("GET", target, timeout)
        add("network", "Network", "ok", f"Reached {target} (HTTP {status}).")
    except Exception as error:  # network trouble of any kind is the thing being diagnosed
        add("network", "Network", "fail", f"Could not reach {target} ({_error_text(error)}).", "Check your internet connection, firewall, proxy settings and the host setting.")
        return report()

    if not send:
        add("trace", "Test trace", "skip", "Skipped (--no-send).")
        return report()

    run_id = f"doctor_{uuid.uuid4().hex[:16]}"
    span = {
        "spanId": f"doctor_span_{uuid.uuid4().hex[:16]}",
        "runId": run_id,
        "traceName": "Uncoil setup check",
        "spanType": "llm_call",
        "modelId": "uncoil-doctor",
        "createdAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "latencyMs": 1,
        "input": "Setup check from uncoil doctor",
        "output": "If you can see this trace in your dashboard, the SDK is set up correctly.",
        "tags": ["uncoil-doctor"],
        "metadata": {"source": "uncoil doctor", "sdk": "python"},
    }
    try:
        code = _request("POST", f"{target}/api/ingest", timeout, {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}, span)
    except Exception as error:
        add("trace", "Test trace", "fail", f"The test trace could not be sent ({_error_text(error)}).", "Check your connection and try again.")
        return report()
    if 200 <= code < 300:
        state["runId"] = run_id
        add("trace", "Test trace", "ok", f'Accepted. Look for "Uncoil setup check" (run {run_id}) in your dashboard.')
    elif code == 401:
        add("trace", "Test trace", "fail", "Uncoil rejected the API key (401).", "The key is wrong, was revoked, or belongs to another region. Create a fresh one on the API keys page.")
    elif code == 403:
        add("trace", "Test trace", "fail", "This key is not allowed to send data (403).", "Check that the key belongs to the project you expect and has not been disabled.")
    elif code in (402, 429):
        add("trace", "Test trace", "fail", f"Uncoil is not taking data right now ({code}).", "You may be over your plan's limit or sending too fast. Check usage on the billing page, then try again.")
    elif code >= 500:
        add("trace", "Test trace", "fail", f"Uncoil had a problem on its side ({code}).", "Your app is not affected. Check the status page and try again in a minute.")
    else:
        add("trace", "Test trace", "fail", f"Uncoil did not accept the test trace ({code}).", "Update uncoil-sdk to the latest version; if it still happens, contact support.")
    return report()


def format_report(result: Dict[str, Any]) -> str:
    lines = ["Uncoil setup check", ""]
    for check in result["checks"]:
        lines.append(f"{MARKS[check['status']]} {check['title']}: {check['message']}")
        if check.get("hint") and check["status"] != "ok":
            lines.append(f"    Fix: {check['hint']}")
    lines.append("")
    lines.append("All good. Your setup is ready to send traces." if result["ok"] else "Something needs fixing; see the Fix lines above.")
    return "\n".join(lines)


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(prog="uncoil-doctor", description="Checks your API key, region and network, then sends one test trace.")
    parser.add_argument("--key", help="API key (default: UNCOIL_API_KEY)")
    parser.add_argument("--region", choices=["eu", "us"], help="Data region (default: UNCOIL_REGION, else from the key)")
    parser.add_argument("--host", help="Custom host (default: UNCOIL_HOST)")
    parser.add_argument("--no-send", action="store_true", help="Skip the test trace")
    parser.add_argument("--json", action="store_true", help="Print the result as JSON")
    args = parser.parse_args(argv)
    result = run_doctor(api_key=args.key, region=args.region, host=args.host, send=not args.no_send)
    print(json.dumps(result, indent=2, ensure_ascii=False) if args.json else format_report(result))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
