/* @nyuchi/ui — Tailwind v3 colour map. GENERATED FILE — DO NOT EDIT.

   Generator  scripts/generate-tokens.mjs  (`pnpm tokens:build`)
   Gate       `pnpm tokens:check`

   Spread into `theme.extend.colors` by ./tailwind-preset.mjs. Every value
   is a var() into styles/tokens.css — there is no hex in this file, so
   light/dark and the brand-*.css overlays all keep working. */

export const colors = {
  /* Seven African Minerals. */
  cobalt: {
    DEFAULT: "var(--color-cobalt)",
    container: "var(--color-cobalt-container)",
    "on-container": "var(--color-cobalt-on-container)",
  },
  tanzanite: {
    DEFAULT: "var(--color-tanzanite)",
    container: "var(--color-tanzanite-container)",
    "on-container": "var(--color-tanzanite-on-container)",
  },
  malachite: {
    DEFAULT: "var(--color-malachite)",
    container: "var(--color-malachite-container)",
    "on-container": "var(--color-malachite-on-container)",
  },
  gold: {
    DEFAULT: "var(--color-gold)",
    container: "var(--color-gold-container)",
    "on-container": "var(--color-gold-on-container)",
  },
  terracotta: {
    DEFAULT: "var(--color-terracotta)",
    container: "var(--color-terracotta-container)",
    "on-container": "var(--color-terracotta-on-container)",
  },
  sodalite: {
    DEFAULT: "var(--color-sodalite)",
    container: "var(--color-sodalite-container)",
    "on-container": "var(--color-sodalite-on-container)",
  },
  copper: {
    DEFAULT: "var(--color-copper)",
    container: "var(--color-copper-container)",
    "on-container": "var(--color-copper-on-container)",
  },

  /* Seven heritage tones. NOTE: `indigo` shadows Tailwind's built-in
     indigo scale — `bg-indigo-500` becomes unavailable, `bg-indigo` is
     the heritage tone. The estate forbids default-palette utilities
     anyway (bundu-labs/marketing scripts/check-token-consistency.mjs). */
  indigo: "var(--color-indigo)",
  savanna: "var(--color-savanna)",
  baobab: "var(--color-baobab)",
  sunset: "var(--color-sunset)",
  river: "var(--color-river)",
  hematite: "var(--color-hematite)",
  kalahari: "var(--color-kalahari)",

  /* Seven experimental tones. */
  ember: {
    DEFAULT: "var(--color-ember)",
    container: "var(--color-ember-container)",
    "on-container": "var(--color-ember-on-container)",
    ui: "var(--color-ember-ui)",
  },
  acacia: {
    DEFAULT: "var(--color-acacia)",
    container: "var(--color-acacia-container)",
    "on-container": "var(--color-acacia-on-container)",
    ui: "var(--color-acacia-ui)",
  },
  fern: {
    DEFAULT: "var(--color-fern)",
    container: "var(--color-fern-container)",
    "on-container": "var(--color-fern-on-container)",
    ui: "var(--color-fern-ui)",
  },
  lagoon: {
    DEFAULT: "var(--color-lagoon)",
    container: "var(--color-lagoon-container)",
    "on-container": "var(--color-lagoon-on-container)",
    ui: "var(--color-lagoon-ui)",
  },
  storm: {
    DEFAULT: "var(--color-storm)",
    container: "var(--color-storm-container)",
    "on-container": "var(--color-storm-on-container)",
    ui: "var(--color-storm-ui)",
  },
  dusk: {
    DEFAULT: "var(--color-dusk)",
    container: "var(--color-dusk-container)",
    "on-container": "var(--color-dusk-on-container)",
    ui: "var(--color-dusk-ui)",
  },
  protea: {
    DEFAULT: "var(--color-protea)",
    container: "var(--color-protea-container)",
    "on-container": "var(--color-protea-on-container)",
    ui: "var(--color-protea-ui)",
  },

  /* Nine-step surface ladder. */
  pitch: "var(--pitch)",
  void: "var(--void)",
  base: "var(--base)",
  surface: "var(--surface)",
  container: "var(--container)",
  overlay: "var(--overlay)",
  raised: "var(--raised)",
  scrim: "var(--scrim)",
  wash: "var(--wash)",
  "surface-muted": "var(--surface-muted)",

  /* Connectivity status trio. */
  syncing: "var(--syncing)",
  offline: "var(--offline)",
  neutral: "var(--neutral)",

  /* Semantic tokens — the shadcn/Tailwind contract. */
  background: "var(--background)",
  foreground: "var(--foreground)",
  canvas: "var(--canvas)",
  ink: "var(--ink)",
  primary: {
    DEFAULT: "var(--primary)",
    foreground: "var(--primary-foreground)",
  },
  secondary: {
    DEFAULT: "var(--secondary)",
    foreground: "var(--secondary-foreground)",
  },
  muted: {
    DEFAULT: "var(--muted)",
    foreground: "var(--muted-foreground)",
  },
  accent: {
    DEFAULT: "var(--accent)",
    foreground: "var(--accent-foreground)",
  },
  destructive: {
    DEFAULT: "var(--destructive)",
    foreground: "var(--destructive-foreground)",
  },
  card: {
    DEFAULT: "var(--card)",
    foreground: "var(--card-foreground)",
  },
  popover: {
    DEFAULT: "var(--popover)",
    foreground: "var(--popover-foreground)",
  },
  border: "var(--border)",
  input: "var(--input)",
  ring: "var(--ring)",
  success: "var(--success)",
  warning: "var(--warning)",
  error: "var(--error)",
  info: "var(--info)",
  "brand-accent": {
    DEFAULT: "var(--brand-accent)",
    foreground: "var(--brand-accent-foreground)",
  },
};

/* The 21 colour family names, in canon order. Used for the v3 preset's
   safelist: mineral utilities are often composed from data
   (`bg-${mineral}`), which Tailwind's scanner cannot see. */
export const families = [
  "cobalt",
  "tanzanite",
  "malachite",
  "gold",
  "terracotta",
  "sodalite",
  "copper",
  "indigo",
  "savanna",
  "baobab",
  "sunset",
  "river",
  "hematite",
  "kalahari",
  "ember",
  "acacia",
  "fern",
  "lagoon",
  "storm",
  "dusk",
  "protea",
];
