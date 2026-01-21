import type { Config } from "tailwindcss";

const roles = ["primary", "secondary", "accent"] as const;
const steps = ["0", "1", "2"] as const;
const utilityPrefixes = ["bg", "text", "border", "ring", "fill", "stroke"];
const colorNamespaces = ["brand"] as const;
const colorSafelist: string[] = utilityPrefixes.flatMap((prefix) =>
  colorNamespaces.flatMap((namespace) =>
    roles.flatMap((role) =>
      steps.map((step) => `${prefix}-${namespace}-${role}-${step}`)
    )
  ),
);

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: colorSafelist,
  theme: {
    extend: {
      colors: {
        "brand-primary-0": "var(--brand-primary-0)",
        "brand-primary-1": "var(--brand-primary-1)",
        "brand-primary-2": "var(--brand-primary-2)",
        "brand-secondary-0": "var(--brand-secondary-0)",
        "brand-secondary-1": "var(--brand-secondary-1)",
        "brand-secondary-2": "var(--brand-secondary-2)",
        "brand-accent-0": "var(--brand-accent-0)",
        "brand-accent-1": "var(--brand-accent-1)",
        "brand-accent-2": "var(--brand-accent-2)",
        "surface-page": "var(--surface-page)",
        "surface-card": "var(--surface-card)",
        "surface-inset": "var(--surface-inset)",
        "surface-nav": "var(--surface-nav)",
        "surface-accent": "var(--surface-accent)",
        "text-on-light": "var(--text-on-light)",
        "text-on-dark": "var(--text-on-dark)",
        "border-subtle": "var(--border-subtle)",
        "focus-ring": "var(--focus-ring)",
      },
      fontFamily: {
        brand: ["var(--brand-font-family, Inter)"],
        "brand-body": ["var(--brand-font-family, Inter)"],
        "brand-header1": [
          "var(--brand-font-header1, var(--brand-font-heading, var(--brand-font-family, Inter)))",
        ],
        "brand-header2": [
          "var(--brand-font-header2, var(--brand-font-header1, var(--brand-font-heading, var(--brand-font-family, Inter))))",
        ],
        "brand-subheader": [
          "var(--brand-font-subheader, var(--brand-font-header2, var(--brand-font-header1, var(--brand-font-heading, var(--brand-font-family, Inter)))))",
        ],
        "brand-heading": ["var(--brand-font-heading, var(--brand-font-family, Inter))"],
        "brand-display": [
          "var(--brand-font-display, var(--brand-font-header1, var(--brand-font-heading, var(--brand-font-family, Inter))))",
        ],
        "brand-logo": [
          "var(--brand-font-logo, var(--brand-font-display, var(--brand-font-header1, var(--brand-font-heading, var(--brand-font-family, Inter)))))",
        ],
        satoshi: ["Satoshi", "sans-serif"],
        inter: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
