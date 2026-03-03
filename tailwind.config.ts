import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#0a0a0a",
          card: "#111111",
          elevated: "#1a1a1a",
        },
        accent: {
          blue: "#3b82f6",
          purple: "#8b5cf6",
          cyan: "#06b6d4",
          gradient: {
            from: "#3b82f6",
            via: "#8b5cf6",
            to: "#06b6d4",
          },
        },
        text: {
          primary: "#ffffff",
          secondary: "#a1a1aa",
          muted: "#71717a",
        },
        border: {
          subtle: "#27272a",
          accent: "#3f3f46",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-card":
          "linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.1), rgba(6,182,212,0.1))",
        "gradient-border":
          "linear-gradient(135deg, #3b82f6, #8b5cf6, #06b6d4)",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
