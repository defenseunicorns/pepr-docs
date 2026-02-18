import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.test.?(m)js"],
    exclude: process.env.VITEST_RUN_E2E
      ? ["**/node_modules/**"]
      : ["**/e2e-*.test.?(m)js", "**/node_modules/**"],
    environment: "node",
    reporters: ["default"],
    pool: "threads",
    globalSetup: [],
    setupFiles: [],
  },
});
