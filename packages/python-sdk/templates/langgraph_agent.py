from typing import TypedDict
from langgraph.graph import StateGraph, START, END
import uncoil


class State(TypedDict):
    question: str
    answer: str


graph = StateGraph(State)
graph.add_node("answer", lambda state: {"answer": f"You asked: {state['question']}"})
graph.add_edge(START, "answer")
graph.add_edge("answer", END)

result = graph.compile().invoke(
    {"question": "What is tracing?"},
    config={"callbacks": [uncoil.langgraph_callback()]},
)
print(result["answer"])
