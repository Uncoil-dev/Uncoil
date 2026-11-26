// A Vercel AI SDK agent with one tool, traced in Uncoil as one run.
//
// npm install @uncoil.dev/sdk ai @ai-sdk/openai zod
// Set UNCOIL_API_KEY and OPENAI_API_KEY, then run this file.
import { generateText, stepCountIs, tool, wrapLanguageModel } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { traceAgent, traceTools, uncoilMiddleware } from "@uncoil.dev/sdk";

// Every call made with this model is recorded with its tokens, time and errors.
const model = wrapLanguageModel({ model: openai("gpt-4o-mini"), middleware: uncoilMiddleware() });

// traceTools records each tool call as its own step, with its input and output.
const tools = traceTools({
  getOrder: tool({
    description: "Look up an order by id",
    inputSchema: z.object({ id: z.string() }),
    execute: async ({ id }) => ({ id, status: "shipped yesterday" }),
  }),
});

// traceAgent groups the model calls and tool calls of one question into one run.
const answer = traceAgent(async (question: string) => {
  const { text } = await generateText({ model, tools, stopWhen: stepCountIs(5), prompt: question });
  return text;
}, { name: "order-bot" });

answer("Where is order A1?").then(console.log);
