import { defineConfig } from "vitest/config";

// One root config; each workspace is a Vitest project (`vitest run --project core`).
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "core",
          root: "packages/core",
          include: ["src/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "contracts",
          root: "packages/contracts",
          include: ["src/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "backend",
          root: "backend",
          include: ["src/**/*.test.ts"],
          environment: "node",
        },
      },
    ],
  },
});
