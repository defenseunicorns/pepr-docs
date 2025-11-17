import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode || "test", process.cwd(), "");

  return {
    test: {
      include: ["**/*.test.?(m)js"],
      exclude: process.env.VITEST_RUN_E2E
        ? ["**/node_modules/**"]
        : ["**/e2e-*.test.?(m)js", "**/node_modules/**"],
      environment: "node",
      reporters: ["verbose"],
      pool: "threads",
      globalSetup: [],
      setupFiles: [],
      env,
    },
  };
});
