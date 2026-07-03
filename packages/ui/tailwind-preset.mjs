/**
 * @nyuchi/ui — Tailwind preset.
 *
 * Framework-agnostic. Consumers add this to `presets` in their
 * tailwind.config so the utility classes the @nyuchi/ui components use
 * (bg-primary, text-muted-foreground, bg-cobalt-container, text-h1, …)
 * generate. All colours resolve to the CSS custom properties defined in
 * styles/globals.css, so light/dark + brand overlays "just work".
 *
 *   // tailwind.config.mjs
 *   import nyuchiPreset from "@nyuchi/ui/tailwind-preset";
 *   export default {
 *     presets: [nyuchiPreset],
 *     content: ["./src/**\/*.{svelte,ts,html}"],
 *   };
 */

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  safelist: [
    {
      pattern:
        /^(bg|text|border|ring)-(cobalt|tanzanite|malachite|gold|terracotta|sodalite|copper)(-container|-on-container)?$/,
    },
  ],
  theme: {
    extend: {
      colors: {
        // === Seven African Minerals ===
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

        // === Semantic tokens ===
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
      },
      fontFamily: {
        sans: ['"Noto Sans"', "system-ui", "sans-serif"],
        serif: ['"Noto Serif"', "Georgia", "serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      fontSize: {
        display: [
          "clamp(2rem, 4vw + 0.75rem, 3.5rem)",
          { lineHeight: "1.1", letterSpacing: "-0.025em", fontWeight: "700" },
        ],
        "display-sm": [
          "clamp(1.875rem, 3vw + 0.75rem, 3rem)",
          { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" },
        ],
        h1: [
          "clamp(2rem, 3vw + 1rem, 3rem)",
          { lineHeight: "1.15", letterSpacing: "-0.02em", fontWeight: "700" },
        ],
        h2: [
          "clamp(1.75rem, 2vw + 1rem, 2.25rem)",
          { lineHeight: "1.2", letterSpacing: "-0.015em", fontWeight: "600" },
        ],
        h3: [
          "clamp(1.5rem, 1.5vw + 1rem, 1.875rem)",
          { lineHeight: "1.25", letterSpacing: "-0.01em", fontWeight: "600" },
        ],
        h4: [
          "1.5rem",
          { lineHeight: "1.3", letterSpacing: "-0.005em", fontWeight: "600" },
        ],
        h5: ["1.25rem", { lineHeight: "1.4", fontWeight: "600" }],
        h6: ["1rem", { lineHeight: "1.4", fontWeight: "600" }],
        "body-lg": ["1.125rem", { lineHeight: "1.6" }],
        body: ["1rem", { lineHeight: "1.6" }],
        "body-sm": ["0.875rem", { lineHeight: "1.5" }],
        caption: ["0.75rem", { lineHeight: "1.5", letterSpacing: "0.02em" }],
      },
      borderRadius: {
        sm: "7px",
        md: "12px",
        lg: "14px",
        xl: "17px",
        "2xl": "17px",
        full: "9999px",
        pill: "9999px",
      },
      maxWidth: {
        prose: "65ch",
        narrow: "42rem",
      },
      transitionTimingFunction: {
        soft: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
};
