import { type IntegrationOptions } from "./observation";
/** Structural LangChain/LangGraph callback handler; no mandatory framework dependency for SDK users. */
export declare class UncoilLangGraphHandler {
    private options;
    name: string;
    lc_serializable: boolean;
    raiseError: boolean;
    awaitHandlers: boolean;
    private runs;
    constructor(options?: IntegrationOptions);
    private start;
    private end;
    handleChainStart(chain: any, input: unknown, id: string, parent?: string, _tags?: string[], _metadata?: any, _type?: string, name?: string): void;
    handleChainEnd(output: unknown, id: string): void;
    handleChainError(error: unknown, id: string): void;
    handleToolStart(tool: any, input: unknown, id: string, parent?: string, _tags?: string[], _metadata?: any, name?: string): void;
    handleToolEnd(output: unknown, id: string): void;
    handleToolError(error: unknown, id: string): void;
    handleLLMStart(llm: any, input: unknown, id: string, parent?: string, extra?: any): void;
    handleChatModelStart(llm: any, messages: unknown, id: string, parent?: string, extra?: any): void;
    handleLLMNewToken(_token: string, _idx: unknown, id: string): void;
    handleLLMEnd(output: any, id: string): void;
    handleLLMError(error: unknown, id: string): void;
}
