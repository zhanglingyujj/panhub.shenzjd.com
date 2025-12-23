import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "panhub",
    root: "./",
    include: ["test/unit/**/*.test.ts"],
    environment: "node",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "test/",
        "**/*.d.ts",
        "**/config.ts",
        "**/index.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "#internal": "/Users/mac/github/panhub.shenzjd.com/.nuxt",
    },
  },
});
