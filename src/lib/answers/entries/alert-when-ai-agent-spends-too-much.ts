import type { Answer } from "../types";

export const alertOnAgentSpend: Answer = {
  slug: "alert-when-ai-agent-spends-too-much",
  question: "How do I get alerted when an AI agent spends too much?",
  title: "Getting alerted when an agent spends too much",
  answer:
    "Create an alert rule on the Cost metric for your project. Set a limit in US dollars, choose a time window, and pick email, Slack or a webhook. Uncoil opens an alert when total cost in the window goes over the limit.",
  steps: [
    { heading: "Record cost on your spans", body: "The rule adds up the cost on your runs, so pass cost on model calls first. Uncoil never guesses a price." },
    { heading: "Open the Alerts page", body: "In the dashboard, open your project and choose Alerts, then create a rule." },
    { heading: "Choose the Cost metric", body: "Set the limit in dollars and a window from 5 minutes to 1 day. Optionally limit it to one environment." },
    { heading: "Pick where it goes", body: "Add email addresses, a Slack incoming webhook or a webhook link." },
    { heading: "Send a test", body: "Use Send a test to check delivery, then set a realistic limit." },
  ],
  points: [
    { heading: "How often it checks", body: "Enabled rules are checked about every five minutes. A rule opens one alert when it goes over and closes it when it drops back under." },
    { heading: "Plan", body: "Creating alert rules is part of the Pro and Team plans." },
    { heading: "Not a spending cap", body: "An alert tells you about spend. It does not stop your agent from making calls." },
  ],
  link: { href: "/docs/alerts", label: "Read the alerts docs" },
  related: [
    { href: "/docs/costs", label: "Track model cost" },
    { href: "/glossary/alert-rule", label: "What is an alert rule?" },
    { href: "/pricing", label: "Pricing" },
  ],
};
