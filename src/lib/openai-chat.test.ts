import assert from "node:assert/strict";
import test from "node:test";
import { buildOpenAiBody, friendlyOpenAiError, isReasoningModel, providerForKey } from "./openai-chat.ts";

test("gpt-5 and o-series count as reasoning models, gpt-4 models do not", () => {
  for (const model of ["gpt-5", "gpt-5-mini", "o1", "o3-mini", "o4-mini"]) assert.equal(isReasoningModel(model), true, model);
  for (const model of ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-nano", "omni-moderation-latest"]) assert.equal(isReasoningModel(model), false, model);
});
test("reasoning model detection ignores case", () => {
  assert.equal(isReasoningModel("GPT-5"), true);
  assert.equal(isReasoningModel("O3-Mini"), true);
  assert.equal(isReasoningModel("GPT-4o"), false);
});
test("each model gets only the token limit field it accepts", () => {
  for (const model of ["gpt-5", "o3-mini", "GPT-5"]) {
    const body = buildOpenAiBody(model, [], { maxOutputTokens: 64 });
    assert.equal(body.max_completion_tokens, 64, model);
    assert.equal("max_tokens" in body, false, model);
  }
  for (const model of ["gpt-4o", "gpt-4.1"]) {
    const body = buildOpenAiBody(model, [], { maxOutputTokens: 64 });
    assert.equal(body.max_tokens, 64, model);
    assert.equal("max_completion_tokens" in body, false, model);
  }
});

test("reasoning models drop temperature and use the completion cap", () => {
  const body = buildOpenAiBody("gpt-5.6-luna", [], { temperature: 0.2, maxOutputTokens: 100 });
  assert.equal(body.temperature, undefined);
  assert.equal(body.max_completion_tokens, 100);
  assert.equal(body.reasoning_effort, "low");
});
test("classic models keep temperature", () => {
  const body = buildOpenAiBody("gpt-4o-mini", [], { temperature: 0.2, maxOutputTokens: 100 });
  assert.equal(body.temperature, 0.2);
  assert.equal(body.max_tokens, 100);
  assert.equal(body.reasoning_effort, undefined);
});
test("rate limit and credit errors read plainly", () => {
  assert.match(friendlyOpenAiError(429, "Rate limit reached"), /50 per day/);
  assert.match(friendlyOpenAiError(429, "You exceeded your current quota"), /out of credit/);
});
test("key prefix picks provider", () => {
  assert.equal(providerForKey("sk-ant-abc"), "anthropic");
  assert.equal(providerForKey("sk-proj-abc"), "openai");
});
