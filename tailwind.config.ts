import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#05080d",
          900: "#070b10",
          850: "#0b1118",
          800: "#0f1720",
          700: "#162231"
        },
        gold: {
          400: "#f8c14a",
          500: "#dca63a"
        },
        signal: {
          buy: "#34d399",
          sell: "#fb7185",
          hold: "#94a3b8",
          cyan: "#22d3ee"
        }
      },
      boxShadow: {
        panel: "0 18px 48px rgba(0, 0, 0, 0.24)"
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif"
        ]
      }
    }
  },
  plugins: []
};

export default config;
