import { defineConfig } from "@pandacss/dev";

export default defineConfig({
  // Whether to use css reset
  preflight: false,

  // Where to look for your css declarations
  include: ["./src/**/*.{js,jsx,ts,tsx}", "./pages/**/*.{js,jsx,ts,tsx}"],

  // Files to exclude
  exclude: [],

  // Useful for theme customization
  theme: {
    // Responsive breakpoints (Panda defaults when not overridden)
    // - base: < sm (no media query; default styles)
    // - sm:   640px
    // - md:   768px
    // - lg:  1024px
    // - xl:  1280px
    // - 2xl: 1536px
    //
    // Example: { base: "column", xl: "row" } means:
    // - base: column layout by default
    // - xl+:  switch to row layout at ≥ 1280px
    breakpoints: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px"
    },
    extend: {
      tokens: {
        colors: {
          dracula: {
            bg: { value: "#282a36" },
            currentLine: { value: "#44475a" },
            fg: { value: "#f8f8f2" },
            comment: { value: "#6272a4" },
            cyan: { value: "#8be9fd" },
            green: { value: "#50fa7b" },
            orange: { value: "#ffb86c" },
            pink: { value: "#ff79c6" },
            purple: { value: "#bd93f9" },
            red: { value: "#ff5555" },
            yellow: { value: "#f1fa8c" },
          },
        },
        radii: {
          pill: { value: "9999px" },
          card: { value: "12px" },
        },
      },
      semanticTokens: {
        colors: {
          bg: {
            canvas: { value: "{colors.dracula.bg}" },
            surface: { value: "{colors.dracula.currentLine}" },
            elevated: { value: "#f8fafc" },
            subtle: { value: "#eef2f7" },
          },
          text: {
            main: { value: "{colors.dracula.fg}" },
            muted: { value: "{colors.dracula.comment}" },
            strong: { value: "#111827" },
            subtle: { value: "#6b7280" },
          },
          accent: {
            primary: { value: "{colors.dracula.purple}" },
            secondary: { value: "{colors.dracula.cyan}" },
          },
          status: {
            running: { value: "{colors.dracula.green}" },
            break: { value: "{colors.dracula.orange}" },
            error: { value: "{colors.dracula.red}" },
            info: { value: "#60a5fa" },
          }
        },
        borders: {
          subtle: { value: "#d8dee9" },
          strong: { value: "#b8c0cc" },
        }
      }
    },
  },

  // The output directory for your css system
  outdir: "styled-system",
});
