// Vitest for @bundu/ui. Astro's getViteConfig compiles .astro files so the
// app patterns are tested as the HTML an app ships. No framework
// integration is added: the app components are pure Astro, and a test
// render with no renderer registered proves it.
import { getViteConfig } from "astro/config";

export default getViteConfig(
  { test: { include: ["src/**/*.test.ts"] } },
  { logLevel: "error" },
);
