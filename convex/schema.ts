import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  projects: defineTable({
    name: v.string(),
    slug: v.optional(v.string()),
    clerkUserId: v.optional(v.string()),
    // Auth user id of the project's creator. Replaces the legacy clerkUserId name; both are written until the old one is retired.
    ownerId: v.optional(v.string()),
    clerkOrgId: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    planTier: v.optional(v.union(
      v.literal("free"),
      v.literal("pro"),
      v.literal("team"),
      v.literal("enterprise"),
    )),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    stripeSubscriptionStatus: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
    subscriptionCurrentPeriodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    clientName: v.optional(v.string()),
    reportNotes: v.optional(v.string()),
    apiKeyPrefix: v.optional(v.string()),
    apiKeyLast4: v.optional(v.string()),
    apiKeyHash: v.optional(v.string()),
    apiKeyStatus: v.optional(v.union(v.literal("active"), v.literal("revoked"))),
    apiKeyCreatedAt: v.optional(v.number()),
    apiKeyLastUsedAt: v.optional(v.number()),
    onboardingStep: v.optional(v.union(v.literal("project"), v.literal("api-key"), v.literal("install"), v.literal("waiting"), v.literal("success"))),
    onboardingDismissedAt: v.optional(v.number()),
    onboardingSdk: v.optional(v.union(v.literal("python"), v.literal("typescript"))),
    costThresholdUsd: v.optional(v.number()),
    maxDurationSeconds: v.optional(v.number()),
    maxStallMinutes: v.optional(v.number()),
    slackWebhookUrl: v.optional(v.string()),
    teamsWebhookUrl: v.optional(v.string()),
    redactionEnabled: v.optional(v.boolean()),
    redactionRules: v.optional(v.array(v.string())),
    retentionDays: v.optional(v.number()),
    runtimePolicy: v.optional(v.object({
      enforcementMode: v.union(v.literal("observe"), v.literal("enforce")),
      maxCostPerRun: v.optional(v.number()),
      maxCostPerDay: v.optional(v.number()),
      fallbackChain: v.array(v.string()),
      retryPolicy: v.object({
        maxAttempts: v.number(),
        backoffMs: v.number(),
        backoffMultiplier: v.number(),
        retryableErrors: v.array(v.string()),
      }),
      latencyBudgetMs: v.optional(v.number()),
    })),
  })
    .index("by_clerkOrgId", ["clerkOrgId"])
    .index("by_clerkUserId", ["clerkUserId"])
    .index("by_ownerId", ["ownerId"])
    .index("by_slug", ["slug"])
    .index("by_stripeCustomerId", ["stripeCustomerId"])
    .index("by_stripeSubscriptionId", ["stripeSubscriptionId"])
    .index("by_apiKeyHash", ["apiKeyHash"]),

  savedViews: defineTable({
    projectId: v.id("projects"), ownerId: v.string(), name: v.string(),
    target: v.union(v.literal("traces"), v.literal("steps")), shared: v.boolean(),
    query: v.record(v.string(), v.string()), columns: v.array(v.string()), updatedAt: v.number(),
  }).index("by_projectId_and_ownerId", ["projectId", "ownerId"])
    .index("by_projectId_and_shared", ["projectId", "shared"]),

  agentRuns: defineTable({
    runId: v.string(),
    status: v.union(
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
    spanCount: v.number(),
    totalCostUsd: v.number(),
    startedAt: v.string(),
    finishedAt: v.optional(v.string()),
    lastSpanAt: v.optional(v.string()),
    primaryModel: v.optional(v.string()),
    createdAt: v.optional(v.string()),
    updatedAt: v.optional(v.string()),
    projectId: v.id("projects"),
    sessionId: v.optional(v.string()),
    environment: v.optional(v.string()),
    release: v.optional(v.string()),
  })
    .index("by_projectId", ["projectId"])
    .index("by_runId", ["runId"])
    .index("by_projectId_and_runId", ["projectId", "runId"])
    .index("by_projectId_createdAt", ["projectId", "createdAt"])
    .index("by_projectId_status", ["projectId", "status"])
    .index("by_projectId_and_sessionId", ["projectId", "sessionId"]),

  sessions: defineTable({
    projectId: v.id("projects"),
    sessionId: v.string(),
    endUserId: v.optional(v.string()),
    environment: v.optional(v.string()),
    release: v.optional(v.string()),
    traceName: v.optional(v.string()),
    tags: v.array(v.string()),
    firstSeenAt: v.string(),
    lastSeenAt: v.string(),
    traceCount: v.number(),
    spanCount: v.number(),
    totalCostUsd: v.number(),
    latestStatus: v.union(
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
  })
    .index("by_projectId_and_sessionId", ["projectId", "sessionId"])
    .index("by_projectId_and_lastSeenAt", ["projectId", "lastSeenAt"]),

  alerts: defineTable({
    runId: v.string(),
    type: v.string(), // 'run_failed' | 'cost_exceeded' | 'duration_exceeded'
    message: v.string(),
    triggeredAt: v.string(), // ISO 8601 UTC
    state: v.optional(v.union(v.literal("active"), v.literal("resolved"), v.literal("muted"))),
    readAt: v.optional(v.number()),
    projectId: v.id("projects"),
    ruleId: v.optional(v.id("alertRules")),
  })
    .index("by_projectId", ["projectId"])
    .index("by_runId", ["runId"])
    .index("by_ruleId", ["ruleId"]),

  // Rules that Tracify checks on a schedule (convex/crons.ts). A breach opens an alert and emails `emailTo`.
  alertRules: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    metric: v.union(
      v.literal("failed_runs"),
      v.literal("cost_usd"),
      v.literal("slow_p95_seconds"),
      v.literal("minutes_without_runs"),
    ),
    threshold: v.number(),
    windowMinutes: v.number(),
    environment: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    emailTo: v.array(v.string()),
    slackUrl: v.optional(v.string()),
    webhookUrl: v.optional(v.string()),
    enabled: v.boolean(),
    state: v.union(v.literal("ok"), v.literal("firing")),
    lastValue: v.optional(v.number()),
    lastCheckedAt: v.optional(v.number()),
    lastFiredAt: v.optional(v.number()),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_projectId", ["projectId"])
    .index("by_enabled", ["enabled"]),

  // One row per Slack or webhook send for an alert rule (fired, back to normal, or a test), so the dashboard can show what happened. Trimmed to the newest 20 per rule.
  alertDeliveries: defineTable({
    projectId: v.id("projects"),
    ruleId: v.id("alertRules"),
    channel: v.union(v.literal("slack"), v.literal("webhook")),
    kind: v.union(v.literal("fired"), v.literal("resolved"), v.literal("test")),
    ok: v.boolean(),
    status: v.optional(v.number()),
    error: v.optional(v.string()),
    at: v.number(),
  })
    .index("by_ruleId", ["ruleId"])
    .index("by_projectId", ["projectId"]),

  automations: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    eventSource: v.string(),
    actionType: v.string(),
    destination: v.string(),
    active: v.boolean(),
    lastFiredAt: v.optional(v.number()),
    lastStatus: v.optional(v.union(v.literal("ok"), v.literal("failed"))),
    lastError: v.optional(v.string()),
    fireCount: v.optional(v.number()),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_projectId", ["projectId"])
    .index("by_projectId_and_name", ["projectId", "name"]),

  dashboardConfigs: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    isDefault: v.boolean(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_projectId", ["projectId"])
    .index("by_projectId_and_name", ["projectId", "name"]),

  dashboardWidgets: defineTable({
    dashboardId: v.id("dashboardConfigs"),
    projectId: v.id("projects"),
    widgetType: v.string(),
    position: v.number(),
    createdAt: v.number(),
  })
    .index("by_dashboardId", ["dashboardId"])
    .index("by_projectId", ["projectId"]),

  comments: defineTable({
    spanId: v.string(), // Tinybird spanId
    projectId: v.id("projects"),
    runId: v.string(),
    userId: v.string(),
    userName: v.string(),
    content: v.string(),
    createdAt: v.number(),
  })
    .index("by_spanId", ["spanId"])
    .index("by_runId", ["runId"])
    .index("by_projectId", ["projectId"]),

  sharedTraces: defineTable({
    projectId: v.id("projects"),
    runId: v.string(),
    token: v.string(),
    createdBy: v.string(),
    createdAt: v.number(),
    revokedAt: v.optional(v.number()),
  })
    .index("by_token", ["token"])
    .index("by_projectId_and_runId", ["projectId", "runId"]),

  analyticsStatsCache: defineTable({
    projectId: v.id("projects"),
    rangeDays: v.number(),
    dailyCosts: v.array(v.object({
      day: v.string(),
      totalCostUsd: v.number(),
      spanCount: v.number(),
    })),
    modelCosts: v.array(v.object({
      modelId: v.string(),
      totalCostUsd: v.number(),
      spanCount: v.number(),
      avgLatencyMs: v.optional(v.number()),
      p50LatencyMs: v.optional(v.number()),
      p75LatencyMs: v.optional(v.number()),
      p90LatencyMs: v.optional(v.number()),
      p95LatencyMs: v.optional(v.number()),
      p99LatencyMs: v.optional(v.number()),
    })),
    toolCosts: v.optional(v.array(v.object({
      toolName: v.string(),
      totalCostUsd: v.number(),
      spanCount: v.number(),
      avgLatencyMs: v.optional(v.number()),
    }))),
    userCosts: v.optional(v.array(v.object({
      endUserId: v.string(),
      totalCostUsd: v.number(),
      totalTokens: v.number(),
      spanCount: v.number(),
      avgLatencyMs: v.optional(v.number()),
    }))),
    updatedAt: v.number(),
    source: v.string(),
    lastManualRefreshAt: v.optional(v.number()),
  })
    .index("by_projectId_and_rangeDays", ["projectId", "rangeDays"]),

  runSpanCache: defineTable({
    projectId: v.id("projects"),
    runId: v.string(),
    spans: v.array(v.object({
      spanId: v.string(),
      runId: v.string(),
      projectId: v.string(),
      spanType: v.string(),
      input: v.string(),
      output: v.string(),
      attachments: v.optional(v.string()),
      latencyMs: v.number(),
      costUsd: v.number(),
      modelId: v.string(),
      toolName: v.string(),
      parentSpanId: v.string(),
      metadata: v.any(),
      inputTokens: v.optional(v.number()),
      outputTokens: v.optional(v.number()),
      ttftMs: v.optional(v.number()),
      retryCount: v.optional(v.number()),
      errorType: v.optional(v.string()),
      errorMessage: v.optional(v.string()),
      isStreamChunk: v.optional(v.boolean()),
      streamSequence: v.optional(v.number()),
      streamFinal: v.optional(v.boolean()),
      payloadFormat: v.optional(v.string()),
      stackTrace: v.optional(v.string()),
      timedOut: v.optional(v.boolean()),
      timeoutMs: v.optional(v.number()),
      createdAt: v.string(),
    })),
    runStatus: v.optional(v.union(
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled"),
    )),
    updatedAt: v.number(),
    source: v.string(),
    lastManualRefreshAt: v.optional(v.number()),
  })
    .index("by_projectId_and_runId", ["projectId", "runId"]),

  tinybirdReadBudget: defineTable({
    day: v.string(),
    readCount: v.number(),
    updatedAt: v.number(),
  }).index("by_day", ["day"]),

  // Spending limits per calendar week or month. Warns once at `warnAtPercent` and once when the limit is passed.
  costBudgets: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    period: v.union(v.literal("week"), v.literal("month")),
    limitUsd: v.number(),
    warnAtPercent: v.number(),
    environment: v.optional(v.string()),
    emailTo: v.array(v.string()),
    slackUrl: v.optional(v.string()),
    webhookUrl: v.optional(v.string()),
    enabled: v.boolean(),
    warnedPeriod: v.optional(v.string()),
    overPeriod: v.optional(v.string()),
    lastSpend: v.optional(v.number()),
    lastCheckedAt: v.optional(v.number()),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_projectId", ["projectId"])
    .index("by_enabled", ["enabled"]),

  // One weekly email (and optional Slack post) per project, sent Monday morning UTC.
  weeklySummaries: defineTable({
    projectId: v.id("projects"),
    enabled: v.boolean(),
    emailTo: v.array(v.string()),
    slackUrl: v.optional(v.string()),
    lastSentWeek: v.optional(v.string()),
    lastTestAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_projectId", ["projectId"])
    .index("by_enabled", ["enabled"]),

  costCounters: defineTable({
    projectId: v.id("projects"),
    period: v.string(), // "run:{runId}" or "day:{YYYY-MM-DD}"
    costUsd: v.number(),
    updatedAt: v.number(),
  })
    .index("by_projectId_and_period", ["projectId", "period"]),

  prompts: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    description: v.optional(v.string()),
    type: v.union(v.literal("text"), v.literal("chat")),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_projectId", ["projectId"])
    .index("by_projectId_and_name", ["projectId", "name"]),

  promptVersions: defineTable({
    promptId: v.id("prompts"),
    projectId: v.id("projects"),
    version: v.optional(v.number()),
    content: v.string(),
    variables: v.array(v.string()),
    labels: v.array(v.string()),
    model: v.optional(v.string()),
    /** A short note on what changed in this version, like a commit message. */
    commitMessage: v.optional(v.string()),
    createdBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_promptId", ["promptId"])
    .index("by_projectId", ["projectId"])
    .index("by_promptId_and_version", ["promptId", "version"]),

  promptTraceLinks: defineTable({
    projectId: v.id("projects"),
    promptId: v.id("prompts"),
    promptVersionId: v.id("promptVersions"),
    traceId: v.string(),
    spanId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_promptVersionId", ["promptVersionId"])
    .index("by_projectId", ["projectId"])
    .index("by_traceId", ["projectId", "traceId"]),

  datasets: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    description: v.optional(v.string()),
    version: v.optional(v.number()),
    access: v.optional(v.union(v.literal("project"), v.literal("restricted"))),
    allowedUserIds: v.optional(v.array(v.string())),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_projectId", ["projectId"])
    .index("by_projectId_and_name", ["projectId", "name"]),

  datasetItems: defineTable({
    projectId: v.id("projects"),
    datasetId: v.id("datasets"),
    traceId: v.optional(v.string()),
    input: v.string(),
    expectedOutput: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_datasetId", ["datasetId"])
    .index("by_projectId", ["projectId"])
    .index("by_datasetId_and_traceId", ["datasetId", "traceId"]),

  scores: defineTable({
    projectId: v.id("projects"),
    traceId: v.optional(v.string()),
    spanId: v.optional(v.string()),
    datasetItemId: v.optional(v.id("datasetItems")),
    name: v.string(),
    value: v.union(v.number(), v.boolean(), v.string()),
    dataType: v.union(v.literal("numeric"), v.literal("boolean"), v.literal("categorical"), v.literal("text")),
    source: v.union(v.literal("human"), v.literal("llm"), v.literal("code"), v.literal("user")),
    comment: v.optional(v.string()),
    createdBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_projectId", ["projectId"])
    .index("by_projectId_and_traceId", ["projectId", "traceId"])
    .index("by_datasetItemId", ["datasetItemId"]),

  annotations: defineTable({
    projectId: v.id("projects"),
    traceId: v.string(),
    spanId: v.optional(v.string()),
    status: v.union(v.literal("queued"), v.literal("in_review"), v.literal("completed")),
    assignee: v.optional(v.string()),
    label: v.optional(v.string()),
    labels: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    confidence: v.optional(v.number()),
    assignedAt: v.optional(v.number()),
    assignmentMethod: v.optional(v.union(v.literal("manual"), v.literal("round_robin"), v.literal("least_loaded"))),
    agreementGroupId: v.optional(v.string()),
    adjudicatedBy: v.optional(v.string()),
    createdBy: v.string(),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_projectId", ["projectId"])
    .index("by_projectId_and_status", ["projectId", "status"])
    .index("by_projectId_and_traceId", ["projectId", "traceId"]),

  annotationReviews: defineTable({
    projectId: v.id("projects"),
    annotationId: v.id("annotations"),
    reviewerId: v.string(),
    reviewerName: v.string(),
    label: v.optional(v.string()),
    score: v.optional(v.number()),
    notes: v.optional(v.string()),
    status: v.union(v.literal("assigned"), v.literal("submitted")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_annotationId", ["annotationId"])
    .index("by_projectId", ["projectId"])
    .index("by_annotationId_and_reviewerId", ["annotationId", "reviewerId"]),

  evaluators: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    type: v.union(v.literal("code"), v.literal("llm_judge")),
    criteria: v.string(),
    active: v.boolean(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_projectId", ["projectId"])
    .index("by_projectId_and_name", ["projectId", "name"]),

  experiments: defineTable({
    projectId: v.id("projects"),
    datasetId: v.id("datasets"),
    promptId: v.optional(v.id("prompts")),
    promptVersionId: v.optional(v.id("promptVersions")),
    suiteId: v.optional(v.id("evaluationSuites")),
    name: v.string(),
    model: v.optional(v.string()),
    status: v.union(v.literal("draft"), v.literal("running"), v.literal("completed"), v.literal("failed")),
    createdBy: v.string(),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_projectId", ["projectId"])
    .index("by_datasetId", ["datasetId"]),

  experimentResults: defineTable({
    projectId: v.id("projects"),
    experimentId: v.id("experiments"),
    datasetItemId: v.id("datasetItems"),
    output: v.string(),
    traceId: v.optional(v.string()),
    latencyMs: v.optional(v.number()),
    costUsd: v.optional(v.number()),
    score: v.optional(v.number()),
    error: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_experimentId", ["experimentId"])
    .index("by_projectId", ["projectId"]),

  evaluatorVersions: defineTable({
    projectId: v.id("projects"),
    evaluatorId: v.id("evaluators"),
    version: v.number(),
    config: v.object({
      target: v.union(v.literal("trace"), v.literal("span"), v.literal("dataset_item")),
      scoreType: v.union(v.literal("boolean"), v.literal("numeric"), v.literal("categorical"), v.literal("text")),
      prompt: v.optional(v.string()),
      model: v.optional(v.string()),
      rule: v.optional(v.string()),
      categories: v.optional(v.array(v.string())),
      minScore: v.optional(v.number()),
      maxScore: v.optional(v.number()),
      sampleRate: v.number(),
      enabledOnline: v.boolean(),
      trigger: v.optional(v.object({
        when: v.union(v.literal("every"), v.literal("failed"), v.literal("run_end")),
        modelContains: v.optional(v.string()),
        dailyLimit: v.optional(v.number()),
      })),
      template: v.optional(v.union(v.literal("groundedness"), v.literal("toxicity"), v.literal("pii"), v.literal("jailbreak"), v.literal("prompt_injection"), v.literal("policy"))),
    }),
    createdBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_evaluatorId", ["evaluatorId"])
    .index("by_projectId", ["projectId"]),

  evaluationSuites: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    description: v.optional(v.string()),
    datasetId: v.id("datasets"),
    evaluatorIds: v.array(v.id("evaluators")),
    baselineExperimentId: v.optional(v.id("experiments")),
    minScore: v.optional(v.number()),
    maxRegressionRate: v.optional(v.number()),
    active: v.boolean(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_projectId", ["projectId"])
    .index("by_datasetId", ["datasetId"]),

  evaluationJobs: defineTable({
    projectId: v.id("projects"),
    suiteId: v.optional(v.id("evaluationSuites")),
    mode: v.union(v.literal("online"), v.literal("offline"), v.literal("preview")),
    status: v.union(v.literal("queued"), v.literal("running"), v.literal("completed"), v.literal("partial"), v.literal("failed"), v.literal("cancelled")),
    traceId: v.optional(v.string()),
    prompt: v.optional(v.string()),
    model: v.optional(v.string()),
    promptVersionId: v.optional(v.id("promptVersions")),
    itemCount: v.number(),
    completedCount: v.number(),
    failedCount: v.number(),
    error: v.optional(v.string()),
    createdBy: v.string(),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_projectId", ["projectId"])
    .index("by_projectId_and_status", ["projectId", "status"])
    .index("by_traceId", ["traceId"]),

  evaluationResults: defineTable({
    projectId: v.id("projects"),
    jobId: v.id("evaluationJobs"),
    evaluatorId: v.id("evaluators"),
    evaluatorVersion: v.number(),
    traceId: v.optional(v.string()),
    spanId: v.optional(v.string()),
    datasetItemId: v.optional(v.id("datasetItems")),
    value: v.union(v.number(), v.boolean(), v.string()),
    dataType: v.union(v.literal("boolean"), v.literal("numeric"), v.literal("categorical"), v.literal("text")),
    status: v.union(v.literal("passed"), v.literal("failed"), v.literal("error"), v.literal("skipped")),
    explanation: v.optional(v.string()),
    latencyMs: v.optional(v.number()),
    costUsd: v.optional(v.number()),
    error: v.optional(v.string()),
    dedupeKey: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_projectId", ["projectId"])
    .index("by_jobId", ["jobId"])
    .index("by_projectId_and_traceId", ["projectId", "traceId"])
    .index("by_evaluatorId", ["evaluatorId"])
    .index("by_dedupeKey", ["dedupeKey"]),

  evaluationMonitors: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    evaluatorId: v.optional(v.id("evaluators")),
    scoreName: v.string(),
    aggregation: v.union(v.literal("failure_rate"), v.literal("average"), v.literal("count"), v.literal("categorical_rate")),
    threshold: v.number(),
    recoveryThreshold: v.optional(v.number()),
    windowMinutes: v.number(),
    minSamples: v.number(),
    severity: v.union(v.literal("info"), v.literal("warning"), v.literal("critical")),
    groupBy: v.optional(v.union(v.literal("model"), v.literal("prompt_version"), v.literal("environment"), v.literal("tag"))),
    active: v.boolean(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_projectId", ["projectId"])
    .index("by_projectId_and_active", ["projectId", "active"]),

  resilienceRuns: defineTable({
    projectId: v.id("projects"),
    status: v.union(v.literal("running"), v.literal("completed"), v.literal("failed")),
    iterations: v.number(),
    failureMix: v.record(v.string(), v.number()),
    policySnapshot: v.object({
      enforcementMode: v.union(v.literal("observe"), v.literal("enforce")),
      fallbackChain: v.array(v.string()),
      maxCostPerRun: v.optional(v.number()),
      maxCostPerDay: v.optional(v.number()),
      latencyBudgetMs: v.optional(v.number()),
      retryPolicy: v.object({
        maxAttempts: v.number(),
        backoffMs: v.number(),
        backoffMultiplier: v.number(),
        retryableErrors: v.array(v.string()),
      }),
    }),
    successCount: v.number(),
    failOpenCount: v.number(),
    blockedCount: v.number(),
    error: v.optional(v.string()),
    createdBy: v.string(),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_projectId", ["projectId"]),

  resilienceIterations: defineTable({
    projectId: v.id("projects"),
    runId: v.id("resilienceRuns"),
    iteration: v.number(),
    model: v.string(),
    failureMode: v.union(v.literal("success"), v.literal("timeout"), v.literal("429"), v.literal("500"), v.literal("cost_overrun")),
    success: v.boolean(),
    latencyMs: v.number(),
    attempts: v.number(),
    blocked: v.optional(v.boolean()),
    fallbackReason: v.optional(v.string()),
    failOpen: v.optional(v.boolean()),
    error: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_runId", ["runId"])
    .index("by_projectId", ["projectId"]),

  evaluationMonitorState: defineTable({
    projectId: v.id("projects"),
    monitorId: v.id("evaluationMonitors"),
    breached: v.boolean(),
    measured: v.number(),
    sampleCount: v.number(),
    updatedAt: v.number(),
  })
    .index("by_monitorId", ["monitorId"])
    .index("by_projectId", ["projectId"]),

  evaluationFeedback: defineTable({
    projectId: v.id("projects"),
    traceId: v.string(),
    spanId: v.optional(v.string()),
    kind: v.union(v.literal("thumb"), v.literal("star"), v.literal("text")),
    value: v.union(v.number(), v.boolean(), v.string()),
    reason: v.optional(v.string()),
    comment: v.optional(v.string()),
    endUserId: v.optional(v.string()),
    dedupeKey: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_projectId", ["projectId"])
    .index("by_projectId_and_traceId", ["projectId", "traceId"])
    .index("by_dedupeKey", ["dedupeKey"]),

  leadSubmissions: defineTable({
    name: v.string(),
    email: v.string(),
    company: v.optional(v.string()),
    intent: v.string(),
    role: v.optional(v.string()),
    useCase: v.optional(v.string()),
    stack: v.optional(v.string()),
    message: v.optional(v.string()),
    preferredTime: v.optional(v.string()),
    marketingConsent: v.boolean(),
    sourcePath: v.string(),
    campaign: v.optional(v.string()),
    dedupeKey: v.optional(v.string()),
    status: v.union(v.literal("new"), v.literal("contacted"), v.literal("qualified"), v.literal("converted"), v.literal("closed")),
    assignedTo: v.optional(v.string()),
    // Optional for backwards compatibility with submissions created before delivery tracking was added.
    internalEmailStatus: v.optional(v.union(v.literal("pending"), v.literal("sent"), v.literal("failed"))),
    acknowledgementEmailStatus: v.optional(v.union(v.literal("pending"), v.literal("sent"), v.literal("failed"))),
    emailError: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_status", ["status"])
    .index("by_intent", ["intent"])
    .index("by_email", ["email"])
    .index("by_company", ["company"])
    .index("by_dedupeKey", ["dedupeKey"]),

  leadNotes: defineTable({
    leadId: v.id("leadSubmissions"),
    author: v.string(),
    body: v.string(),
    createdAt: v.number(),
  }).index("by_leadId", ["leadId"]),

  leadIdempotency: defineTable({
    key: v.string(),
    leadId: v.id("leadSubmissions"),
    createdAt: v.number(),
  }).index("by_key", ["key"]),

  notificationPreferences: defineTable({
    userKey: v.string(),
    operational: v.boolean(),
    product: v.boolean(),
    updatedAt: v.number(),
  }).index("by_userKey", ["userKey"]),

  // One row per address already welcomed, so the welcome email is never sent twice.
  welcomeEmails: defineTable({
    email: v.string(),
    sentAt: v.number(),
  }).index("by_email", ["email"]),

  auditLogs: defineTable({
    projectId: v.id("projects"),
    actorId: v.string(),
    actorEmail: v.optional(v.string()),
    action: v.string(),
    resource: v.string(),
    summary: v.string(),
    metadata: v.optional(v.record(v.string(), v.string())),
    createdAt: v.number(),
  })
    .index("by_projectId", ["projectId"])
    .index("by_projectId_and_createdAt", ["projectId", "createdAt"]),

  sandboxWorkspaces: defineTable({
    userKey: v.string(),
    fixtureVersion: v.string(),
    scenarioId: v.string(),
    dismissedAlertIds: v.array(v.string()),
    updatedAt: v.number(),
  }).index("by_userKey", ["userKey"]),
});
