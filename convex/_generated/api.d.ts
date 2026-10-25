/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as agentRuns from "../agentRuns.js";
import type * as alertMessages from "../alertMessages.js";
import type * as alertMetrics from "../alertMetrics.js";
import type * as alertRules from "../alertRules.js";
import type * as alerts from "../alerts.js";
import type * as autoScoring from "../autoScoring.js";
import type * as analyticsCache from "../analyticsCache.js";
import type * as annotations from "../annotations.js";
import type * as auditLogs from "../auditLogs.js";
import type * as auth from "../auth.js";
import type * as automationRuntime from "../automationRuntime.js";
import type * as automations from "../automations.js";
import type * as billing from "../billing.js";
import type * as budgets from "../budgets.js";
import type * as comments from "../comments.js";
import type * as costCounters from "../costCounters.js";
import type * as crons from "../crons.js";
import type * as dashboards from "../dashboards.js";
import type * as datasets from "../datasets.js";
import type * as evaluation from "../evaluation.js";
import type * as evaluationEngine from "../evaluationEngine.js";
import type * as evaluators from "../evaluators.js";
import type * as experiments from "../experiments.js";
import type * as http from "../http.js";
import type * as leads from "../leads.js";
import type * as notificationPreferences from "../notificationPreferences.js";
import type * as ownerMigration from "../ownerMigration.js";
import type * as projectData from "../projectData.js";
import type * as notify from "../notify.js";
import type * as projects from "../projects.js";
import type * as prompts from "../prompts.js";
import type * as resilience from "../resilience.js";
import type * as retention from "../retention.js";
import type * as sandbox from "../sandbox.js";
import type * as savedViews from "../savedViews.js";
import type * as sharedTraces from "../sharedTraces.js";
import type * as sessions from "../sessions.js";
import type * as spendMetrics from "../spendMetrics.js";
import type * as weeklySummary from "../weeklySummary.js";
import type * as welcomeEmail from "../welcomeEmail.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  agentRuns: typeof agentRuns;
  alertMessages: typeof alertMessages;
  alertMetrics: typeof alertMetrics;
  alertRules: typeof alertRules;
  alerts: typeof alerts;
  autoScoring: typeof autoScoring;
  analyticsCache: typeof analyticsCache;
  annotations: typeof annotations;
  auditLogs: typeof auditLogs;
  auth: typeof auth;
  automationRuntime: typeof automationRuntime;
  automations: typeof automations;
  billing: typeof billing;
  budgets: typeof budgets;
  comments: typeof comments;
  costCounters: typeof costCounters;
  crons: typeof crons;
  dashboards: typeof dashboards;
  datasets: typeof datasets;
  evaluation: typeof evaluation;
  evaluationEngine: typeof evaluationEngine;
  evaluators: typeof evaluators;
  experiments: typeof experiments;
  http: typeof http;
  leads: typeof leads;
  notificationPreferences: typeof notificationPreferences;
  ownerMigration: typeof ownerMigration;
  projectData: typeof projectData;
  notify: typeof notify;
  projects: typeof projects;
  prompts: typeof prompts;
  resilience: typeof resilience;
  retention: typeof retention;
  sandbox: typeof sandbox;
  savedViews: typeof savedViews;
  sharedTraces: typeof sharedTraces;
  sessions: typeof sessions;
  spendMetrics: typeof spendMetrics;
  weeklySummary: typeof weeklySummary;
  welcomeEmail: typeof welcomeEmail;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("../betterAuth/_generated/component.js").ComponentApi<"betterAuth">;
};
