import json, os, threading
from http.server import BaseHTTPRequestHandler, HTTPServer
os.environ["UNCOIL_API_KEY"] = "uncoil_sk_live_eu_test"
os.environ["OPENAI_API_KEY"] = "t"
import uncoil
from uncoil import UncoilClient

sent = []
UncoilClient._send_span = lambda self, span: sent.append(span)
usage = lambda i, o: dict(prompt_tokens=i, completion_tokens=o, total_tokens=i + o)
CALL = dict(id="c0", object="chat.completion", created=1, model="gpt-4o-mini", usage=usage(8, 3), choices=[dict(index=0, finish_reason="tool_calls", message=dict(role="assistant", content=None, tool_calls=[dict(id="t1", type="function", function=dict(name="get_order", arguments='{"order_id":"A1"}'))]))])
DONE = dict(id="c1", object="chat.completion", created=1, model="gpt-4o-mini", usage=usage(20, 4), choices=[dict(index=0, finish_reason="stop", message=dict(role="assistant", content="Order A1 shipped."))])
calls = iter([CALL, DONE])

class FakeOpenAI(BaseHTTPRequestHandler):
    def do_POST(self):
        self.rfile.read(int(self.headers["content-length"]))
        body = json.dumps(next(calls)).encode()
        self.send_response(200); self.send_header("content-type", "application/json"); self.send_header("content-length", str(len(body))); self.end_headers(); self.wfile.write(body)
    def log_message(self, *args): pass

server = HTTPServer(("127.0.0.1", 0), FakeOpenAI)
threading.Thread(target=server.serve_forever, daemon=True).start()
os.environ["OPENAI_BASE_URL"] = f"http://127.0.0.1:{server.server_port}/v1"

# ---- snippet ----
from agno.agent import Agent
from agno.models.openai import OpenAIChat

uncoil.init()

def get_order(order_id: str) -> str:
    """Look up an order by id."""
    return "shipped"

tools = uncoil.trace_tools({"get_order": get_order})

agent = Agent(model=OpenAIChat(id="gpt-4o-mini"), tools=[tools["get_order"]], instructions="Answer in one sentence.")

@uncoil.trace_agent(name="agno-support")
def ask(question: str) -> str:
    return agent.run(question).content
# ---- end ----
print(ask("Where is order A1?"))
for s in sent: print({k: s.get(k) for k in ("spanType", "modelId", "toolName", "inputTokens", "outputTokens", "runId")})
