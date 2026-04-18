import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Fraunces", "Georgia", "serif"],
      },
      colors: {
        ink: "#111111",
        paper: "#fafaf7",
        line: "#e5e4dc",
        clay: "#b8a78c",
        forest: "#2e3b2a",
      },
    },
  },
  plugins: [],
};

export default config;
