import type { IntegrationPage, IntegrationStep } from "./seo-pages";

/**
 * Setup guides for the providers and frameworks that do not have a hand-written page in seo-pages.ts.
 * Every snippet here is run against the real SDKs (mocked network) by scripts/check-integration-guides.
 * Where the SDK has no direct wrapper for a library, the guide says so and uses a manual step instead.
 */

const KEY_STEP: IntegrationStep = {
  title: "Set your project key",
  body: "Create a project in Uncoil, copy its API key and put it in the environment where your code runs. The SDK reads it from there, so nothing is hard-coded.",
  language: "bash",
  code: `export UNCOIL_API_KEY="uncoil_sk_live_..."`,
};

const verify = (name: string): IntegrationStep => ({
  title: "Run it once and look",
  body: `Run your code one time, then open the Tracing page of your project. ${name} shows up as a run with its steps in order, plus the tokens, time and any error for each call.`,
});

const COST_NOTE = {
  title: "About cost",
  body: "Uncoil records the tokens the provider returns. A dollar cost is shown when you give the wrapper your own rates with calculate_cost (Python) or calculateCost (TypeScript), so the number always matches your real price plan.",
};

const LABEL_NOTE = {
  title: "Shown with the OpenAI label",
  body: "The wrapper reads the OpenAI call format, so calls are labeled as OpenAI-style in the trace. The model name you send is always the one shown, so you can still tell models apart.",
};

const openAiCompatibleFaq = (name: string) => ({
  q: `Does tracing ${name} change my requests or responses?`,
  a: "No. The wrapper passes your call straight through and records a copy. Your request, the response and any error reach your code unchanged.",
});

