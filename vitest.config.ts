import { configDefaults, defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    fileParallelism: false,
    // Probar las suites del proyecto, sin descubrir copias temporales en work/.
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    exclude: [...configDefaults.exclude, "tests/e2e/**"],
    testTimeout: 15000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/server.ts",
        "src/web/**",
        "src/shared/config.ts",
        "src/composition.ts",
      ],
      thresholds: { lines: 80, branches: 80, functions: 80, statements: 80 },
      reporter: ["text", "json-summary", "html"],
    },
  },
});
