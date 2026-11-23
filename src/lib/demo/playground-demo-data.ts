/** Sample prompts and canned model answers for the public demo Playground. No network, fully deterministic. */
export const DEMO_PROMPTS = [
  { _id: "p1", name: "support-agent", versions: [
    { _id: "p1v18", version: 18, labels: ["production"], model: "gpt-4.1", content: "You are a support agent for Acme.\nAnswer briefly and only from the facts you are given.\n\nCustomer question: {{question}}\nOrder status: {{order_status}}" },
    { _id: "p1v17", version: 17, labels: [], model: "gpt-4.1", content: "You are a support agent for Acme. Be polite.\n\nCustomer question: {{question}}" },
  ] },
  { _id: "p2", name: "refund-agent", versions: [
    { _id: "p2v19", version: 19, labels: ["draft"], model: "claude-sonnet-5-5", content: "You decide refunds for Acme.\nRefund only if the order is under 30 days old and unshipped issues are confirmed.\n\nOrder age in days: {{order_age}}\nIssue: {{issue}}" },
    { _id: "p2v18", version: 18, labels: ["production"], model: "gpt-4.1", content: "You decide refunds for Acme. Refund if the order is under 30 days old.\n\nOrder age in days: {{order_age}}\nIssue: {{issue}}" },
  ] },
];

const WORDS = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

const OPENERS = ["Thanks for getting in touch.", "Happy to help with that.", "Here is what I found."];

/** Different models answer in visibly different styles, so side-by-side lanes show something to compare. */
export function demoResults(models: string[], compiledPrompt: string) {
  const seed = hash(compiledPrompt);
  const tail = compiledPrompt.split("\n").map((line) => line.trim()).filter(Boolean).slice(-1)[0] ?? "";
  return models.map((model, index) => {
    const claude = /^claude/i.test(model);
    const mini = /mini/i.test(model);
    const output = claude
      ? `${OPENERS[(seed + index) % OPENERS.length]}\n\nI went through the details you gave me (${tail.slice(0, 80)}) and kept the answer short and grounded in them.\n\nIf anything above looks off, tell me and I will check it again.`
      : mini
        ? `${OPENERS[(seed + index) % OPENERS.length]} Based on: ${tail.slice(0, 80)}. Short answer: yes, that can be handled.`
        : `${OPENERS[(seed + index) % OPENERS.length]}\n\n- Based on: ${tail.slice(0, 80)}\n- Next step: I will confirm and follow up.\n- Anything else I can do?`;
    const inputTokens = Math.max(8, Math.round(WORDS(compiledPrompt) * 1.4));
    const outputTokens = Math.max(8, Math.round(WORDS(output) * 1.4));
    return { model, output, latencyMs: 600 + ((seed >>> (index * 3)) % 1400) + (mini ? 0 : 500), inputTokens, outputTokens };
  });
}
