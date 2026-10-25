import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { processSpan, processAlert, onboardingReminder, dailyRetention } from "@/lib/inngest-functions";

/**
 * Inngest serve route — handles all Inngest lifecycle events
 * (function registration, execution, retries, etc.)
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processSpan, processAlert, onboardingReminder, dailyRetention],
});
