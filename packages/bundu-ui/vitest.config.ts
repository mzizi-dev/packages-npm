// Renders the Astro components through Astro's own Vite pipeline, so the
// tests see exactly the markup a consuming site gets.
import { getViteConfig } from "astro/config";

export default getViteConfig({
  test: { include: ["test/**/*.test.ts"], environment: "node" },
});
