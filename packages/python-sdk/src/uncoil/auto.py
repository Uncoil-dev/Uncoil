"""One-line setup: `uncoil.init()` traces OpenAI, Anthropic and LangChain/LangGraph without wrapping anything."""
import functools
import importlib

from .integrations import _inside_wrapped, _traced_call

# (provider, module, class, methods) - the provider SDKs stay optional; missing ones are skipped.
_TARGETS = [
    ("openai", "openai.resources.chat.completions", ["Completions", "AsyncCompletions"], "chat.completions", ["create"]),
    ("openai", "openai.resources.responses", ["Responses", "AsyncResponses"], "responses", ["create"]),
    ("anthropic", "anthropic.resources.messages", ["Messages", "AsyncMessages"], "messages", ["create", "stream"]),
    ("anthropic", "anthropic.resources.beta.messages", ["Messages", "AsyncMessages"], "beta.messages", ["create", "stream"]),
]

_undo = []
_langchain_handler = None


def _inside_langchain():
    """True while LangChain is running a model call, where its own handler already records the step."""
    if _langchain_handler is None or not _langchain_handler.enabled:
        return False
    try:
        from langchain_core.runnables.config import var_child_runnable_config
        return var_child_runnable_config.get() is not None
    except ImportError:
        return False


def _patch(provider, cls, base, method, options):
    original = getattr(cls, method, None)
    if original is None or getattr(original, "_uncoil", False):
        return
    path = f"{base}.{method}"

    @functools.wraps(original)
    def patched(self, *args, **kwargs):
        if _inside_wrapped.get() or _inside_langchain():
            return original(self, *args, **kwargs)
        return _traced_call(provider, path, functools.partial(original, self), args, kwargs, options)

    patched._uncoil = True
    setattr(cls, method, patched)
    _undo.append(lambda: setattr(cls, method, original))


def _hook_langchain(options):
    """Register one LangChain handler for the whole process; init()/uninit() only change its options and switch."""
    global _langchain_handler
    if _langchain_handler is None:
        import contextvars
        from langchain_core.tracers.context import register_configure_hook
        from .langgraph import UncoilCallbackHandler
        _langchain_handler = UncoilCallbackHandler(**options)
        # A default (not .set) so threads and tasks started later get the handler too.
        register_configure_hook(contextvars.ContextVar("uncoil_langchain_handler", default=_langchain_handler), True)
    _langchain_handler.options = options
    _langchain_handler.enabled = True
    _undo.append(lambda: setattr(_langchain_handler, "enabled", False))


def init(**options):
    """Trace every OpenAI, Anthropic and LangChain/LangGraph call in the app. Call once at startup.

    Reads UNCOIL_API_KEY from the environment. Options (client=, calculate_cost=, ...) are the same as for
    wrap_openai. Libraries that are not installed are skipped. Returns the list of what was switched on.
    Call `uncoil.uninit()` to switch it off. For the Vercel AI SDK use the JavaScript SDK.
    """
    uninit()
    active = []
    try:
        _hook_langchain(options)
        active.append("langchain")
    except ImportError:
        pass
    for provider, module, names, base, methods in _TARGETS:
        try:
            mod = importlib.import_module(module)
        except ImportError:
            continue
        for name in names:
            cls = getattr(mod, name, None)
            for method in methods:
                if cls is not None:
                    _patch(provider, cls, base, method, options)
        if provider not in active:
            active.append(provider)
    return active


def uninit():
    """Switch off everything `init()` switched on."""
    while _undo:
        _undo.pop()()
