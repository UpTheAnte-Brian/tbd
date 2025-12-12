import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
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
        satoshi: ["Satoshi", "sans-serif"],
        inter: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
