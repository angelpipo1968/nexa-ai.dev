import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        nexa: {
            dark: "#0B0F14",
            surface: "#111827",
            primary: "#2563eb",
            secondary: "#FF00E4",
            text: {
                DEFAULT: "#E5E7EB",
                dim: "#9CA3AF"
            }
        }
      },
      keyframes: {
        'music-bar': {
          '0%, 100%': { height: '100%' },
          '50%': { height: '40%' },
        }
      },
    },
  },
  plugins: [],
};
export default config;
