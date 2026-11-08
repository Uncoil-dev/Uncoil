import os, threading, json
from http.server import BaseHTTPRequestHandler, HTTPServer
CHAT = dict(id='c', object='chat.completion', created=1, model='gpt-4o-mini', choices=[dict(index=0, message=dict(role='assistant', content='Thought: I now can give a great answer\nFinal Answer: Uncoil traces agents.'), finish_reason='stop')], usage=dict(prompt_tokens=8, completion_tokens=3, total_tokens=11))
R=iter(['Thought: need facts\nAction: web_search\nAction Input: {"query": "Uncoil"}', 'Thought: I now can give a great answer\nFinal Answer: Uncoil traces agents.'])
class H(BaseHTTPRequestHandler):
    def do_POST(s):
        s.rfile.read(int(s.headers.get('content-length', 0)))
        c=next(R)
        m=CHAT['choices'][0]['message']
        if 'Action:' in c:
            m.update(content=None, tool_calls=[dict(id='c1', type='function', function=dict(name='web_search', arguments='{"query": "Uncoil"}'))]); CHAT['choices'][0]['finish_reason']='tool_calls'
        else:
            m.pop('tool_calls', None); m['content']='Final Answer: Uncoil traces agents.'; CHAT['choices'][0]['finish_reason']='stop'
        b = json.dumps(CHAT).encode(); s.send_response(200); s.send_header('content-type','application/json'); s.send_header('content-length', str(len(b))); s.end_headers(); s.wfile.write(b)
    def log_message(*a): pass
srv = HTTPServer(("127.0.0.1", 0), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
os.environ.update(UNCOIL_API_KEY="uncoil_sk_live_eu_test", OPENAI_API_KEY="t", OPENAI_BASE_URL=f"http://127.0.0.1:{srv.server_port}/v1", CREWAI_DISABLE_TELEMETRY="true", OTEL_SDK_DISABLED="true")
import uncoil
from uncoil import UncoilClient
class Rec(UncoilClient):
    def __init__(s): super().__init__(); s.sent=[]
    def _send_span(s, span): s.sent.append(span)
rec = Rec()
# ---- snippet ----
from crewai import Agent, Task, Crew
from crewai.tools import tool

uncoil.init(client=rec)

def search(query: str) -> str:
    """Search the web."""
    return "Uncoil is an agent observability platform."

# Wrap the function first, then hand it to CrewAI.
traced = uncoil.trace_tools({"web_search": search}, client=rec)
web_search = tool("web_search")(traced["web_search"])

researcher = Agent(role="Researcher", goal="Find facts", backstory="You research.", llm="gpt-4o-mini", tools=[web_search])
task = Task(description="Research {topic}", expected_output="One sentence", agent=researcher)
crew = Crew(agents=[researcher], tasks=[task])

@uncoil.trace_agent(name="research-crew", client=rec)
def run_crew(topic: str):
    return crew.kickoff(inputs={"topic": topic})
# ---- end ----
print(run_crew("Uncoil"))
for s in rec.sent: print({k:v for k,v in s.items() if k.endswith("Tokens") or k=="spanType"})
