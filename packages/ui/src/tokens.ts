// GENERATED from tokens.json by scripts/build-tokens.mjs. Do not edit.
export const tokens = {
  "default": {
    "--bg": "#F6F4EF",
    "--surface": "#FFFFFF",
    "--surface-2": "#F0EDE6",
    "--ink": "#16141D",
    "--ink-2": "#4A4756",
    "--muted": "#6E6A7A",
    "--line": "#E4E0D8",
    "--brand": "#5B3DF5",
    "--brand-2": "#7C63FF",
    "--brand-soft": "#ECE8FF",
    "--accent": "#FF6B3D",
    "--accent-soft": "#FFE9E1",
    "--ok": "#11845B",
    "--ok-soft": "#DDF5EA",
    "--warn": "#B57A00",
    "--warn-soft": "#FFF3D6",
    "--danger": "#D9363E",
    "--danger-soft": "#FDE3E4",
    "--radius": "18px",
    "--radius-sm": "12px",
    "--shadow": "0 1px 2px rgba(22,20,29,.06),0 8px 24px rgba(22,20,29,.06)",
    "--font": "'Plus Jakarta Sans',system-ui,-apple-system,Segoe UI,Roboto,sans-serif",
    "--display": "'Fraunces',Georgia,serif",
    "--fs": "16px"
  },
  "highContrast": {
    "--bg": "#000",
    "--surface": "#000",
    "--surface-2": "#111",
    "--ink": "#fff",
    "--ink-2": "#fff",
    "--muted": "#E6E6E6",
    "--line": "#fff",
    "--brand": "#FFE600",
    "--brand-2": "#FFE600",
    "--brand-soft": "#222",
    "--accent": "#00E5FF",
    "--accent-soft": "#111",
    "--ok": "#4DFF9A",
    "--ok-soft": "#002611",
    "--warn": "#FFD24D",
    "--warn-soft": "#261C00",
    "--danger": "#FF6B6B",
    "--danger-soft": "#2A0000",
    "--shadow": "none"
  },
  "largeText": {
    "--fs": "19px"
  }
} as const;
export type TokenMode = keyof typeof tokens;
