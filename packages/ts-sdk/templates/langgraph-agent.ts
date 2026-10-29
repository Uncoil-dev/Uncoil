import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { UncoilLangGraphHandler } from "uncoil-sdk";

const State = Annotation.Root({ question: Annotation<string>(), answer: Annotation<string>() });
const graph = new StateGraph(State)
  .addNode("answer", (state) => ({ answer: `You asked: ${state.question}` }))
  .addEdge(START, "answer")
  .addEdge("answer", END)
  .compile();

async function main() {
  const result = await graph.invoke({ question: "What is tracing?" }, { callbacks: [new UncoilLangGraphHandler()] });
  console.log(result.answer);
}
main();
