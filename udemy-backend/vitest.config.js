import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,          // so you can use describe/it/expect without importing
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    include: ["**/__tests__/**/*.test.js"],
  },
  coverage: {
  provider: "v8",
  reporter: ["text", "html"],
  reportsDirectory: "./coverage",
}
});
