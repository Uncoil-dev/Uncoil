import { coreAnswers } from "./core";
import { trackAgentCosts } from "./entries/track-ai-agent-costs";
import { debugFailingAgentRun } from "./entries/debug-failing-ai-agent-run";
import { whatIsAgentObservability } from "./entries/what-is-ai-agent-observability";
import { findCostliestCall } from "./entries/find-costliest-tool-or-model-call";
import { addTracingToAgent } from "./entries/add-tracing-to-openai-or-langgraph-agent";
import { freeOpenSourceMonitoring } from "./entries/free-open-source-ai-agent-monitoring";
import type { Answer } from "./types";

export type { Answer };

/**
 * Registry of answer pages. To add one, create a file in ./entries that exports
 * an Answer, then import it and add it to this list.
 */
export const answers: readonly Answer[] = [...coreAnswers, trackAgentCosts, debugFailingAgentRun, whatIsAgentObservability, findCostliestCall, addTracingToAgent, freeOpenSourceMonitoring];
