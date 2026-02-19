import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: "#1F3864",
        "brand-blue": "#2E75B6",
      },
    },
  },
  plugins: [],
};
export default config;
