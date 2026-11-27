// OTLP exporters append /v1/traces to OTEL_EXPORTER_OTLP_ENDPOINT, so the standard path
// serves the same handler as /api/otel.
export { POST } from "../../route.ts";
