import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        rolloutBlue: "#1e3a8a",
        rolloutGreen: "#065f46",
      },
    },
  },
  plugins: [],
};

export default config;
