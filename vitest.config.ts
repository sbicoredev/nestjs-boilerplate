import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    root: "./",
    coverage: {
      provider: "v8",
      all: true,
      include: ["src/**/*.ts"],
      reporter: ["text", "lcov"],
      // Modest floor, not a ceiling — raise these as coverage naturally
      // grows rather than chasing 100% on wiring code that unit tests
      // can't meaningfully exercise (DI module classes, entities,
      // migrations, DTOs with no logic).
      thresholds: {
        lines: 85,
        statements: 85,
        functions: 80,
        branches: 70,
      },
      exclude: [
        "**/*.module.ts",
        "**/*.entity.ts",
        "**/*.controller.ts",
        "**/*.dto.ts",
        "**/*.type.ts",
        "**/main.ts",
        "database/migrations/**",
        "src/core/database/data-source.ts",
        "src/common/types.ts",
        "src/common/error/domain-error.ts",
        "src/common/error/problem-details.ts",
        "src/core/http-context/http-context.constants.ts",
        "src/generated/**",
        // Process-bootstrap/wiring, same category as main.ts: registers
        // global side effects once at startup rather than containing
        // decision logic, and is already exercised implicitly by every
        // e2e test (the app has to boot for any of them to run).
        "src/core/observability/opentelemetry.ts",
        "src/common/utils/setup-openapi.ts",
      ],
    },
  },
  plugins: [
    // This is required to build the test files with SWC
    swc.vite({
      // Explicitly set the module type to avoid inheriting this value from a `.swcrc` config file
      module: { type: "es6" },
    }),
  ],
  resolve: {
    alias: {
      "~": "./src",
    },
  },
});
