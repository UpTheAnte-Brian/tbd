import type { Config } from "tailwindcss";

const roles = ["primary", "secondary", "accent"] as const;
const steps = ["0", "1", "2"] as const;
const utilityPrefixes = ["bg", "text", "border", "ring", "fill", "stroke"];
const colorSafelist: string[] = utilityPrefixes.flatMap((prefix) =>
  roles.flatMap((role) => steps.map((step) => `${prefix}-district-${role}-${step}`)),
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
