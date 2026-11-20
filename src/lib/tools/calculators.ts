/** Pure maths for the context window checker, price comparison and rate limit calculator. */

import { callCost, models, type Model } from "./models.ts";

// ------------------------------------------------------------ context fit

export type FitStatus = "fits" | "tight" | "too-big";

export type FitRow = {
  model: Model;
  promptTokens: number;
  reservedOutput: number;
  /** Prompt plus the reply you want to leave room for. */
  needed: number;
  /** Share of the window used, 0 to 1 and beyond when it does not fit. */
  used: number;
  free: number;
  status: FitStatus;
  /** Number of pieces the prompt would need to be split into so each one fits. */
  chunks: number;
  outputCapped: boolean;
};

/**
 * Does a prompt fit each model's window? `promptTokens` is looked up per model
 * so each family can use its own count. The reply you want must fit too: the
 * window covers the prompt and the answer together.
 */
export function checkFit(promptTokensFor: (model: Model) => number, wantedOutput: number, list: readonly Model[] = models): FitRow[] {
  const want = Math.max(0, Math.floor(Number.isFinite(wantedOutput) ? wantedOutput : 0));
  return list.map((model) => {
    const promptTokens = Math.max(0, Math.floor(promptTokensFor(model)));
    const cap = model.maxOutput ?? model.context;
    const reservedOutput = Math.min(want, cap);
    const needed = promptTokens + reservedOutput;
    const used = needed / model.context;
    const free = model.context - needed;
    const status: FitStatus = needed > model.context ? "too-big" : used >= 0.8 ? "tight" : "fits";
    const room = Math.max(1, model.context - reservedOutput);
    return { model, promptTokens, reservedOutput, needed, used, free, status, chunks: Math.max(1, Math.ceil(promptTokens / room)), outputCapped: want > cap };
  });
}

// ------------------------------------------------------- price comparison

export type CompareInput = {
  requestsPerMonth: number;
  inputTokens: number;
  outputTokens: number;
  /** Share of input tokens read from a prompt cache, 0 to 100. */
  cachedShare: number;
};

export const defaultCompare: CompareInput = { requestsPerMonth: 100_000, inputTokens: 2000, outputTokens: 400, cachedShare: 0 };

export type CompareRow = { model: Model; perRequest: number; perMonth: number };

export function compareModels(raw: CompareInput, list: readonly Model[] = models): CompareRow[] {
  const clamp = (v: number, max: number) => (Number.isFinite(v) ? Math.min(max, Math.max(0, v)) : 0);
  const requests = clamp(raw.requestsPerMonth, 1e12);
  const input = clamp(raw.inputTokens, 1e8);
  const output = clamp(raw.outputTokens, 1e7);
  const cachedShare = clamp(raw.cachedShare, 100) / 100;
  return list.map((model) => {
    const perRequest = callCost(model, input, output, input * cachedShare);
    return { model, perRequest, perMonth: perRequest * requests };
  });
}

// ------------------------------------------------------------ rate limits

export type RateInput = {
  /** Requests per minute your provider allows. */
  rpm: number;
  /** Tokens per minute. Zero or blank means no token limit to check. */
  tpm: number;
  /** When true, input and output tokens are limited separately (tpm applies to input, otpm to output). */
  separateOutputLimit: boolean;
  otpm: number;
  /** Model calls one user action makes (an agent might make 5 to 10). */
  callsPerAction: number;
  inputTokens: number;
  outputTokens: number;
  /** Share of calls that fail and are tried again, 0 to 100. Retries count against limits. */
  retryRate: number;
  /** Seconds one user waits between actions, on average. */
  secondsBetweenActions: number;
  /** How many users you expect to be active at the same moment. */
  targetUsers: number;
  /** How much busier your busiest minute is than an average one. */
  peakFactor: number;
};

export const defaultRate: RateInput = {
  rpm: 500,
  tpm: 200_000,
  separateOutputLimit: false,
  otpm: 0,
  callsPerAction: 4,
  inputTokens: 2500,
  outputTokens: 400,
  retryRate: 5,
  secondsBetweenActions: 45,
  targetUsers: 100,
  peakFactor: 2,
};

export type RateResult = {
  callsPerActionWithRetries: number;
  tokensPerCall: number;
  /** Highest calls per minute each limit allows. Infinity when that limit is not set. */
  byRpm: number;
  byTpm: number;
  byOtpm: number;
  limitingFactor: "requests" | "tokens" | "output tokens" | "none";
  maxCallsPerMinute: number;
  maxActionsPerMinute: number;
  /** Users who can be active together before the first limit is hit, at normal traffic. */
  maxUsersNormal: number;
  /** Same, in your busiest minute. */
  maxUsersPeak: number;
  /** What the target users need, at peak. */
  neededRpm: number;
  neededTpm: number;
  neededOtpm: number;
  headroom: number;
  verdict: "ok" | "tight" | "over";
};

