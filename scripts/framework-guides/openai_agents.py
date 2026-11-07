import asyncio, httpx2 as httpx, os
os.environ["UNCOIL_API_KEY"]="uncoil_sk_live_eu_test"
import uncoil
from uncoil import UncoilClient
from openai import AsyncOpenAI
from agents import function_tool, Agent, Runner, set_default_openai_client, set_tracing_disabled

RESP = dict(id="resp_1", object="response", created_at=1, model="m", status="completed", output=[dict(id="msg_1", type="message", role="assistant", status="completed", content=[dict(type="output_text", text="Refund approved.", annotations=[])])], parallel_tool_calls=True, tool_choice="auto", tools=[], usage=dict(input_tokens=8, output_tokens=3, total_tokens=11, input_tokens_details=dict(cached_tokens=0), output_tokens_details=dict(reasoning_tokens=0)))
class Rec(UncoilClient):
    def __init__(s): super().__init__(); s.sent=[]
    def _send_span(s, span): s.sent.append(span)
rec = Rec()
set_tracing_disabled(True)
CALL = dict(RESP, id="resp_0", output=[dict(id="fc_1", type="function_call", call_id="c1", name="lookup_order", arguments='{"order_id": "A1"}', status="completed")])
calls = iter([CALL, RESP])
set_default_openai_client(AsyncOpenAI(api_key="t", http_client=httpx.AsyncClient(transport=httpx.MockTransport(lambda r: httpx.Response(200, json=next(calls), request=r)))))

# ---- snippet ----
uncoil.init(client=rec)
def lookup_order(order_id: str) -> str:
    """Look up an order by id."""
    return "shipped"

lookup_order = function_tool(uncoil.trace_tools({"lookup_order": lookup_order}, client=rec)["lookup_order"])

agent = Agent(name="Support", instructions="Be brief.", model="gpt-4o-mini", tools=[lookup_order])

@uncoil.trace_agent(name="support-triage", client=rec)
async def triage(message: str):
    result = await Runner.run(agent, message)
    return result.final_output
# ---- end ----
print(asyncio.run(triage("refund?")))
for s in rec.sent: print({k:s.get(k) for k in ("spanType","name","modelId","toolName","inputTokens","outputTokens","parentSpanId","runId")})
