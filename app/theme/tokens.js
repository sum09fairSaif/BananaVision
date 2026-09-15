// Design tokens. Every color, size, and duration in the app comes from here,
// so the light and dark palettes can never drift apart.
import { Easing } from "react-native";

// Text colors are checked against their backgrounds for WCAG 2.2 AA (4.5:1).
export const lightColors = {
  background: "#F2F8F6",
  surface: "#FFFFFF",
  surfaceSunken: "#E4F2EE",
  border: "#D3E6E1",
  borderStrong: "#A9CEC6",

  text: "#0B2B2A",
  textSecondary: "#46645F",
  textTertiary: "#58726E",

  primary: "#0E7C72",
  primaryPressed: "#0A645C",
  onPrimary: "#FFFFFF",
  primarySoft: "#D3F1EA",
  onPrimarySoft: "#0A5F57",

  turquoise: "#3CC6BA",
  mint: "#C9EEDA",
  mintDeep: "#8FD9B6",

  success: "#156B3F",
  successSoft: "#DDF4E6",
  warning: "#8A5A00",
  warningSoft: "#FCF1D6",
  danger: "#B3261E",
  dangerSoft: "#FBE7E5",

  scrim: "rgba(4, 22, 21, 0.55)",
  shadow: "#0B3B36",

  // Ripeness is always shown with a label too, so these never carry meaning alone.
  stage: {
    unripe: "#5E9E3A",
    ripe: "#E9B823",
    overripe: "#B97A22",
    rotten: "#6E4B2F",
  },
};

export const darkColors = {
  background: "#061716",
  surface: "#0D2322",
  surfaceSunken: "#0A1D1C",
  border: "#1B3A38",
  borderStrong: "#2C5652",

  text: "#E3F5F1",
  textSecondary: "#A3C7C0",
  textTertiary: "#7FA39C",

  primary: "#4FD1C1",
  primaryPressed: "#3BB8A9",
  onPrimary: "#032B27",
  primarySoft: "#10302E",
  onPrimarySoft: "#7FE3D6",

  turquoise: "#2FA89E",
  mint: "#16392F",
  mintDeep: "#2A6B55",

  success: "#6FD69A",
  successSoft: "#0F2A1C",
  warning: "#F2C46B",
  warningSoft: "#2A2210",
  danger: "#FF8A80",
  dangerSoft: "#2E1413",

  scrim: "rgba(0, 0, 0, 0.6)",
  shadow: "#000000",

  stage: {
    unripe: "#86C95E",
    ripe: "#F2C94C",
    overripe: "#D9A04A",
    rotten: "#A7795A",
  },
};

// Camera screens stay dark in both themes so the viewfinder reads clearly.
export const cameraChrome = {
  scrim: "rgba(0, 0, 0, 0.45)",
  control: "rgba(0, 0, 0, 0.42)",
  controlPressed: "rgba(0, 0, 0, 0.62)",
  controlBorder: "rgba(255, 255, 255, 0.2)",
  foreground: "#FFFFFF",
  accent: "#7FE3D6",
  warning: "#F2C46B",
  onWarning: "#2A2210",
};

// 4-point grid.
export const space = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 56,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
};

// Fixed point sizes; the OS text-size setting scales them up to fontScaleCap.
export const type = {
  display: { fontFamily: "Baloo2_800ExtraBold", fontSize: 40, lineHeight: 46 },
  title1: { fontFamily: "Baloo2_700Bold", fontSize: 30, lineHeight: 36 },
  title2: { fontFamily: "Nunito_800ExtraBold", fontSize: 22, lineHeight: 28 },
  headline: { fontFamily: "Nunito_700Bold", fontSize: 17, lineHeight: 24 },
  body: { fontFamily: "Nunito_500Medium", fontSize: 16, lineHeight: 24 },
  callout: { fontFamily: "Nunito_600SemiBold", fontSize: 15, lineHeight: 22 },
  footnote: { fontFamily: "Nunito_600SemiBold", fontSize: 13, lineHeight: 18 },
  overline: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  button: { fontFamily: "Nunito_800ExtraBold", fontSize: 16, lineHeight: 20 },
};

// Large display text scales less so it can't push buttons off small screens.
export const fontScaleCap = {
  display: 1.3,
  title1: 1.4,
  title2: 1.5,
  headline: 1.8,
  body: 2,
  callout: 2,
  footnote: 2,
  overline: 1.6,
  button: 1.6,
};

export const motion = {
  fast: 160,
  base: 240,
  slow: 420,
  easeOut: Easing.bezier(0.2, 0, 0, 1),
  easeInOut: Easing.bezier(0.4, 0, 0.2, 1),
};

// Minimum touch target: Apple asks for 44pt, Material for 48dp — we use the larger.
export const HIT_TARGET = 48;
