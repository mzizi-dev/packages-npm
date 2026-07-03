import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
export default {
  // svelte-package (svelte-package) reads `package` output from here.
  // vitePreprocess enables <script lang="ts"> in components.
  preprocess: vitePreprocess(),
};
