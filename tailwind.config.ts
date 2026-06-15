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
        surface: "#f7f7f4",
        ink: "#191a17",
        muted: "#6e7168",
        line: "#dfdfd8",
        accent: "#0f766e",
        coral: "#b4533b"
      },
      boxShadow: {
        soft: "0 18px 55px rgba(18, 25, 22, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
