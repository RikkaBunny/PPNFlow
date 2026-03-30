import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        canvas: "#0f0f14",
        surface: "#16161e",
        elevated: "#1e1e2a",
        "elevated-hover": "#262636",
        "border-subtle": "#2a2a3a",
        "border-default": "#363648",
        accent: {
          DEFAULT: "#6366f1",
          hover: "#818cf8",
          muted: "rgba(99,102,241,0.15)",
        },
        node: {
          idle: "#1a1a26",
          running: "#1e3a5f",
          done: "#14532d",
          error: "#450a0a",
          cached: "#1a1a2e",
        },
      },
      fontSize: {
        "2xs": ["10px", "14px"],
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
      },
      boxShadow: {
        glow: "0 0 20px -4px rgba(99,102,241,0.3)",
        "node-default": "0 4px 24px -4px rgba(0,0,0,0.5)",
        "node-hover": "0 8px 32px -4px rgba(0,0,0,0.6)",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-in-left": "slideInLeft 0.2s ease-out",
        "slide-in-right": "slideInRight 0.2s ease-out",
        "slide-in-up": "slideInUp 0.2s ease-out",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideInLeft: {
          from: { transform: "translateX(-12px)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        slideInRight: {
          from: { transform: "translateX(12px)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        slideInUp: {
          from: { transform: "translateY(12px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
