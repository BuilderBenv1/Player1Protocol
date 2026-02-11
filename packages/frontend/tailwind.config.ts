import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        avax: {
          red: "#E84142",
          "red-dark": "#C53030",
          "red-light": "#F56565",
          dark: "#0A0A0F",
          darker: "#050508",
          card: "#1A1A2E",
          "card-hover": "#252540",
          border: "#2D2D44",
          text: "#888899",
          "text-light": "#AAAABB",
        },
        rarity: {
          common: "#9CA3AF",
          "common-bg": "#374151",
          rare: "#7C3AED",
          "rare-bg": "#4C1D95",
          legendary: "#F59E0B",
          "legendary-bg": "#92400E",
        },
        tier: {
          bronze: "#CD7F32",
          silver: "#C0C0C0",
          gold: "#FFD700",
          platinum: "#E5E4E2",
          diamond: "#B9F2FF",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "score-pulse": "score-pulse 2s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
        "slide-up": "slide-up 0.3s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
      },
      keyframes: {
        "score-pulse": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.02)" },
        },
        glow: {
          "0%": { boxShadow: "0 0 20px rgba(232, 65, 66, 0.3)" },
          "100%": { boxShadow: "0 0 30px rgba(232, 65, 66, 0.5)" },
        },
        "slide-up": {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "hero-gradient": "linear-gradient(135deg, #0A0A0F 0%, #1A1A2E 50%, #0A0A0F 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
