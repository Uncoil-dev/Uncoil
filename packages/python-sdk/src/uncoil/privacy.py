"""Switch that keeps message content out of everything the SDK sends.

With content capture off, spans keep names, timings, token counts, cost, status and the error type;
prompts, answers, tool inputs and outputs, error messages and feedback text are left out.
"""
import os
from typing import Any, Dict, Optional

_FALSE_VALUES = {"false", "0", "no", "off"}


def resolve_capture_content(option: Optional[bool] = None) -> bool:
    """An explicit option wins; otherwise UNCOIL_CAPTURE_CONTENT decides. Unset or unknown values capture."""
    if option is not None:
        return bool(option)
    return (os.environ.get("UNCOIL_CAPTURE_CONTENT") or "").strip().lower() not in _FALSE_VALUES


def strip_span_content(span: Dict[str, Any]) -> Dict[str, Any]:
    """Return the span without message text. Ingestion needs input or output present, so both stay as empty strings."""
    stripped = {key: value for key, value in span.items() if key not in ("errorMessage", "attachments")}
    stripped["input"] = ""
    stripped["output"] = ""
    stripped["metadata"] = {**(span.get("metadata") or {}), "contentRecorded": False}
    return stripped


def strip_feedback_content(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Drop free text from feedback and scores: comments, reasons and the value of a text answer."""
    stripped = {key: value for key, value in payload.items() if key not in ("comment", "reason")}
    if payload.get("kind") == "text" and not payload.get("name") and isinstance(payload.get("value"), str):
        stripped["value"] = "[not recorded]"
    return stripped
