import os; os.environ["UNCOIL_API_KEY"]="uncoil_sk_live_eu_test"
import uncoil
from uncoil import UncoilClient
class Rec(UncoilClient):
    def __init__(s): super().__init__(); s.sent=[]
    def _send_span(s, span): s.sent.append(span)
rec=Rec()
import uncoil as _u
_u.UncoilClient.__init__  # noqa
from langchain_core.language_models.fake_chat_models import FakeListChatModel
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.tools import tool
# ---- snippet ----
uncoil.init(client=rec)

prompt = ChatPromptTemplate.from_template("Answer briefly: {question}")
chain = prompt | FakeListChatModel(responses=["Fixed a login bug."]) | StrOutputParser()

result = chain.invoke(
    {"question": "What changed in the last release?"},
    
)
# ---- end ----
print(result)
for s in rec.sent: print({k:s.get(k) for k in ("spanType","name","toolName","modelId","parentSpanId","runId")})
