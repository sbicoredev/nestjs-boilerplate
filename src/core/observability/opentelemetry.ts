import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

// TODO: update to use config
const isProduction = process.env.NODE_ENV === "production";

const traceExporter = isProduction
  ? new OTLPTraceExporter()
  : new OTLPTraceExporter();

const metricsExporter = isProduction
  ? new OTLPMetricExporter()
  : new OTLPMetricExporter();

export const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: process.env.APP_NAME,
    [ATTR_SERVICE_VERSION]: process.env.APP_VERSION || "0.0.1",
  }),
  spanProcessors: [
    new BatchSpanProcessor(traceExporter, {
      maxQueueSize: isProduction ? 1000 : 50,
      maxExportBatchSize: isProduction ? 200 : 50,
      exportTimeoutMillis: isProduction ? 5000 : 2000,
      scheduledDelayMillis: isProduction ? 2000 : 1000,
    }),
  ],
  metricReaders: [
    new PeriodicExportingMetricReader({ exporter: metricsExporter }),
  ],
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable high-volume instrumentation in production
      "@opentelemetry/instrumentation-fs": { enabled: false },
      "@opentelemetry/instrumentation-dns": { enabled: false },

      "@opentelemetry/instrumentation-http": {
        enabled: true,
        ignoreIncomingRequestHook: (req) => {
          const ignorePaths = ["/health", "/metrics", "/favicon.ico"];
          return ignorePaths.some((path) => req.url?.includes(path));
        },
      },
    }),
  ],
});
