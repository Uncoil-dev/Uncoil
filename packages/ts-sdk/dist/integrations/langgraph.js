"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UncoilLangGraphHandler = void 0;
const index_1 = require("../index");
const observation_1 = require("./observation");
/** Structural LangChain/LangGraph callback handler; no mandatory framework dependency for SDK users. */
class UncoilLangGraphHandler {
    constructor(options = {}) {
        this.options = options;
        this.name = "uncoil";
        this.lc_serializable = false;
        this.raiseError = false;
        this.awaitHandlers = true;
        this.runs = new Map();
    }
    start(type, name, input, id, parent, model = "") {
        if (this.runs.has(id))
            return;
        const ancestor = parent ? this.runs.get(parent) : undefined;
        const context = (0, index_1.currentTraceContext)();
        const outer = !ancestor && context?.runId && context.runId !== "unknown" ? context : undefined;
        this.runs.set(id, (0, observation_1.observation)("langgraph", model, input, this.options, {
            runId: ancestor?.runId ?? outer?.runId ?? id,
            parentSpanId: ancestor?.id ?? outer?.spanId,
            spanId: id,
            root: !ancestor && !outer,
            type,
            name,
        }));
    }
    end(id, output, error) {
        const run = this.runs.get(id);
        if (!run)
            return;
        run.finish(output, error);
        this.runs.delete(id);
    }
    handleChainStart(chain, input, id, parent, _tags, _metadata, _type, name) {
        this.start("agent", name ?? chain?.name ?? chain?.id?.at(-1) ?? "graph", input, id, parent);
    }
    handleChainEnd(output, id) {
        this.end(id, output);
    }
    handleChainError(error, id) {
        this.end(id, undefined, error);
    }
    handleToolStart(tool, input, id, parent, _tags, _metadata, name) {
        this.start("tool_call", name ?? tool?.name ?? tool?.id?.at(-1) ?? "tool", input, id, parent);
    }
    handleToolEnd(output, id) {
        this.end(id, output);
    }
    handleToolError(error, id) {
        this.end(id, undefined, error);
    }
    handleLLMStart(llm, input, id, parent, extra) {
        this.start("llm_call", extra?.invocation_params?.model ?? llm?.name ?? "model", input, id, parent, extra?.invocation_params?.model ?? "");
    }
    handleChatModelStart(llm, messages, id, parent, extra) {
        this.handleLLMStart(llm, messages, id, parent, extra);
    }
    handleLLMNewToken(_token, _idx, id) {
        this.runs.get(id)?.token();
    }
    handleLLMEnd(output, id) {
        const run = this.runs.get(id);
        const generation = output?.generations?.[0]?.[0];
        const usage = output?.llmOutput?.tokenUsage ?? generation?.message?.usage_metadata;
        if (usage)
            run?.usage({
                input_tokens: usage.input_tokens ?? usage.promptTokens,
                output_tokens: usage.output_tokens ?? usage.completionTokens,
            });
        this.end(id, output);
    }
    handleLLMError(error, id) {
        this.end(id, undefined, error);
    }
}
exports.UncoilLangGraphHandler = UncoilLangGraphHandler;
