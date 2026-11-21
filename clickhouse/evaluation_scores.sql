-- Table layout for the evaluation_scores table in ClickHouse.
CREATE TABLE IF NOT EXISTS evaluation_scores
(
    `scoreId` String,
    `projectId` String,
    `traceId` String DEFAULT '',
    `evaluatorId` String,
    `scoreName` String,
    `dataType` String,
    `valueNumeric` Float64 DEFAULT 0,
    `valueBoolean` Bool DEFAULT 0,
    `valueCategorical` String DEFAULT '',
    `status` String,
    `modelId` String DEFAULT '',
    `environment` String DEFAULT '',
    `createdAt` DateTime
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(createdAt)
PRIMARY KEY (projectId, scoreName)
ORDER BY (projectId, scoreName, createdAt, scoreId)
TTL createdAt + toIntervalDay(365);
