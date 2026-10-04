// Vitest for @bundu/ui. Astro's getViteConfig compiles .astro files so the
// app patterns are tested as the HTML an app ships. No framework
// integration is added: the app components are pure Astro, and a test
// render with no renderer registered proves it. `@bundu/server` resolves to
// its source, so the tests need no build of it first.
import { fileURLToPath } from "node:url";

import { getViteConfig } from "astro/config";

export default getViteConfig(
  {
    resolve: {
      alias: {
        "@bundu/server/table": fileURLToPath(
          new URL("../bundu-server/src/table.ts", import.meta.url),
        ),
      },
    },
    test: { include: ["src/**/*.test.ts"] },
  },
  { logLevel: "error" },
);
