/** Maximum length of each contact and newsletter form field, after trimming. */
export const LEAD_FIELD_LIMITS: Record<string, number> = { name: 120, email: 200, company: 160, intent: 80, role: 120, useCase: 500, stack: 300, message: 4000, preferredTime: 120, sourcePath: 300, campaign: 160 };

const clean = (value: unknown) => (typeof value === "string" ? value.trim() : "");
// "useCase" -> "Use case", so the message names the field the way the form does.
const label = (key: string) => key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`).replace(/^./, (first) => first.toUpperCase());

/** Explains what is wrong with a lead submission, or returns null when it can be stored. */
export function leadInputError(body: Record<string, unknown>): string | null {
  if (Object.entries(body).some(([key, value]) => key !== "website" && key !== "marketingConsent" && typeof value !== "string")) return "Invalid request";
  const tooLong = Object.entries(LEAD_FIELD_LIMITS).find(([key, max]) => clean(body[key]).length > max);
  if (tooLong) return `${label(tooLong[0])} is too long (${tooLong[1]} characters max)`;
  if (!/^\S+@\S+\.\S+$/.test(clean(body.email))) return "Enter a valid email address";
  if (!clean(body.intent) && !clean(body.message)) return "Add a message";
  return null;
}
