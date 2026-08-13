import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.e2e-spec.ts"],
    alias: {
      "~": "./src",
    },
    root: "./",
  },
  resolve: {
    alias: {
      "~": "./src",
    },
  },
  plugins: [swc.vite()],
});
