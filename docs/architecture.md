# Architecture

## Overview
uncoil is built to handle high-throughput telemetry ingestion and provide real-time, reactive observability dashboards for AI agents.

## Core Components
1. **Next.js 16 App Router**: The primary framework for the UI and API endpoints.
2. **Clerk**: Manages authentication (Users and Organizations). Protects UI routes and issues SDK API keys.
3. **Convex**: The application database. It stores `projects`, `agentRuns` (roll-ups), and `alerts`. It provides real-time WebSocket subscriptions to the UI for live updates.
4. **Tinybird**: A Clickhouse-backed time-series database. It is the destination for all raw `spans`. It handles heavy analytical queries (e.g., aggregations, latency percentiles).
5. **Inngest**: Background job runner. It processes incoming spans asynchronously to prevent blocking the ingestion API and handles the two-phase write (Tinybird raw data + Convex roll-ups).
