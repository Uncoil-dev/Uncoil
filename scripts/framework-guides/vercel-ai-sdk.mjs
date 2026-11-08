import http from "node:http";
const got = [];
const srv = http.createServer((req, res) => { let b=""; req.on("data", d=>b+=d); req.on("end", ()=>{ try{ got.push(JSON.parse(b)); }catch{} res.writeHead(200,{"content-type":"application/json"}); res.end("{}"); }); });
await new Promise(r => srv.listen(0, r));
process.env.UNCOIL_API_KEY = "uncoil_sk_live_eu_test";
process.env.UNCOIL_HOST = `http://127.0.0.1:${srv.address().port}`;
process.env.OPENAI_API_KEY = "t";
const { createOpenAI } = await import("@ai-sdk/openai");
const fakeFetch = async (url, init) => {
  const body = JSON.parse(init.body);
  if (!fakeFetch.n) { fakeFetch.n = 1; return new Response(JSON.stringify({ id:"1", object:"chat.completion", created:1, model:"gpt-4o-mini", choices:[{index:0,finish_reason:"tool_calls",message:{role:"assistant",content:null,tool_calls:[{id:"c1",type:"function",function:{name:"getOrder",arguments:'{"id":"A1"}'}}]}}], usage:{prompt_tokens:8,completion_tokens:3,total_tokens:11}}), {headers:{"content-type":"application/json"}}); }
  return new Response(JSON.stringify({ id:"2", object:"chat.completion", created:1, model:"gpt-4o-mini", choices:[{index:0,finish_reason:"stop",message:{role:"assistant",content:"Shipped."}}], usage:{prompt_tokens:20,completion_tokens:2,total_tokens:22}}), {headers:{"content-type":"application/json"}});
};
const openai = createOpenAI({ apiKey: "t", fetch: fakeFetch });
// ---- snippet ----
import { generateText, wrapLanguageModel, tool, stepCountIs } from "ai";
import { z } from "zod";
import { traceAgent, traceTools, uncoilMiddleware } from "@uncoil.dev/sdk";

const model = wrapLanguageModel({
  model: openai.chat("gpt-4o-mini"),
  middleware: uncoilMiddleware(),
});

const tools = traceTools({
  getOrder: tool({
    description: "Look up an order",
    inputSchema: z.object({ id: z.string() }),
    execute: async ({ id }) => ({ id, status: "shipped" }),
  }),
});

const answer = traceAgent(async (question) => {
  const { text } = await generateText({ model, tools, stopWhen: stepCountIs(5), prompt: question });
  return text;
}, { name: "order-bot" });

console.log(await answer("Where is order A1?"));
// ---- end ----
await new Promise(r=>setTimeout(r,1500));
for (const g of got.flat()) console.log(g.spanType, g.modelId, g.toolName, g.inputTokens, g.outputTokens, g.runId?.slice(0,6), g.parentSpanId?.slice(0,6));
srv.close(); process.exit(0);
