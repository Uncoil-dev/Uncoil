/** Formats an alert as a Discord webhook message, trimmed to Discord's size limits. */

export const DISCORD_LIMITS = { content: 2000, embedTitle: 256, embedDescription: 4096, fieldValue: 1024 } as const;

export type DiscordAlertInput = {
  projectName: string;
  ruleLabel: string;
  message: string;
  runUrl: string;
  failingStep?: string;
};

function trim(text: string, max: number) {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

export function buildDiscordAlertPayload(input: DiscordAlertInput) {
  const fields = [{ name: "Project", value: trim(input.projectName || "Unnamed project", DISCORD_LIMITS.fieldValue), inline: true }];
  if (input.failingStep) fields.push({ name: "Failing step", value: trim(input.failingStep, DISCORD_LIMITS.fieldValue), inline: true });
  return {
    content: trim(`Uncoil alert: ${input.ruleLabel}\n${input.runUrl}`, DISCORD_LIMITS.content),
    // No mentions: alert text can contain user data such as "@everyone".
    allowed_mentions: { parse: [] as string[] },
    embeds: [{
      title: trim(`Alert: ${input.ruleLabel}`, DISCORD_LIMITS.embedTitle),
      url: input.runUrl,
      description: trim(input.message, DISCORD_LIMITS.embedDescription),
      color: 0xf4d44d,
      fields,
    }],
  };
}
