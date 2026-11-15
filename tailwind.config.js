/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          600: "#B45309",
          800: "#92400E",
        },
        promo: {
          700: "#C2410C",
        },
        warm: {
          50: "#FBFAF8",
          100: "#F3F0EB",
          200: "#E7E0D7",
          300: "#D9CEC3",
          400: "#B7AE9F",
          600: "#6E6557",
          900: "#1A1814",
        },
        success: "#15803D",
        error: "#B91C1C",
        warning: "#D97706",
        inverse: "#FFFFFF",
      },
      spacing: {
        "space-1": "0.25rem",
        "space-2": "0.5rem",
        "space-3": "0.75rem",
        "space-4": "1rem",
        "space-5": "1.25rem",
        "space-6": "1.5rem",
        "space-8": "2rem",
        "space-10": "2.5rem",
        "space-12": "3rem",
      },
      borderRadius: {
        "radius-sm": "0.25rem",
        "radius-md": "0.5rem",
        "radius-lg": "0.75rem",
        "radius-full": "9999px",
      },
      fontSize: {
        h1: ["2.25rem", { lineHeight: "1.2", fontWeight: "700" }],
        h2: ["1.875rem", { lineHeight: "1.25", fontWeight: "700" }],
        h3: ["1.5rem", { lineHeight: "1.33", fontWeight: "600" }],
        h4: ["1.25rem", { lineHeight: "1.4", fontWeight: "600" }],
        body: ["1rem", { lineHeight: "1.5", fontWeight: "400" }],
        "body-sm": ["0.875rem", { lineHeight: "1.5", fontWeight: "400" }],
        small: ["0.75rem", { lineHeight: "1.4", fontWeight: "400" }],
        caption: ["0.75rem", { lineHeight: "1.4", fontWeight: "500" }],
        overline: ["0.75rem", { lineHeight: "1.5", fontWeight: "600", letterSpacing: "0.05em" }],
      },
      boxShadow: {
        "sm": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        "md": "0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.03)",
        "focus": "0 0 0 3px rgb(180 83 9 / 0.2)",
      },
      transitionDuration: {
        "fast": "150ms",
        "medium": "250ms",
        "slow": "400ms",
      },
      transitionTimingFunction: {
        "ease-out": "ease-out",
      },
    },
  },
  plugins: [],
};
