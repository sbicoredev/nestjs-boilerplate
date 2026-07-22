import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";

const isProduction = process.env.NODE_ENV === "production";

export const sdk = new NodeSDK({
  spanProcessors: [
    new BatchSpanProcessor(new OTLPTraceExporter(), {
      maxQueueSize: isProduction ? 1000 : 50,
      maxExportBatchSize: isProduction ? 200 : 50,
      exportTimeoutMillis: isProduction ? 5000 : 2000,
      scheduledDelayMillis: isProduction ? 2000 : 1000,
    }),
  ],
  metricReaders: [
    // Push Model - OTEL natively recommend
    new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter(),
      exportIntervalMillis: isProduction ? 5000 : 2000,
    }),
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

async function shutdown(): Promise<void> {
  // Enforce a hard application exit if the SDK takes too long to clean up
  const exitTimeout = setTimeout(() => {
    console.error("Forced shutdown due to SDK timeout");
    process.exit(1);
  }, 10_000);

  try {
    if (sdk) {
      console.log("Shutting down OpenTelemetry SDK...");
      await sdk.shutdown();
    }
  } catch (error) {
    console.error("Error during OpenTelemetry SDK shutdown:", error);
  } finally {
    clearTimeout(exitTimeout);
    process.exit(0);
  }
}

// Handle process termination
process.on("SIGTERM", () => shutdown());
process.on("SIGINT", () => shutdown());
