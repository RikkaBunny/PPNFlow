import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Node status colors
        node: {
          idle:    "#1e293b",
          running: "#1e3a5f",
          done:    "#14532d",
          error:   "#450a0a",
          cached:  "#1a1a2e",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
