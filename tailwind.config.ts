import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#080A0F",
        panel: "#11131A",
        panelSoft: "#151822",
        line: "rgba(255,255,255,0.08)",
        muted: "#8B95A7",
        accent: "#7C6DFF",
        cyan: "#59D8FF",
        positive: "#49E29B",
        negative: "#FF6F61",
        bitcoin: "#F7931A"
      },
      boxShadow: {
        glow: "0 20px 80px rgba(80, 97, 255, 0.14)",
        panel: "0 18px 60px rgba(0,0,0,0.28)"
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
