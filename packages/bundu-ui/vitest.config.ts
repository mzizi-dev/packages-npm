// Vitest for @bundu/ui. Astro's getViteConfig compiles .astro files, and the
// React integration lets the server-rendered app patterns render the
// primitives in tests exactly as they render in an app: with no client JS.
import react from "@astrojs/react";
import { getViteConfig } from "astro/config";

export default getViteConfig(
  { test: { include: ["src/**/*.test.ts"] } },
  { integrations: [react()], logLevel: "error" },
);
