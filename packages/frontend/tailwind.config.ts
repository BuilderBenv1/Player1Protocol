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
          "red-dark": "#B82E2F",
          "red-light": "#FF5A5B",
          "red-glow": "rgba(232, 65, 66, 0.15)",
          dark: "#0C0C0C",
          darker: "#000000",
          card: "#161616",
          "card-hover": "#1E1E1E",
          surface: "#1A1A1A",
          border: "#2A2A2A",
          "border-light": "#3A3A3A",
          text: "#8A8A8A",
          "text-light": "#B0B0B0",
          white: "#F0F0F0",
        },
        rarity: {
          common: "#9CA3AF",
          "common-bg": "rgba(156, 163, 175, 0.15)",
          rare: "#A855F7",
          "rare-bg": "rgba(168, 85, 247, 0.15)",
          legendary: "#F59E0B",
          "legendary-bg": "rgba(245, 158, 11, 0.15)",
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
        sans: ["Inter", "Segoe UI", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Consolas", "monospace"],
        display: ["Inter", "Segoe UI", "system-ui", "sans-serif"],
      },
      fontSize: {
        "hero": ["4.5rem", { lineHeight: "1", letterSpacing: "-0.02em", fontWeight: "800" }],
        "hero-sm": ["2.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "800" }],
        "stat": ["3rem", { lineHeight: "1", fontWeight: "700" }],
        "stat-sm": ["2rem", { lineHeight: "1", fontWeight: "700" }],
      },
      animation: {
        "score-pulse": "score-pulse 3s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
        "glow-subtle": "glow-subtle 3s ease-in-out infinite alternate",
        "slide-up": "slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "fade-in 0.4s ease-out",
        "shimmer": "shimmer 2s linear infinite",
        "pulse-ring": "pulse-ring 2s ease-out infinite",
      },
      keyframes: {
        "score-pulse": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.03)" },
        },
        glow: {
          "0%": { boxShadow: "0 0 20px rgba(232, 65, 66, 0.2), inset 0 0 20px rgba(232, 65, 66, 0.05)" },
          "100%": { boxShadow: "0 0 40px rgba(232, 65, 66, 0.4), inset 0 0 30px rgba(232, 65, 66, 0.1)" },
        },
        "glow-subtle": {
          "0%": { boxShadow: "0 0 10px rgba(232, 65, 66, 0.1)" },
          "100%": { boxShadow: "0 0 20px rgba(232, 65, 66, 0.2)" },
        },
        "slide-up": {
          "0%": { transform: "translateY(16px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.95)", opacity: "1" },
          "100%": { transform: "scale(1.3)", opacity: "0" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "hero-gradient": "radial-gradient(ellipse at 50% 0%, rgba(232, 65, 66, 0.12) 0%, transparent 60%)",
        "card-gradient": "linear-gradient(180deg, rgba(232, 65, 66, 0.04) 0%, transparent 40%)",
        "shimmer-gradient": "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)",
      },
      backdropBlur: {
        xs: "2px",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