export function rateLimits(raw: RateInput): RateResult {
  const c = (v: number, min: number, max: number) => (Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : min);
  const rpm = c(raw.rpm, 0, 1e9);
  const tpm = c(raw.tpm, 0, 1e12);
  const otpm = c(raw.otpm, 0, 1e12);
  const calls = c(raw.callsPerAction, 0.01, 10_000);
  const input = c(raw.inputTokens, 0, 1e8);
  const output = c(raw.outputTokens, 0, 1e7);
  const retry = c(raw.retryRate, 0, 99) / 100;
  const think = c(raw.secondsBetweenActions, 1, 1e6);
  const users = c(raw.targetUsers, 0, 1e9);
  const peak = c(raw.peakFactor, 1, 1000);

  const callsWithRetries = calls * (1 + retry);
  const tokensPerCall = raw.separateOutputLimit ? input : input + output;
  const byRpm = rpm > 0 ? rpm : Infinity;
  const byTpm = tpm > 0 && tokensPerCall > 0 ? tpm / tokensPerCall : Infinity;
  const byOtpm = raw.separateOutputLimit && otpm > 0 && output > 0 ? otpm / output : Infinity;
  const maxCallsPerMinute = Math.min(byRpm, byTpm, byOtpm);
  const limitingFactor: RateResult["limitingFactor"] = !Number.isFinite(maxCallsPerMinute) ? "none" : maxCallsPerMinute === byRpm ? "requests" : maxCallsPerMinute === byTpm ? "tokens" : "output tokens";
  const maxActionsPerMinute = maxCallsPerMinute / callsWithRetries;
  // One user does 60 / think actions a minute.
  const actionsPerUserPerMinute = 60 / think;
  const maxUsersNormal = maxActionsPerMinute / actionsPerUserPerMinute;
  const maxUsersPeak = maxUsersNormal / peak;
  const neededCalls = users * actionsPerUserPerMinute * callsWithRetries * peak;
  const neededRpm = neededCalls;
  const neededTpm = neededCalls * tokensPerCall;
  const neededOtpm = neededCalls * output;
  const headroom = Number.isFinite(maxCallsPerMinute) && neededCalls > 0 ? maxCallsPerMinute / neededCalls : Infinity;
  const verdict: RateResult["verdict"] = headroom < 1 ? "over" : headroom < 1.3 ? "tight" : "ok";
  return { callsPerActionWithRetries: callsWithRetries, tokensPerCall, byRpm, byTpm, byOtpm, limitingFactor, maxCallsPerMinute, maxActionsPerMinute, maxUsersNormal, maxUsersPeak, neededRpm, neededTpm, neededOtpm, headroom, verdict };
}

// ---------------------------------------------------------- prompt caching

export type CachingInput = {
  requestsPerMonth: number;
  /** Tokens at the start of every prompt that never change (system prompt, tool definitions, fixed context). */
  stableTokens: number;
  /** Tokens that change on every call (the user message, new tool results). */
  changingTokens: number;
  outputTokens: number;
  /** Share of calls where the stable start is found in the cache, 0 to 100. */
  hitRate: number;
};

export const defaultCaching: CachingInput = { requestsPerMonth: 200_000, stableTokens: 6000, changingTokens: 800, outputTokens: 400, hitRate: 80 };

export type CachingRow = { model: Model; withoutCache: number; withCache: number; saved: number; savedPercent: number };

/** Only models with a published cache price. Cache write surcharges are not included. */
export function cachingSavings(raw: CachingInput, list: readonly Model[] = models): CachingRow[] {
  const clamp = (v: number, max: number) => (Number.isFinite(v) ? Math.min(max, Math.max(0, v)) : 0);
  const requests = clamp(raw.requestsPerMonth, 1e12);
  const stable = clamp(raw.stableTokens, 1e8);
  const changing = clamp(raw.changingTokens, 1e8);
  const output = clamp(raw.outputTokens, 1e7);
  const hit = clamp(raw.hitRate, 100) / 100;
  return list
    .filter((m) => m.cached !== undefined)
    .map((model) => {
      const input = stable + changing;
      const withoutCache = callCost(model, input, output, 0) * requests;
      const withCache = callCost(model, input, output, stable * hit) * requests;
      const saved = withoutCache - withCache;
      return { model, withoutCache, withCache, saved, savedPercent: withoutCache > 0 ? (saved / withoutCache) * 100 : 0 };
    })
    .sort((a, b) => b.saved - a.saved);
}
