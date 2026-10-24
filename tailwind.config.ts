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
        // Core Surface & Canvas Tokens
        background: "#FAF9F7",
        surface: "#FAF9F7",
        "surface-bright": "#FAF9F7",
        "surface-light": "#FAF9F7",
        "surface-dim": "#DADAD8",
        "surface-container-lowest": "#FFFFFF",
        "surface-container-low": "#F4F3F1",
        "surface-container": "#EFEEEC",
        "surface-container-high": "#E9E8E6",
        "surface-container-highest": "#E3E2E0",
        "surface-variant": "#E3E2E0",
        "surface-dark": "#14151A",
        "card-surface": "#FFFFFF",

        // Text & Content Contrast Tokens
        "text-primary": "#14151A",
        "text-secondary": "#6B7280",
        "on-background": "#1A1C1B",
        "on-surface": "#1A1C1B",
        "on-surface-variant": "#5D3F3D",
        "inverse-surface": "#2F3130",
        "inverse-on-surface": "#F1F1EF",

        // Primary Brand Accent Tokens (Flat Red / No Gradients)
        primary: "#B8001D",
        "on-primary": "#FFFFFF",
        "primary-container": "#E11D2E",
        "primary-hover": "#C81423",
        "on-primary-container": "#FFF8F7",
        "inverse-primary": "#FFB3AE",
        "primary-fixed": "#FFDAD7",
        "primary-fixed-dim": "#FFB3AE",
        "on-primary-fixed": "#410004",
        "on-primary-fixed-variant": "#930015",
        "surface-tint": "#C0001F",

        // Secondary Functional Tokens
        secondary: "#5E5E64",
        "on-secondary": "#FFFFFF",
        "secondary-container": "#E3E1E9",
        "on-secondary-container": "#64646A",
        "secondary-fixed": "#E3E1E9",
        "secondary-fixed-dim": "#C7C6CD",
        "on-secondary-fixed": "#1A1B20",
        "on-secondary-fixed-variant": "#46464C",

        // Tertiary Editorial Tokens
        tertiary: "#805000",
        "on-tertiary": "#FFFFFF",
        "tertiary-container": "#A16600",
        "on-tertiary-container": "#FFF9F5",
        "tertiary-fixed": "#FFDDB8",
        "tertiary-fixed-dim": "#FFB95F",
        "on-tertiary-fixed": "#2A1700",
        "on-tertiary-fixed-variant": "#653E00",

        // Semantic Feedback & Status Tokens
        error: "#BA1A1A",
        "on-error": "#FFFFFF",
        "error-container": "#FFDAD6",
        "on-error-container": "#93000A",
        "urgency-amber": "#F59E0B",
        "urgency-amber-bg": "#FEF3C7",
        "success-green": "#16A34A",
        "success-green-bg": "#DCFCE7",

        // Hairlines & Borders
        outline: "#916F6C",
        "outline-variant": "#E6BDB9",
        "border-hairline": "#E5E3DF",
      },
      borderRadius: {
        DEFAULT: "0.25rem", // 4px
        sm: "0.25rem",      // 4px
        md: "0.5rem",       // 8px
        lg: "0.5rem",       // 8px
        xl: "0.75rem",      // 12px (Form inputs & action buttons)
        "2xl": "1rem",      // 16px (Standard cards & dialogs)
        "3xl": "1.25rem",   // 20px (Floating glassmorphic panels)
        "4xl": "1.5rem",    // 24px
        full: "9999px",     // Pills & chips
      },
      spacing: {
        "space-xs": "0.25rem",   // 4px
        "space-sm": "0.5rem",    // 8px
        "space-md": "1rem",      // 16px
        "space-lg": "1.5rem",    // 24px
        "space-xl": "2rem",      // 32px
        "space-2xl": "3rem",     // 48px
        gutter: "1rem",          // 16px
        "gutter-mobile": "0.75rem", // 12px
        margin: "1.5rem",        // 24px
        "margin-mobile": "1rem", // 16px
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        display: ["Inter", "sans-serif"],
        headline: ["Inter", "sans-serif"],
      },
      fontSize: {
        "display-lg": ["40px", { lineHeight: "48px", letterSpacing: "-0.03em", fontWeight: "800" }],
        "display-lg-mobile": ["32px", { lineHeight: "38px", letterSpacing: "-0.025em", fontWeight: "800" }],
        "headline-lg": ["28px", { lineHeight: "34px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-md": ["22px", { lineHeight: "28px", letterSpacing: "-0.015em", fontWeight: "700" }],
        "headline-sm": ["18px", { lineHeight: "24px", letterSpacing: "-0.01em", fontWeight: "700" }],
        "title-md": ["16px", { lineHeight: "22px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "body-lg": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "body-sm": ["12px", { lineHeight: "16px", fontWeight: "400" }],
        "label-lg": ["14px", { lineHeight: "18px", letterSpacing: "0.01em", fontWeight: "600" }],
        "label-md": ["12px", { lineHeight: "16px", letterSpacing: "0.02em", fontWeight: "600" }],
        "label-badge": ["11px", { lineHeight: "14px", letterSpacing: "0.02em", fontWeight: "700" }],
        "numeral-price": ["20px", { lineHeight: "24px", letterSpacing: "-0.02em", fontWeight: "700" }],
      },
      boxShadow: {
        hairline: "0 0 0 1px #E5E3DF",
        header: "0 1px 8px rgba(20, 21, 26, 0.04)",
        "glass-light": "0 4px 24px rgba(20, 21, 26, 0.08)",
        "glass-dark": "0 8px 32px rgba(0, 0, 0, 0.24)",
        "card-hover": "0 8px 30px rgba(0, 0, 0, 0.12)",
        "bottom-sheet": "0 -4px 24px rgba(20, 21, 26, 0.08)",
      },
      keyframes: {
        "bounce-slow": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-3px)" },
        },
        wave: {
          "0%, 100%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(-8deg)" },
          "75%": { transform: "rotate(8deg)" },
        },
        "scale-up": {
          "0%": { transform: "scale(0.95)" },
          "50%": { transform: "scale(1.08)" },
          "100%": { transform: "scale(1)" },
        },
        "bounce-in": {
          "0%": { opacity: "0", transform: "scale(0.3) translateY(8px)" },
          "60%": { opacity: "1", transform: "scale(1.05) translateY(-2px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
      },
      animation: {
        "bounce-slow": "bounce-slow 3s infinite ease-in-out",
        wave: "wave 1s infinite",
        "scale-up": "scale-up 0.4s ease-out",
        "bounce-in": "bounce-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
