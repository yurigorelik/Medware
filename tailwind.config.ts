import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cool, clinical neutrals. Remapping `gray` onto the slate ramp lifts
        // every existing text-gray-*/bg-gray-* in the app at once.
        gray: colors.slate,

        // Primary: a calmer, slightly deeper clinical blue than Tailwind's.
        primary: {
          50: "#eef4ff",
          100: "#dbe6fe",
          200: "#bfd3fe",
          300: "#93b4fd",
          400: "#608efa",
          500: "#3b6bf6",
          600: "#254ceb",
          700: "#1d3ad8",
          800: "#1e32af",
          900: "#1e3089",
          950: "#171f54",
        },

        // Accent: teal — health/vitality moments, gradients, secondary charts.
        accent: {
          50: "#effcfa",
          100: "#c9f7f0",
          200: "#93eee2",
          300: "#56ddd1",
          400: "#28c3ba",
          500: "#0fa6a0",
          600: "#088581",
          700: "#0b6a68",
          800: "#0d5454",
          900: "#104646",
          950: "#022a2b",
        },
      },

      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },

      fontSize: {
        // Tighter tracking at display sizes reads more refined.
        "display-sm": ["2rem", { lineHeight: "1.15", letterSpacing: "-0.02em" }],
        "display-md": [
          "2.75rem",
          { lineHeight: "1.1", letterSpacing: "-0.025em" },
        ],
        "display-lg": [
          "3.75rem",
          { lineHeight: "1.05", letterSpacing: "-0.03em" },
        ],
      },

      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
        "3xl": "1.5rem",
      },

      boxShadow: {
        // Layered, low-alpha shadows — softer and more natural than the stock ramp.
        xs: "0 1px 2px 0 rgb(15 23 42 / 0.04)",
        sm: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
        DEFAULT:
          "0 1px 3px 0 rgb(15 23 42 / 0.06), 0 4px 8px -2px rgb(15 23 42 / 0.06)",
        md: "0 2px 4px -1px rgb(15 23 42 / 0.05), 0 8px 16px -4px rgb(15 23 42 / 0.08)",
        lg: "0 4px 6px -2px rgb(15 23 42 / 0.05), 0 16px 28px -8px rgb(15 23 42 / 0.10)",
        xl: "0 8px 12px -4px rgb(15 23 42 / 0.06), 0 28px 48px -12px rgb(15 23 42 / 0.14)",
        ring: "0 0 0 1px rgb(15 23 42 / 0.06)",
        glow: "0 8px 24px -6px rgb(37 76 235 / 0.35)",
        "glow-lg": "0 12px 40px -8px rgb(37 76 235 / 0.40)",
      },

      backgroundImage: {
        "grid-fade":
          "linear-gradient(to right, rgb(148 163 184 / 0.13) 1px, transparent 1px), linear-gradient(to bottom, rgb(148 163 184 / 0.13) 1px, transparent 1px)",
      },

      backgroundSize: {
        grid: "44px 44px",
      },

      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgb(37 76 235 / 0.30)" },
          "70%": { boxShadow: "0 0 0 10px rgb(37 76 235 / 0)" },
          "100%": { boxShadow: "0 0 0 0 rgb(37 76 235 / 0)" },
        },
      },

      animation: {
        "fade-in": "fade-in 0.35s ease-out both",
        "fade-in-up": "fade-in-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) both",
        "scale-in": "scale-in 0.16s cubic-bezier(0.16, 1, 0.3, 1) both",
        "slide-down": "slide-down 0.18s cubic-bezier(0.16, 1, 0.3, 1) both",
        shimmer: "shimmer 1.8s infinite",
        "pulse-ring": "pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },

      transitionTimingFunction: {
        smooth: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
