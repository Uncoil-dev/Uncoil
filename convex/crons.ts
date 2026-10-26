import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Checks every enabled alert rule and emails when one goes over its limit.
crons.interval("check alert rules", { minutes: 5 }, internal.alertRules.checkAll, {});

// Warns once when spending passes the warning level of a budget, and once when it passes the limit.
crons.interval("check cost budgets", { minutes: 15 }, internal.budgets.checkAll, {});

// Weekly email of runs, failures and spend. Monday 08:00 UTC.
crons.weekly("weekly summary", { dayOfWeek: "monday", hourUTC: 8, minuteUTC: 0 }, internal.weeklySummary.sendAll, {});

// Removes finished or expired terminal sign-in requests.
crons.interval("clean device logins", { minutes: 10 }, internal.deviceLogins.cleanup, {});

export default crons;
