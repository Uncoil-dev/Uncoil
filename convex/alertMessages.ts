/** What we send to Slack and to webhooks. Pure, so the exact shape is tested. */

export type AlertEvent = "alert.fired" | "alert.resolved" | "alert.test";

type Info = { event: AlertEvent; ruleId?: string; ruleName: string; metric: string; threshold: number; value?: number; message: string; projectId: string; dashboardUrl: string; at: string };

const HEADINGS: Record<AlertEvent, { emoji: string; title: string }> = {
  "alert.fired": { emoji: ":rotating_light:", title: "Alert" },
  "alert.resolved": { emoji: ":white_check_mark:", title: "Back to normal" },
  "alert.test": { emoji: ":test_tube:", title: "Test message" },
};

/** Slack escapes only these three characters inside mrkdwn text. */
export function slackEscape(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function slackPayload(info: Info) {
  const { emoji, title } = HEADINGS[info.event];
  const heading = `${emoji} ${title}: ${slackEscape(info.ruleName)}`;
  return {
    text: `${heading}. ${info.message}`,
    blocks: [
      { type: "section", text: { type: "mrkdwn", text: `*${heading}*\n${slackEscape(info.message)}` } },
      { type: "actions", elements: [{ type: "button", text: { type: "plain_text", text: "Open in Tracify" }, url: info.dashboardUrl }] },
    ],
  };
}

export function webhookPayload(info: Info) {
  return {
    event: info.event,
    rule: { id: info.ruleId ?? null, name: info.ruleName, metric: info.metric, threshold: info.threshold },
    value: info.value ?? null,
    message: info.message,
    projectId: info.projectId,
    dashboardUrl: info.dashboardUrl,
    firedAt: info.at,
  };
}
