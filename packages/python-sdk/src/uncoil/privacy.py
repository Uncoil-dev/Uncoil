"""Switch that keeps message content out of everything the SDK sends.

With content capture off, spans keep names, timings, token counts, cost, status and the error type;
prompts, answers, tool inputs and outputs, error messages, stack traces and feedback text are left out. Metadata you attach yourself is still sent.
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
    stripped = {key: value for key, value in span.items() if key not in ("errorMessage", "stackTrace", "attachments")}
    stripped["input"] = ""
    stripped["output"] = ""
    stripped["metadata"] = {**(span.get("metadata") or {}), "contentRecorded": False}
    return stripped


_FEEDBACK_KEYS = ("projectId", "traceId", "spanId", "kind", "name", "value", "dataType", "endUserId", "dedupeKey")


def strip_feedback_content(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Keep only the known content-free feedback fields, so any text field added later is left out by default.

    A string value is replaced unless the score is categorical, because only categories are content-free.
    """
    stripped = {key: payload[key] for key in _FEEDBACK_KEYS if key in payload}
    if isinstance(stripped.get("value"), str) and stripped.get("dataType") != "categorical":
        stripped["value"] = "[not recorded]"
    return stripped
