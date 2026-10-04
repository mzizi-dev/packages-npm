// Vitest for @bundu/server: plain Node, Web APIs only (Web Crypto, URL, Response).
import { defineConfig } from "vite-plus";

export default defineConfig({
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
