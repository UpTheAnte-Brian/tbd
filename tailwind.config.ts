import type { Config } from "tailwindcss";

const roles = ["primary", "secondary", "accent"] as const;
const steps = ["0", "1", "2"] as const;
const utilityPrefixes = ["bg", "text", "border", "ring", "fill", "stroke"];
const colorNamespaces = ["district", "brand"] as const;
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
        "district-primary-0": "var(--district-primary-0)",
        "district-primary-1": "var(--district-primary-1)",
        "district-primary-2": "var(--district-primary-2)",
        "district-secondary-0": "var(--district-secondary-0)",
        "district-secondary-1": "var(--district-secondary-1)",
        "district-secondary-2": "var(--district-secondary-2)",
        "district-accent-0": "var(--district-accent-0)",
        "district-accent-1": "var(--district-accent-1)",
        "district-accent-2": "var(--district-accent-2)",
        "uta-primary-dark": "var(--uta-primary-dark)",
        "uta-primary-light": "var(--uta-primary-light)",
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
        district: ["var(--district-font-family, Inter)"],
        "district-body": ["var(--district-font-family, Inter)"],
        "district-header1": [
          "var(--district-font-header1, var(--district-font-heading, var(--district-font-family, Inter)))",
        ],
        "district-header2": [
          "var(--district-font-header2, var(--district-font-header1, var(--district-font-heading, var(--district-font-family, Inter))))",
        ],
        "district-subheader": [
          "var(--district-font-subheader, var(--district-font-header2, var(--district-font-header1, var(--district-font-heading, var(--district-font-family, Inter)))))",
        ],
        "district-heading": ["var(--district-font-heading, var(--district-font-family, Inter))"],
        "district-display": [
          "var(--district-font-display, var(--district-font-header1, var(--district-font-heading, var(--district-font-family, Inter))))",
        ],
        "district-logo": [
          "var(--district-font-logo, var(--district-font-display, var(--district-font-header1, var(--district-font-heading, var(--district-font-family, Inter)))))",
        ],
        satoshi: ["Satoshi", "sans-serif"],
        inter: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
