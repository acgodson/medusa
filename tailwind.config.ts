import type { Config } from "tailwindcss";

import { default as flattenColorPalette } from "tailwindcss/lib/util/flattenColorPalette";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      animation: {
        aurora: "aurora 80s linear infinite",
      },
      keyframes: {
        aurora: {
          from: {
            backgroundPosition:
              "50% 50%, 0% 0%, 25% 25%, 50% 50%, 75% 75%, 100% 100%",
          },
          to: {
            backgroundPosition:
              "50% 50%, 100% 100%, 125% 125%, 150% 150%, 175% 175%, 200% 200%",
          },
        },
      },
      colors: {
        primary: "var(--medusa-gold)",
        "primary-foreground": "var(--medusa-black)",
        secondary: "var(--medusa-black)",
        "secondary-foreground": "var(--medusa-gold)",
        accent: "var(--medusa-light)",
        "accent-foreground": "var(--medusa-black)",
      },
    },
  },
  plugins: [addVariablesForColors],
} satisfies Config;

export default config;

function addVariablesForColors({ addBase, theme }: any) {
  let allColors = flattenColorPalette(theme("colors"));
  let newVars = Object.fromEntries(
    Object.entries(allColors).map(([key, val]) => [`--${key}`, val])
  );

  addBase({
    ":root": newVars,
  });
}
