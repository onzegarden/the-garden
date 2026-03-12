import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        garden: {
          green: "#1B4D2E",
          yellow: "#D4E600",
          white: "#FFFFFF",
          black: "#0A0A0A",
          "green-light": "#F2F7F4",
          "green-muted": "#E8F2EC",
          "green-dim": "#2A6040",
          "yellow-dim": "#BDD000",
          "surface": "#FAFAFA",
          "border": "#E5EDE8",
          "text-muted": "#6B7F72",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "sans-serif"],
        mono: ["var(--font-dm-mono)", "DM Mono", "monospace"],
      },
      fontSize: {
        "display-xl": ["64px", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-lg": ["48px", { lineHeight: "1.15", letterSpacing: "-0.02em" }],
        "display-md": ["36px", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        "display-sm": ["24px", { lineHeight: "1.3", letterSpacing: "-0.01em" }],
      },
      borderRadius: {
        card: "8px",
        tag: "4px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(27, 77, 46, 0.06)",
        "card-hover": "0 4px 16px rgba(27, 77, 46, 0.10)",
        modal: "0 24px 64px rgba(10, 10, 10, 0.12)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "backdrop-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-in": {
          "0%": { opacity: "0", transform: "translateX(24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(100%)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 300ms ease forwards",
        "fade-up": "fade-up 400ms ease forwards",
        "scale-in": "scale-in 250ms ease forwards",
        "backdrop-in": "backdrop-in 200ms ease forwards",
        "slide-in": "slide-in 280ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-up": "slide-up 320ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
    },
  },
  plugins: [],
};
export default config;