export const integrationGuides: readonly IntegrationPage[] = [
  {
    slug: "langchain",
    name: "LangChain",
    title: "Trace LangChain chains and agents",
    description: "Trace LangChain chains, retrievers, tools and model calls in Uncoil with one callback handler, in Python or TypeScript.",
    answer: "To trace LangChain with Uncoil, pass the Uncoil callback handler in the callbacks list of your chain or agent. Every chain, model call and tool call becomes a span in one trace, with tokens and timing.",
    captures: ["One trace per chain or agent run", "Model calls with tokens and time to first token", "Tool calls with input and output", "Errors and retries in order"],
    language: "python",
    code: `import uncoil

chain.invoke(
    {"question": "What changed in the last release?"},
    config={"callbacks": [uncoil.langgraph_callback()]},
)`,
    steps: [
      { title: "Install", body: "The callback handler lives in an optional part of the Python SDK, so LangChain stays your only extra dependency.", language: "bash", code: `pip install "uncoil-sdk[langgraph]"` },
      KEY_STEP,
      { title: "Pass the handler to your chain", body: "Add it to the callbacks of any runnable: a chain, a retriever, an agent executor or a LangGraph graph. Child steps inherit it, so you only add it once at the top.", language: "python", code: `import uncoil

handler = uncoil.langgraph_callback()

result = agent_executor.invoke(
    {"input": "Summarize today's failed runs"},
    config={"callbacks": [handler]},
)` },
      { title: "Or in TypeScript", body: "The TypeScript SDK ships a matching handler. It needs no extra LangChain package of its own.", language: "typescript", code: `import { UncoilLangGraphHandler } from "uncoil-sdk";

const result = await chain.invoke(
  { question: "What changed in the last release?" },
  { callbacks: [new UncoilLangGraphHandler()] },
);` },
      verify("Your chain"),
    ],
    notes: [
      { title: "Same handler as LangGraph", body: "LangChain and LangGraph use the same callback system, so this is the same handler as on the LangGraph page. Use that page if you build graphs with several nodes." },
      { title: "Wrapping a run in your own step", body: "If you call the chain from inside an Uncoil run or step, the chain joins that run instead of starting a new one." },
    ],
    doc: "python",
    faq: [
      { q: "Do I need LangSmith to use this?", a: "No. The Uncoil handler is independent of LangSmith. You can run both side by side if you want." },
      { q: "Can I trace a LangChain agent that calls tools?", a: "Yes. Each tool call is its own span with its input, output and time, under the agent run that called it." },
      { q: "Does streaming still work?", a: "Yes. The handler sees each streamed token, so the time to first token is recorded for streamed model calls." },
      { q: "Which LangChain versions are supported?", a: "Python needs langchain-core 0.2 or newer. The TypeScript handler follows the LangChain callback shape and does not import LangChain, so it keeps working across versions." },
    ],
  },
  {
    slug: "google-gemini",
    name: "Google Gemini",
    title: "Trace Google Gemini API calls",
    description: "Monitor Gemini API calls in Uncoil: model, tokens, latency and errors, through Google's OpenAI-compatible endpoint or a manual step.",
    answer: "To trace Gemini with Uncoil, point the OpenAI client at Google's OpenAI-compatible endpoint and wrap it with the Uncoil SDK. If you use Google's own google-genai library, record each call as a step instead.",
    captures: ["Gemini model name", "Prompt and output token counts", "Latency and errors", "Calls grouped into the run that made them"],
    language: "python",
    code: `import os
import uncoil
from openai import OpenAI

gemini = uncoil.wrap_openai(OpenAI(
    api_key=os.environ["GEMINI_API_KEY"],
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
))

reply = gemini.chat.completions.create(
    model="gemini-2.5-flash",
    messages=[{"role": "user", "content": "Hello"}],
)`,
    steps: [
      { title: "Install", body: "Gemini speaks the OpenAI chat format on a compatible endpoint, so the OpenAI library is all you need.", language: "bash", code: `pip install uncoil-sdk openai` },
      KEY_STEP,
      { title: "Option A: the OpenAI-compatible endpoint", body: "Create the OpenAI client with your Gemini key and Google's compatible base URL, then wrap it. Calls to chat.completions are recorded automatically.", language: "python", code: `import os
import uncoil
from openai import OpenAI

gemini = uncoil.wrap_openai(OpenAI(
    api_key=os.environ["GEMINI_API_KEY"],
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
))

reply = gemini.chat.completions.create(
    model="gemini-2.5-flash",
    messages=[{"role": "user", "content": "Hello"}],
)` },
      { title: "Option B: Google's own google-genai library", body: "There is no automatic wrapper for google-genai yet, so record the call as a step and copy the token counts from the response. The model call is then still visible in the run, with its tokens and time.", language: "python", code: `import uncoil
from google import genai

client = genai.Client()

def ask(prompt: str) -> str:
    with uncoil.span("gemini", type="llm", input=prompt) as step:
        response = client.models.generate_content(
            model="gemini-2.5-flash", contents=prompt
        )
        usage = response.usage_metadata
        step.set(
            model="gemini-2.5-flash",
            input_tokens=usage.prompt_token_count,
            output_tokens=usage.candidates_token_count,
        )
        step.set_output(response.text)
        return response.text` },
      verify("Your Gemini call"),
    ],
    notes: [
      LABEL_NOTE,
      { title: "What is automatic and what is manual", body: "Option A is fully automatic. Option B is a few lines you write yourself, because the google-genai library is not wrapped by the SDK yet." },
      COST_NOTE,
    ],
    doc: "provider-integrations",
    faq: [
      openAiCompatibleFaq("Gemini"),
      { q: "Which Gemini models can I trace?", a: "Any model your key can call. Uncoil records the model name you pass, so new Gemini versions need no update on our side." },
      { q: "Can I trace Gemini inside a bigger agent?", a: "Yes. Wrap the agent entry point with trace_agent and the Gemini calls inside it join that run." },
    ],
  },
  {
    slug: "azure-openai",
    name: "Azure OpenAI",
    title: "Trace Azure OpenAI deployments",
    description: "Log and monitor Azure OpenAI calls in Uncoil: deployment, tokens, latency, content-filter errors and cost, in Python or TypeScript.",
    answer: "To trace Azure OpenAI with Uncoil, wrap the AzureOpenAI client from the OpenAI library. Each request is recorded with the deployment name, tokens, latency and any error, such as a content-filter block.",
    captures: ["Deployment name used for each call", "Token usage and latency", "Content-filter and rate-limit errors", "Calls grouped into the run that made them"],
    language: "python",
    code: `import uncoil
from openai import AzureOpenAI

azure = uncoil.wrap_openai(AzureOpenAI(
    azure_endpoint="https://your-resource.openai.azure.com",
    api_version="2024-10-21",
))

reply = azure.chat.completions.create(
    model="your-deployment-name",
    messages=[{"role": "user", "content": "Hello"}],
)`,
    steps: [
      { title: "Install", body: "Azure OpenAI uses the same library as OpenAI.", language: "bash", code: `pip install uncoil-sdk openai` },
      KEY_STEP,
      { title: "Wrap the Azure client", body: "AZURE_OPENAI_API_KEY is read by the OpenAI library as usual. The model you pass is your deployment name, and that is the name Uncoil records.", language: "python", code: `import uncoil
from openai import AzureOpenAI

azure = uncoil.wrap_openai(AzureOpenAI(
    azure_endpoint="https://your-resource.openai.azure.com",
    api_version="2024-10-21",
))

reply = azure.chat.completions.create(
    model="your-deployment-name",
    messages=[{"role": "user", "content": "Hello"}],
)` },
      { title: "Or in TypeScript", body: "Same idea with the AzureOpenAI class from the openai package.", language: "typescript", code: `import { AzureOpenAI } from "openai";
import { wrapOpenAI } from "uncoil-sdk";

const azure = wrapOpenAI(
  new AzureOpenAI({
    endpoint: "https://your-resource.openai.azure.com",
    apiVersion: "2024-10-21",
  }),
);

const reply = await azure.chat.completions.create({
  model: "your-deployment-name",
  messages: [{ role: "user", content: "Hello" }],
});` },
      verify("Your Azure call"),
    ],
    notes: [
      LABEL_NOTE,
      { title: "Deployment names are not model names", body: "On Azure you call your own deployment name, which can be anything. Uncoil shows that name. Because of that, give the wrapper your rates (see below) if you want a dollar cost per call." },
      COST_NOTE,
    ],
    doc: "provider-integrations",
    faq: [
      openAiCompatibleFaq("Azure OpenAI"),
      { q: "Will I see content-filter blocks?", a: "Yes. A blocked request raises an error in your code, and the same error is recorded on the span, so you can find every blocked call." },
      { q: "Does it work with managed identity instead of a key?", a: "Yes. Authentication is handled by the AzureOpenAI client you create. Uncoil only wraps the calls made through it." },
      { q: "Does the Responses API work too?", a: "Yes. The wrapper records chat.completions and responses calls." },
    ],
  },
  {
    slug: "aws-bedrock",
    name: "AWS Bedrock",
    title: "Trace AWS Bedrock model calls",
    description: "Monitor AWS Bedrock Converse calls in Uncoil with tokens, latency and errors, using a short manual step in Python or TypeScript.",
    answer: "To trace AWS Bedrock with Uncoil, record each Converse call as a step and copy the token counts from the response. Bedrock has no automatic wrapper in the SDK, so this is a few lines you write once.",
    captures: ["Model ID for each Bedrock call", "Input and output tokens from the Converse response", "Latency and throttling errors", "Calls grouped into the agent run"],
    language: "python",
    code: `import boto3
import uncoil

bedrock = boto3.client("bedrock-runtime")

def converse(model_id: str, prompt: str) -> str:
    with uncoil.span("bedrock-converse", type="llm", input=prompt) as step:
        response = bedrock.converse(
            modelId=model_id,
            messages=[{"role": "user", "content": [{"text": prompt}]}],
        )
        usage = response["usage"]
        text = response["output"]["message"]["content"][0]["text"]
        step.set(model=model_id, input_tokens=usage["inputTokens"], output_tokens=usage["outputTokens"])
        step.set_output(text)
        return text`,
    steps: [
      { title: "Install", body: "Nothing extra beyond boto3 and the Uncoil SDK.", language: "bash", code: `pip install uncoil-sdk boto3` },
      KEY_STEP,
      { title: "Record the Converse call as a step", body: "Open a step around the call, then copy the model and the token counts from the response. If Bedrock throws an error such as throttling, the step records it and the error still reaches your code.", language: "python", code: `import boto3
import uncoil

bedrock = boto3.client("bedrock-runtime")

def converse(model_id: str, prompt: str) -> str:
    with uncoil.span("bedrock-converse", type="llm", input=prompt) as step:
        response = bedrock.converse(
            modelId=model_id,
            messages=[{"role": "user", "content": [{"text": prompt}]}],
        )
        usage = response["usage"]
        text = response["output"]["message"]["content"][0]["text"]
        step.set(model=model_id, input_tokens=usage["inputTokens"], output_tokens=usage["outputTokens"])
        step.set_output(text)
        return text` },
      { title: "Or in TypeScript", body: "The same pattern with the AWS SDK for JavaScript.", language: "typescript", code: `import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { span } from "uncoil-sdk";

const bedrock = new BedrockRuntimeClient({});

export function converse(modelId: string, prompt: string) {
  return span(
    "bedrock-converse",
    async (step) => {
      const response = await bedrock.send(
        new ConverseCommand({
          modelId,
          messages: [{ role: "user", content: [{ text: prompt }] }],
        }),
      );
      step.set({
        model: modelId,
        inputTokens: response.usage?.inputTokens,
        outputTokens: response.usage?.outputTokens,
      });
      return response.output?.message?.content?.[0]?.text ?? "";
    },
    { type: "llm", input: prompt },
  );
}` },
      { title: "Group calls into one run", body: "Wrap your agent's entry point with trace_agent (Python) or traceAgent (TypeScript). Every Bedrock step made inside it joins the same trace, in order.", language: "python", code: `@uncoil.trace_agent(name="bedrock-agent")
def run(question: str):
    plan = converse("anthropic.claude-3-5-sonnet-20240620-v1:0", question)
    return converse("anthropic.claude-3-5-sonnet-20240620-v1:0", plan)` },
      verify("Your Bedrock call"),
    ],
    notes: [
      { title: "Manual, on purpose", body: "The SDK wraps the OpenAI and Anthropic client shapes. Bedrock uses a different API, so there is no one-line wrapper. The step above gives you the same fields with a few lines of your own." },
      { title: "Anthropic models on Bedrock", body: "If you call Claude through the Anthropic library's Bedrock client, you can wrap that client with wrap_anthropic instead and skip the manual step." },
      COST_NOTE,
    ],
    doc: "python",
    faq: [
      { q: "Can I trace Bedrock streaming calls?", a: "Yes, with the same step. Read the usage block that arrives in the final event of the stream and set the tokens when the stream ends." },
      { q: "Will I see throttling errors?", a: "Yes. An error raised inside the step is recorded on it, with its type and message, and then raised again to your code." },
      { q: "Do I need to change my IAM permissions?", a: "No. Uncoil never talks to AWS. It only receives what your code sends it." },
    ],
  },
  {
    slug: "groq",
    name: "Groq",
    title: "Trace Groq API calls",
    description: "Trace Groq chat completions in Uncoil: model, tokens, latency and errors, with the groq library or the OpenAI client.",
    answer: "To trace Groq with Uncoil, wrap the Groq client with the Uncoil SDK. Its chat.completions calls are recorded with the model, tokens, latency and any error. The OpenAI client pointed at Groq works the same way.",
    captures: ["Groq model name", "Prompt and completion tokens", "Latency, including streamed responses", "Rate-limit errors in order"],
    language: "python",
    code: `import uncoil
from groq import Groq

groq = uncoil.wrap_openai(Groq())

reply = groq.chat.completions.create(
    model="llama-3.3-70b-versatile",
    messages=[{"role": "user", "content": "Hello"}],
)`,
    steps: [
      { title: "Install", body: "Use Groq's own library, or the OpenAI one if you prefer.", language: "bash", code: `pip install uncoil-sdk groq` },
      KEY_STEP,
      { title: "Wrap the Groq client", body: "Groq's library has the same chat.completions shape as OpenAI's, so the OpenAI wrapper records it. GROQ_API_KEY is read by Groq's library as usual.", language: "python", code: `import uncoil
from groq import Groq

groq = uncoil.wrap_openai(Groq())

reply = groq.chat.completions.create(
    model="llama-3.3-70b-versatile",
    messages=[{"role": "user", "content": "Hello"}],
)` },
      { title: "Or use the OpenAI client", body: "Point the OpenAI library at Groq's compatible endpoint. In TypeScript this is the simplest route.", language: "typescript", code: `import OpenAI from "openai";
import { wrapOpenAI } from "uncoil-sdk";

const groq = wrapOpenAI(
  new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  }),
);

const reply = await groq.chat.completions.create({
  model: "llama-3.3-70b-versatile",
  messages: [{ role: "user", content: "Hello" }],
});` },
      verify("Your Groq call"),
    ],
    notes: [
      LABEL_NOTE,
      { title: "Fast models, many calls", body: "Groq is quick, so agents tend to make many calls. In the run you can see every call in order with its time, which makes slow tool steps stand out." },
      COST_NOTE,
    ],
    doc: "provider-integrations",
    faq: [
      openAiCompatibleFaq("Groq"),
      { q: "Does streaming work?", a: "Yes. The wrapper records streamed responses, including the time to first token, and the stream reaches your code unchanged." },
      { q: "Will rate-limit errors show up?", a: "Yes. A 429 from Groq is recorded on the call and raised again, so you can see exactly when you were limited." },
    ],
  },
  {
    slug: "ollama",
    name: "Ollama",
    title: "Trace local Ollama models",
    description: "Add observability to local Ollama models: trace each call with model, tokens and latency in Uncoil, using Ollama's OpenAI-compatible API.",
    answer: "To trace Ollama with Uncoil, use the OpenAI client pointed at Ollama's local /v1 endpoint and wrap it with the Uncoil SDK. Each local call is recorded with the model, tokens and latency.",
    captures: ["Local model name and tag", "Token counts reported by Ollama", "Latency per call, including slow cold starts", "Calls grouped into the agent run"],
    language: "python",
    code: `import uncoil
from openai import OpenAI

ollama = uncoil.wrap_openai(OpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama",
))

reply = ollama.chat.completions.create(
    model="llama3.2",
    messages=[{"role": "user", "content": "Hello"}],
)`,
    steps: [
      { title: "Make sure Ollama is running", body: "Start Ollama and pull a model once. The compatible API listens on port 11434.", language: "bash", code: `ollama pull llama3.2` },
      { title: "Install", body: "The OpenAI library talks to Ollama, so no Ollama-specific package is needed.", language: "bash", code: `pip install uncoil-sdk openai` },
      KEY_STEP,
      { title: "Wrap the client", body: "Ollama ignores the API key but the library wants one, so any text works.", language: "python", code: `import uncoil
from openai import OpenAI

ollama = uncoil.wrap_openai(OpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama",
))

reply = ollama.chat.completions.create(
    model="llama3.2",
    messages=[{"role": "user", "content": "Hello"}],
)` },
      { title: "Or in TypeScript", body: "Same endpoint, same wrapper.", language: "typescript", code: `import OpenAI from "openai";
import { wrapOpenAI } from "uncoil-sdk";

const ollama = wrapOpenAI(
  new OpenAI({ baseURL: "http://localhost:11434/v1", apiKey: "ollama" }),
);

const reply = await ollama.chat.completions.create({
  model: "llama3.2",
  messages: [{ role: "user", content: "Hello" }],
});` },
      verify("Your local call"),
    ],
    notes: [
      LABEL_NOTE,
      { title: "Your prompts leave your machine", body: "The model runs locally, but Uncoil is a hosted service, so the prompts and answers you record are sent to it. To keep content out, turn off input and output capture on the wrapper, or use the redaction options in the SDK." },
      { title: "Local models cost nothing per call", body: "Uncoil only shows a dollar cost when you pass your own rates. For local models you can leave it out, or put in an estimate of your hardware cost per token." },
    ],
    doc: "provider-integrations",
    faq: [
      openAiCompatibleFaq("Ollama"),
      { q: "Can I use Ollama's own Python library instead?", a: "Not through the wrapper. The wrapper covers OpenAI-style clients. With Ollama's own library, record the call as a step and copy the token counts from the response." },
      { q: "Why is my first call so slow?", a: "Ollama loads the model into memory on the first call. In the trace you will see that first call take much longer than the rest." },
    ],
  },
  {
    slug: "litellm",
    name: "LiteLLM",
    title: "Trace LiteLLM calls and proxy traffic",
    description: "Trace LiteLLM in Uncoil: wrap the OpenAI client you point at a LiteLLM proxy, or record litellm.completion calls as steps.",
    answer: "To trace LiteLLM with Uncoil, point an OpenAI client at your LiteLLM proxy and wrap it with the Uncoil SDK. If you call litellm.completion directly in Python, record the call as a step with its token usage.",
    captures: ["The model name you send through LiteLLM", "Token usage from the response", "Latency including provider fallbacks", "Calls grouped into the agent run"],
    language: "python",
    code: `import uncoil
from openai import OpenAI

llm = uncoil.wrap_openai(OpenAI(
    base_url="http://localhost:4000",
    api_key="your-litellm-key",
))

reply = llm.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello"}],
)`,
    steps: [
      { title: "Install", body: "For the proxy route you only need the OpenAI library.", language: "bash", code: `pip install uncoil-sdk openai` },
      KEY_STEP,
      { title: "Option A: through the LiteLLM proxy", body: "The LiteLLM proxy speaks the OpenAI format. Point your client at it and wrap that client. Every provider behind the proxy is traced the same way.", language: "python", code: `import uncoil
from openai import OpenAI

llm = uncoil.wrap_openai(OpenAI(
    base_url="http://localhost:4000",
    api_key="your-litellm-key",
))

reply = llm.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello"}],
)` },
      { title: "Option B: litellm.completion in your code", body: "The litellm function is not wrapped by the SDK, so record it as a step. LiteLLM returns usage in the OpenAI shape.", language: "python", code: `import litellm
import uncoil

def ask(model: str, prompt: str) -> str:
    messages = [{"role": "user", "content": prompt}]
    with uncoil.span("litellm", type="llm", input=messages) as step:
        response = litellm.completion(model=model, messages=messages)
        text = response.choices[0].message.content
        step.set(
            model=model,
            input_tokens=response.usage.prompt_tokens,
            output_tokens=response.usage.completion_tokens,
        )
        step.set_output(text)
        return text` },
      verify("Your LiteLLM call"),
    ],
    notes: [
      LABEL_NOTE,
      { title: "Fallbacks and the model name", body: "Uncoil records the model name you asked for. If LiteLLM falls back to another provider, the extra time shows up in the latency of that one call." },
      COST_NOTE,
    ],
    doc: "provider-integrations",
    faq: [
      openAiCompatibleFaq("LiteLLM"),
      { q: "LiteLLM already logs calls. Why add Uncoil?", a: "LiteLLM sees single model calls. Uncoil puts those calls inside the agent run that made them, next to your tool calls and decisions." },
      { q: "Does it work with the proxy in a team setup?", a: "Yes. Each service wraps its own client, so each one sends its own traces under its own project key." },
    ],
  },
  {
    slug: "openrouter",
    name: "OpenRouter",
    title: "Trace OpenRouter calls",
    description: "Monitor OpenRouter requests in Uncoil: which model answered, tokens, latency and errors, with the OpenAI client in Python or TypeScript.",
    answer: "To trace OpenRouter with Uncoil, point the OpenAI client at OpenRouter's base URL and wrap it with the Uncoil SDK. Each request is recorded with the model you chose, tokens, latency and any error.",
    captures: ["The model slug you requested", "Token usage and latency", "Provider errors and rate limits", "Calls grouped into the agent run"],
    language: "typescript",
    code: `import OpenAI from "openai";
import { wrapOpenAI } from "uncoil-sdk";

const openrouter = wrapOpenAI(
  new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
  }),
);

const reply = await openrouter.chat.completions.create({
  model: "anthropic/claude-sonnet-4.5",
  messages: [{ role: "user", content: "Hello" }],
});`,
    steps: [
      { title: "Install", body: "OpenRouter uses the OpenAI library.", language: "bash", code: `npm install uncoil-sdk openai` },
      KEY_STEP,
      { title: "Wrap the client", body: "Set OpenRouter's base URL and your OpenRouter key, then wrap the client.", language: "typescript", code: `import OpenAI from "openai";
import { wrapOpenAI } from "uncoil-sdk";

const openrouter = wrapOpenAI(
  new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
  }),
);

const reply = await openrouter.chat.completions.create({
  model: "anthropic/claude-sonnet-4.5",
  messages: [{ role: "user", content: "Hello" }],
});` },
      { title: "Or in Python", body: "The same two lines in Python.", language: "python", code: `import os
import uncoil
from openai import OpenAI

openrouter = uncoil.wrap_openai(OpenAI(
    api_key=os.environ["OPENROUTER_API_KEY"],
    base_url="https://openrouter.ai/api/v1",
))

reply = openrouter.chat.completions.create(
    model="anthropic/claude-sonnet-4.5",
    messages=[{"role": "user", "content": "Hello"}],
)` },
      verify("Your OpenRouter call"),
    ],
    notes: [
      LABEL_NOTE,
      { title: "Compare models in one place", body: "Because the model slug is recorded on every call, you can run the same agent on two models and compare their runs side by side in Uncoil." },
      COST_NOTE,
    ],
    doc: "provider-integrations",
    faq: [
      openAiCompatibleFaq("OpenRouter"),
      { q: "Does it record which provider OpenRouter used behind the scenes?", a: "Uncoil records what the response returns. The model name is always saved. Extra routing details are saved only when OpenRouter includes them in the response." },
      { q: "Do model names with a slash work?", a: "Yes. Slugs like anthropic/claude-sonnet-4.5 are stored exactly as you send them." },
    ],
  },
  {
    slug: "mistral",
    name: "Mistral",
    title: "Trace Mistral API calls",
    description: "Trace Mistral chat calls in Uncoil with tokens, latency and errors, using a short step around the mistralai library.",
    answer: "To trace Mistral with Uncoil, record each chat call as a step and copy the token counts from the response. The mistralai library is not wrapped automatically, so this is a few lines you add once.",
    captures: ["Mistral model name", "Prompt and completion tokens", "Latency and API errors", "Calls grouped into the agent run"],
    language: "python",
    code: `import os
import uncoil
from mistralai.client import Mistral

mistral = Mistral(api_key=os.environ["MISTRAL_API_KEY"])

def ask(prompt: str) -> str:
    messages = [{"role": "user", "content": prompt}]
    with uncoil.span("mistral-chat", type="llm", input=messages) as step:
        response = mistral.chat.complete(model="mistral-large-latest", messages=messages)
        text = response.choices[0].message.content
        step.set(
            model="mistral-large-latest",
            input_tokens=response.usage.prompt_tokens,
            output_tokens=response.usage.completion_tokens,
        )
        step.set_output(text)
        return text`,
    steps: [
      { title: "Install", body: "Mistral's official library plus the Uncoil SDK.", language: "bash", code: `pip install uncoil-sdk mistralai` },
      KEY_STEP,
      { title: "Record the call as a step", body: "Mistral's chat.complete is not the same shape as OpenAI's, so there is no one-line wrapper. Open a step around the call, then copy the model and tokens from the response. Errors are recorded and still reach your code.", language: "python", code: `import os
import uncoil
from mistralai.client import Mistral

mistral = Mistral(api_key=os.environ["MISTRAL_API_KEY"])

def ask(prompt: str) -> str:
    messages = [{"role": "user", "content": prompt}]
    with uncoil.span("mistral-chat", type="llm", input=messages) as step:
        response = mistral.chat.complete(model="mistral-large-latest", messages=messages)
        text = response.choices[0].message.content
        step.set(
            model="mistral-large-latest",
            input_tokens=response.usage.prompt_tokens,
            output_tokens=response.usage.completion_tokens,
        )
        step.set_output(text)
        return text` },
      { title: "Put it inside an agent run", body: "Wrap the function that drives your agent with trace_agent. All Mistral steps inside it join one trace.", language: "python", code: `@uncoil.trace_agent(name="mistral-agent")
def run(question: str) -> str:
    draft = ask(question)
    return ask("Improve this answer: " + draft)` },
      verify("Your Mistral call"),
    ],
    notes: [
      { title: "Manual, on purpose", body: "The SDK wraps the OpenAI and Anthropic client shapes. Mistral's library has its own, so you record the call yourself. It is the same data, a few lines longer." },
      COST_NOTE,
    ],
    doc: "python",
    faq: [
      { q: "Can I trace streaming with Mistral?", a: "Yes. Keep the step open while you read the stream, then set the tokens from the final chunk before the step ends." },
      { q: "Does it work with Mistral through Azure or Bedrock?", a: "Yes. Record the call as a step the same way. Only the client you call changes." },
      { q: "Is the TypeScript library supported?", a: "Yes, with the span function: open it around the call, set the model and tokens from the response, and return the text." },
    ],
  },
  {
    slug: "dspy",
    name: "DSPy",
    title: "Trace DSPy programs",
    description: "Trace DSPy modules and optimizer runs in Uncoil: one trace per program call, with the model calls inside it.",
    answer: "To trace DSPy with Uncoil, wrap the function that calls your DSPy program with trace_agent, and open a step around each module you want to see. Model calls made inside it stay in the same run.",
    captures: ["One trace per program call", "A step for each module you mark", "Inputs and outputs of each module", "Errors and slow modules in order"],
    language: "python",
    code: `import dspy
import uncoil

program = dspy.ChainOfThought("question -> answer")

@uncoil.trace_agent(name="dspy-qa")
def answer(question: str) -> str:
    with uncoil.span("chain-of-thought", type="agent", input=question) as step:
        result = program(question=question)
        step.set_output(result.answer)
        return result.answer`,
    steps: [
      { title: "Install", body: "DSPy and the Uncoil SDK.", language: "bash", code: `pip install uncoil-sdk dspy` },
      KEY_STEP,
      { title: "Wrap the program call", body: "trace_agent turns each call into one run. A step around the module shows its input and output inside that run.", language: "python", code: `import dspy
import uncoil

program = dspy.ChainOfThought("question -> answer")

@uncoil.trace_agent(name="dspy-qa")
def answer(question: str) -> str:
    with uncoil.span("chain-of-thought", type="agent", input=question) as step:
        result = program(question=question)
        step.set_output(result.answer)
        return result.answer` },
      { title: "Mark the modules you care about", body: "For a program with several modules, open a step in each one's forward method. The run then shows which module was slow or wrong.", language: "python", code: `class RAG(dspy.Module):
    def __init__(self):
        self.retrieve = dspy.Retrieve(k=3)
        self.generate = dspy.ChainOfThought("context, question -> answer")

    def forward(self, question):
        with uncoil.span("retrieve", type="retrieval", input=question) as step:
            context = self.retrieve(question).passages
            step.set_output(context)
        with uncoil.span("generate", type="llm", input=question):
            return self.generate(context=context, question=question)` },
      verify("Your DSPy program"),
    ],
    notes: [
      { title: "Steps, not model internals", body: "DSPy calls its language model through its own layer, so the SDK does not see each raw model request automatically. You see the modules you mark, with their inputs and outputs and timing." },
      { title: "Tracing during optimization", body: "Optimizers can run your program hundreds of times. Use the sample rate option on the client so you only keep a share of those runs." },
    ],
    doc: "python",
    faq: [
      { q: "Will I see the prompts DSPy builds?", a: "You see the input and output of each step you mark. The final prompt text built inside DSPy is not captured unless you record it yourself." },
      { q: "Can I trace an optimizer or evaluation run?", a: "Yes. Wrap the function that calls compile or evaluate with trace_agent. Lower the sample rate if it makes many calls." },
      { q: "Does it work with async DSPy programs?", a: "Yes. trace_agent and span work in async functions and keep concurrent runs in separate traces." },
    ],
  },
  {
    slug: "haystack",
    name: "Haystack",
    title: "Trace Haystack pipelines",
    description: "Trace Haystack pipelines in Uncoil: one run per pipeline call, with steps for retrieval, prompts and generation.",
    answer: "To trace Haystack with Uncoil, wrap the function that calls pipeline.run with trace_agent and open a step for the part you want to inspect. The run shows timing, inputs and outputs for each step.",
    captures: ["One trace per pipeline run", "Retrieval as its own step", "Generator output and timing", "Errors that stop a pipeline"],
    language: "python",
    code: `import uncoil

@uncoil.trace_agent(name="haystack-rag")
def answer(question: str) -> str:
    with uncoil.span("pipeline", type="agent", input=question) as step:
        result = pipeline.run({
            "retriever": {"query": question},
            "prompt_builder": {"question": question},
        })
        reply = result["llm"]["replies"][0]
        step.set_output(reply)
        return reply`,
    steps: [
      { title: "Install", body: "Haystack and the Uncoil SDK.", language: "bash", code: `pip install uncoil-sdk haystack-ai` },
      KEY_STEP,
      { title: "Wrap the pipeline call", body: "One function, one run. The step shows the whole pipeline as a single timed block with its input and the reply.", language: "python", code: `import uncoil

@uncoil.trace_agent(name="haystack-rag")
def answer(question: str) -> str:
    with uncoil.span("pipeline", type="agent", input=question) as step:
        result = pipeline.run({
            "retriever": {"query": question},
            "prompt_builder": {"question": question},
        })
        reply = result["llm"]["replies"][0]
        step.set_output(reply)
        return reply` },
      { title: "Split out retrieval", body: "To see retrieval separately from generation, run the retriever on its own inside its own step.", language: "python", code: `@uncoil.trace_agent(name="haystack-split")
def answer(question: str) -> str:
    with uncoil.span("retrieve", type="retrieval", input=question) as step:
        docs = retriever.run(query=question)["documents"]
        step.set_output([d.content[:200] for d in docs])
    with uncoil.span("generate", type="llm", input=question) as step:
        out = generator.run(prompt=build_prompt(question, docs))
        step.set_output(out["replies"][0])
        return out["replies"][0]` },
      verify("Your pipeline"),
    ],
    notes: [
      { title: "Per-component spans are not automatic", body: "The SDK does not hook into every Haystack component by itself. You decide which parts are worth a step, and each step you add shows up in the run." },
    ],
    doc: "python",
    faq: [
      { q: "Can I see which documents the retriever returned?", a: "Yes. Set the step's output to the documents, or a short preview of each, and open it in the trace." },
      { q: "Does it work with Haystack agents that use tools?", a: "Yes. Wrap the agent call with trace_agent and open a step in each tool function so every tool call appears in order." },
      { q: "Is the model call itself recorded?", a: "If your generator uses an OpenAI-style client that you create and wrap, yes. Otherwise record it with a step and set the tokens from the reply metadata." },
    ],
  },
  {
    slug: "semantic-kernel",
    name: "Semantic Kernel",
    title: "Trace Semantic Kernel agents",
    description: "Trace Semantic Kernel functions and agents in Python with Uncoil: one run per invocation, with steps for each function.",
    answer: "To trace Semantic Kernel with Uncoil in Python, wrap the invocation with trace_agent and open a step around the kernel function or agent call. Plugins you mark show up as steps in order.",
    captures: ["One trace per kernel invocation", "A step for each function or plugin you mark", "Inputs, outputs and timing", "Errors in order"],
    language: "python",
    code: `import uncoil

@uncoil.trace_agent(name="sk-assistant")
async def ask(question: str) -> str:
    with uncoil.span("kernel-invoke", type="agent", input=question) as step:
        result = await kernel.invoke(plugin_name="chat", function_name="answer", question=question)
        step.set_output(str(result))
        return str(result)`,
    steps: [
      { title: "Install", body: "The Python flavor of Semantic Kernel and the Uncoil SDK.", language: "bash", code: `pip install uncoil-sdk semantic-kernel` },
      KEY_STEP,
      { title: "Wrap the invocation", body: "Semantic Kernel is async. trace_agent and span both work in async functions.", language: "python", code: `import uncoil

@uncoil.trace_agent(name="sk-assistant")
async def ask(question: str) -> str:
    with uncoil.span("kernel-invoke", type="agent", input=question) as step:
        result = await kernel.invoke(plugin_name="chat", function_name="answer", question=question)
        step.set_output(str(result))
        return str(result)` },
      { title: "Show plugin calls", body: "A kernel function decorator is the best place for a step, because every call through it is then recorded wherever it comes from.", language: "python", code: `from semantic_kernel.functions import kernel_function

class OrdersPlugin:
    @kernel_function(description="Look up an order by id")
    async def lookup(self, order_id: str) -> str:
        with uncoil.span("orders.lookup", type="tool", input=order_id) as step:
            status = await orders_api.status(order_id)
            step.set_output(status)
            return status` },
      verify("Your kernel call"),
    ],
    notes: [
      { title: "Python only for now", body: "The Uncoil SDKs are available for Python and TypeScript. For Semantic Kernel in .NET or Java, you can send traces to the Uncoil API directly." },
      { title: "Model calls", body: "Semantic Kernel calls models through its own connectors, so those requests are not wrapped automatically. Mark the function that makes them and you get its timing and output." },
    ],
    doc: "python",
    faq: [
      { q: "Does Uncoil read Semantic Kernel's OpenTelemetry output?", a: "Uncoil accepts OTLP over HTTP with JSON. Many OpenTelemetry exporters send protobuf by default, so check your exporter's protocol before relying on it." },
      { q: "Can I trace planners and multi-step agents?", a: "Yes. Wrap the planner or agent call, and add a step to each plugin function it can call." },
      { q: "Does it work with async kernels?", a: "Yes. Concurrent invocations are kept in separate traces." },
    ],
  },
  {
    slug: "smolagents",
    name: "smolagents",
    title: "Trace Hugging Face smolagents",
    description: "Trace smolagents CodeAgent and ToolCallingAgent runs in Uncoil: one trace per task, with your tools as steps.",
    answer: "To trace smolagents with Uncoil, wrap the call to agent.run with trace_agent and add a step to each tool. You get one trace per task, with every tool call in the order the agent made it.",
    captures: ["One trace per agent.run task", "Each tool call with input and output", "Failures and retries", "Total time for the task"],
    language: "python",
    code: `import uncoil
from smolagents import CodeAgent, InferenceClientModel, tool

@tool
def get_weather(city: str) -> str:
    """Return the weather for a city.

    Args:
        city: Name of the city.
    """
    with uncoil.span("get_weather", type="tool", input=city) as step:
        forecast = f"Sunny in {city}"
        step.set_output(forecast)
        return forecast

agent = CodeAgent(tools=[get_weather], model=InferenceClientModel())

@uncoil.trace_agent(name="smolagent")
def run(task: str):
    return agent.run(task)`,
    steps: [
      { title: "Install", body: "smolagents and the Uncoil SDK.", language: "bash", code: `pip install uncoil-sdk smolagents` },
      KEY_STEP,
      { title: "Wrap agent.run", body: "Each task becomes one run. Everything recorded inside while the agent works joins it.", language: "python", code: `import uncoil

@uncoil.trace_agent(name="smolagent")
def run(task: str):
    return agent.run(task)` },
      { title: "Put a step in each tool", body: "The agent decides which tools to call. A step in each tool function shows exactly which ones it called, with what, and what came back.", language: "python", code: `from smolagents import tool

@tool
def get_weather(city: str) -> str:
    """Return the weather for a city.

    Args:
        city: Name of the city.
    """
    with uncoil.span("get_weather", type="tool", input=city) as step:
        forecast = f"Sunny in {city}"
        step.set_output(forecast)
        return forecast` },
      verify("Your agent task"),
    ],
    notes: [
      { title: "Code agents write code", body: "A CodeAgent runs Python it writes itself. The tool calls it makes still go through your tool functions, so they are recorded. The code the model wrote is not captured by these steps." },
      { title: "Model calls", body: "smolagents has its own model classes, so those requests are not wrapped automatically. If your model class uses an OpenAI-style client that you create, wrap that client and the calls join the run." },
    ],
    doc: "python",
    faq: [
      { q: "Does it work with ToolCallingAgent too?", a: "Yes. The same two things apply: wrap agent.run and add a step to each tool." },
      { q: "Can I see why an agent looped?", a: "Yes. Repeated tool calls appear one after another in the run, so a loop is easy to spot." },
      { q: "Does it work with multi-agent setups?", a: "Yes. Call the managed agents from inside the run and put a step in their entry point so each one is visible." },
    ],
  },
  {
    slug: "nextjs",
    name: "Next.js",
    title: "Trace Next.js AI routes and Server Actions",
    description: "Add tracing to Next.js AI features: route handlers, Server Actions, streaming and tool calls, with the Vercel AI SDK and Uncoil.",
    answer: "To trace a Next.js AI route with Uncoil, wrap the handler's work with traceAgent, wrap the model with the Uncoil middleware, and wrap your tools. Each request becomes one trace with its model calls and tool calls.",
    captures: ["One trace per request to your AI route", "Streaming generations with time to first token", "Tool calls with input and output", "Errors thrown inside the handler"],
    language: "typescript",
    code: `// app/api/chat/route.ts
import { openai } from "@ai-sdk/openai";
import { streamText, wrapLanguageModel } from "ai";
import { traceAgent, uncoilMiddleware } from "uncoil-sdk";

export const runtime = "nodejs";

const model = wrapLanguageModel({ model: openai("gpt-4o-mini"), middleware: uncoilMiddleware() });

const handle = traceAgent(async (prompt: string) => {
  const result = streamText({ model, prompt });
  return result.toTextStreamResponse();
}, { name: "chat-route" });

export async function POST(request: Request) {
  const { prompt } = await request.json();
  return handle(prompt);
}`,
    steps: [
      { title: "Install", body: "The Uncoil SDK plus the Vercel AI SDK and a provider.", language: "bash", code: `npm install uncoil-sdk ai @ai-sdk/openai` },
      { title: "Add your key", body: "Put the key in .env.local for development and in your Vercel project settings for production.", language: "bash", code: `UNCOIL_API_KEY=uncoil_sk_live_...` },
      { title: "Use the Node.js runtime", body: "The SDK needs Node.js to keep concurrent requests in separate traces, so set the route to the Node.js runtime. It will not run on the edge runtime.", language: "typescript", code: `export const runtime = "nodejs";` },
      { title: "Wrap the model and the handler", body: "uncoilMiddleware records every generateText and streamText call made with the wrapped model. traceAgent turns each request into one run.", language: "typescript", code: `// app/api/chat/route.ts
import { openai } from "@ai-sdk/openai";
import { streamText, wrapLanguageModel } from "ai";
import { traceAgent, uncoilMiddleware } from "uncoil-sdk";

export const runtime = "nodejs";

const model = wrapLanguageModel({
  model: openai("gpt-4o-mini"),
  middleware: uncoilMiddleware(),
});

const handle = traceAgent(async (prompt: string) => {
  const result = streamText({ model, prompt });
  return result.toTextStreamResponse();
}, { name: "chat-route" });

export async function POST(request: Request) {
  const { prompt } = await request.json();
  return handle(prompt);
}` },
      { title: "Add tool calls", body: "traceTools wraps each tool's execute function, so every tool call is its own step with input, output and time.", language: "typescript", code: `import { tool } from "ai";
import { z } from "zod";
import { traceTools } from "uncoil-sdk";

const tools = traceTools({
  getOrder: tool({
    description: "Look up an order",
    inputSchema: z.object({ id: z.string() }),
    execute: async ({ id }) => fetchOrder(id),
  }),
});` },
      verify("Your route"),
    ],
    notes: [
      { title: "Streaming and serverless", body: "A streamed model call is recorded when its stream ends. Data is sent in the background, so on a serverless host the last spans of a request can be lost if the function is frozen right after it responds. Check the first runs in Tracing after you deploy." },
      { title: "Server Actions", body: "Wrap the function the Server Action calls with traceAgent the same way. Anything marked use server runs on Node.js." },
    ],
    doc: "typescript",
    faq: [
      { q: "Does it work on the edge runtime?", a: "No. The SDK uses Node.js async context, so set the route to the Node.js runtime." },
      { q: "Do I need the Vercel AI SDK?", a: "No. You can use traceAgent with any model client, and wrap OpenAI or Anthropic clients directly. The AI SDK middleware is the shortest route when you already use it." },
      { q: "Does it work with the App Router and Server Actions?", a: "Yes. Both run on Node.js, so wrap the function they call with traceAgent." },
      { q: "Will it slow down my route?", a: "The TypeScript SDK sends data in the background and does not wait for Uncoil. If Uncoil cannot be reached, it logs a warning and your route keeps running." },
    ],
  },
];
