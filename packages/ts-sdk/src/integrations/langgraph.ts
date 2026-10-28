import { currentTraceContext } from "../index";
import {
  observation,
  type Observation,
  type IntegrationOptions,
} from "./observation";
/** Structural LangChain/LangGraph callback handler; no mandatory framework dependency for SDK users. */
export class UncoilLangGraphHandler {
  name = "uncoil";
  lc_serializable = false;
  raiseError = false;
  awaitHandlers = true;
  private runs = new Map<string, Observation>();
  constructor(private options: IntegrationOptions = {}) {}
  private start(
    type: string,
    name: string,
    input: unknown,
    id: string,
    parent?: string,
    model = "",
  ) {
    if (this.runs.has(id)) return;
    const ancestor = parent ? this.runs.get(parent) : undefined;
    const context = currentTraceContext();
    const outer = !ancestor && context?.runId && context.runId !== "unknown" ? context : undefined;
    this.runs.set(
      id,
      observation("langgraph", model, input, this.options, {
        runId: ancestor?.runId ?? outer?.runId ?? id,
        parentSpanId: ancestor?.id ?? outer?.spanId,
        spanId: id,
        root: !ancestor && !outer,
        type,
        name,
      }),
    );
  }
  private end(id: string, output?: unknown, error?: unknown) {
    const run = this.runs.get(id);
    if (!run) return;
    run.finish(output, error);
    this.runs.delete(id);
  }
  handleChainStart(
    chain: any,
    input: unknown,
    id: string,
    parent?: string,
    _tags?: string[],
    _metadata?: any,
    _type?: string,
    name?: string,
  ) {
    this.start(
      "agent",
      name ?? chain?.name ?? chain?.id?.at(-1) ?? "graph",
      input,
      id,
      parent,
    );
  }
  handleChainEnd(output: unknown, id: string) {
    this.end(id, output);
  }
  handleChainError(error: unknown, id: string) {
    this.end(id, undefined, error);
  }
  handleToolStart(
    tool: any,
    input: unknown,
    id: string,
    parent?: string,
    _tags?: string[],
    _metadata?: any,
    name?: string,
  ) {
    this.start(
      "tool_call",
      name ?? tool?.name ?? tool?.id?.at(-1) ?? "tool",
      input,
      id,
      parent,
    );
  }
  handleToolEnd(output: unknown, id: string) {
    this.end(id, output);
  }
  handleToolError(error: unknown, id: string) {
    this.end(id, undefined, error);
  }
  handleLLMStart(
    llm: any,
    input: unknown,
    id: string,
    parent?: string,
    extra?: any,
  ) {
    this.start(
      "llm_call",
      extra?.invocation_params?.model ?? llm?.name ?? "model",
      input,
      id,
      parent,
      extra?.invocation_params?.model ?? "",
    );
  }
  handleChatModelStart(
    llm: any,
    messages: unknown,
    id: string,
    parent?: string,
    extra?: any,
  ) {
    this.handleLLMStart(llm, messages, id, parent, extra);
  }
  handleLLMNewToken(_token: string, _idx: unknown, id: string) {
    this.runs.get(id)?.token();
  }
  handleLLMEnd(output: any, id: string) {
    const run = this.runs.get(id);
    const generation = output?.generations?.[0]?.[0];
    const usage =
      output?.llmOutput?.tokenUsage ?? generation?.message?.usage_metadata;
    if (usage)
      run?.usage({
        input_tokens: usage.input_tokens ?? usage.promptTokens,
        output_tokens: usage.output_tokens ?? usage.completionTokens,
      });
    this.end(id, output);
  }
  handleLLMError(error: unknown, id: string) {
    this.end(id, undefined, error);
  }
}
