-- Table layout for the spans table in ClickHouse.
CREATE TABLE IF NOT EXISTS spans
(
    `spanId` String,
    `runId` String,
    `projectId` String,
    `spanType` String,
    `input` String,
    `output` String,
    `attachments` String DEFAULT '[]',
    `latencyMs` Int32,
    `costUsd` Float64,
    `modelId` String,
    `toolName` String,
    `parentSpanId` String,
    `sessionId` String,
    `endUserId` String,
    `environment` String,
    `release` String,
    `tags` Array(String),
    `traceName` String,
    `metadata` String,
    `inputTokens` UInt32 DEFAULT 0,
    `outputTokens` UInt32 DEFAULT 0,
    `ttftMs` UInt32 DEFAULT 0,
    `retryCount` UInt16 DEFAULT 0,
    `errorType` String DEFAULT '',
    `errorMessage` String DEFAULT '',
    `isStreamChunk` Bool DEFAULT 0,
    `streamSequence` UInt32 DEFAULT 0,
    `streamFinal` Bool DEFAULT 1,
    `payloadFormat` String DEFAULT 'json',
    `stackTrace` String DEFAULT '',
    `timedOut` Bool DEFAULT 0,
    `timeoutMs` UInt32 DEFAULT 0,
    `createdAt` DateTime
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(createdAt)
PRIMARY KEY (projectId, runId)
ORDER BY (projectId, runId, createdAt, spanId)
TTL createdAt + toIntervalDay(365);
