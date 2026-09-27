import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "packages/core/src/**/*.test.ts"],
    environment: "node",
  },
});
