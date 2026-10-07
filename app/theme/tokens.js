// Design tokens: the single source for color, type, space, shape, depth, and motion.
// Palette "Lagoon": deep blue-green ink on a soft green-grey canvas, pastel green
// and mist tints for surfaces, turquoise kept for moments of activity (scanning).
// Every text color is checked against its background for WCAG 2.2 AA (≥ 4.5:1).
import { Easing, Platform } from "react-native";

export const lightColors = {
  canvas: "#F3F6F2",
  canvasClear: "rgba(243, 246, 242, 0)",
  heroFrom: "#DFF1E6",
  heroTo: "#D1EBE7",
  elevated: "#FFFFFF",
  sunken: "#E8EFEA",
  sunkenPressed: "#DCE6E0",
  mist: "#DDEFEC",
  pastel: "#D5EDDD",
  onPastel: "#1D4A3C",
  hairline: "rgba(16, 42, 40, 0.09)",
  separator: "rgba(16, 42, 40, 0.16)",

  ink: "#102A28",
  ink2: "#4B605C",
  ink3: "#586C68",

  accent: "#0F6B63",
  accentPressed: "#0B5751",
  onAccent: "#FFFFFF",
  accentSoft: "#D4ECE7",
  onAccentSoft: "#0B544D",
  turquoise: "#2FBFB1",

  positive: "#1F6E47",
  positiveSoft: "#DCEFE3",
  caution: "#8A5B00",
  cautionSoft: "#F8EBCD",
  critical: "#A8321F",
  criticalSoft: "#F8E3DE",

  shadow: "#0C2A26",

  // Ripeness hues, tuned to sit naturally beside the greens. Always paired
  // with a text label, so color never carries meaning on its own.
  stage: {
    unripe: "#86A94F",
    ripe: "#EDC23A",
    overripe: "#CF8D32",
    rotten: "#6A4C34",
  },
};

export const darkColors = {
  canvas: "#0A1413",
  canvasClear: "rgba(10, 20, 19, 0)",
  heroFrom: "#15322C",
  heroTo: "#0F2729",
  elevated: "#121E1C",
  sunken: "#172523",
  sunkenPressed: "#1E2F2C",
  mist: "#12302D",
  pastel: "#173A2E",
  onPastel: "#BFE8D2",
  hairline: "rgba(226, 244, 239, 0.08)",
  separator: "rgba(226, 244, 239, 0.16)",

  ink: "#E6F1EE",
  ink2: "#A6BAB5",
  ink3: "#81958F",

  accent: "#5BD3C1",
  accentPressed: "#48BFAE",
  onAccent: "#062320",
  accentSoft: "#143532",
  onAccentSoft: "#8FE6D8",
  turquoise: "#3DD6C6",

  positive: "#7DD9A4",
  positiveSoft: "#12291D",
  caution: "#F0C36A",
  cautionSoft: "#2A2211",
  critical: "#FF9580",
  criticalSoft: "#2E1714",

  shadow: "#000000",

  stage: {
    unripe: "#9CC466",
    ripe: "#F2CB52",
    overripe: "#DDA04E",
    rotten: "#A57C5B",
  },
};

// Fraunces (a soft, warm serif) carries headlines and numbers; DM Sans carries
// everything you read quickly. The pairing reads editorial rather than "app template".
export const fonts = {
  display: "Fraunces_600SemiBold",
  displayItalic: "Fraunces_600SemiBold_Italic",
  text: "DMSans_400Regular",
  textMedium: "DMSans_500Medium",
  textSemibold: "DMSans_600SemiBold",
};

export const type = {
  hero: { fontFamily: fonts.display, fontSize: 44, lineHeight: 50, letterSpacing: -1.1 },
  display: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, letterSpacing: -0.7 },
  title: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, letterSpacing: -0.4 },
  metric: {
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.5,
    fontVariant: ["tabular-nums"],
  },
  headline: { fontFamily: fonts.textSemibold, fontSize: 17, lineHeight: 24, letterSpacing: -0.2 },
  body: { fontFamily: fonts.text, fontSize: 17, lineHeight: 26, letterSpacing: -0.1 },
  subhead: { fontFamily: fonts.textMedium, fontSize: 15, lineHeight: 22, letterSpacing: -0.1 },
  callout: { fontFamily: fonts.text, fontSize: 15, lineHeight: 22 },
  footnote: { fontFamily: fonts.text, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.textMedium, fontSize: 12, lineHeight: 16, letterSpacing: 0.1 },
  eyebrow: {
    fontFamily: fonts.textSemibold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  button: { fontFamily: fonts.textSemibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
};

// Large type scales less with the OS text-size setting so it can't crowd out actions.
export const fontScaleCap = {
  hero: 1.25,
  display: 1.3,
  title: 1.4,
  metric: 1.3,
  headline: 1.8,
  body: 2,
  subhead: 2,
  callout: 2,
  footnote: 2,
  caption: 1.8,
  eyebrow: 1.6,
  button: 1.5,
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
  xxxl: 44,
  huge: 64,
};

export const radius = {
  sm: 10,
  md: 14,
  button: 18,
  card: 24,
  sheet: 32,
  pill: 999,
};

export const motion = {
  fast: 160,
  base: 260,
  slow: 480,
  // Expo-out: quick start, long gentle settle — how physical things come to rest.
  easeOut: Easing.bezier(0.16, 1, 0.3, 1),
  easeInOut: Easing.bezier(0.65, 0, 0.35, 1),
};

// Camera and photo overlays stay dark in both themes.
export const overlay = {
  foreground: "#FFFFFF",
  foregroundMuted: "rgba(255, 255, 255, 0.78)",
  scrim: "rgba(6, 14, 13, 0.32)",
  frame: "rgba(255, 255, 255, 0.92)",
  accent: "#7FE6D8",
  caution: "#F4CD78",
};

export const HIT_TARGET = 48;

// Soft, low, tinted shadows in light mode. Dark mode can't show shadows, so
// depth comes from a hairline edge instead.
export function elevation(level, { dark, colors }, tint) {
  if (dark) {
    return level === 0 ? null : { borderWidth: 1, borderColor: colors.hairline };
  }
  const presets = {
    1: { opacity: 0.08, radius: 10, y: 3, android: 1 },
    2: { opacity: 0.1, radius: 24, y: 10, android: 3 },
  };
  const p = presets[level];
  if (!p) return null;
  return {
    shadowColor: tint ?? colors.shadow,
    shadowOpacity: tint ? 0.24 : p.opacity,
    shadowRadius: p.radius,
    shadowOffset: { width: 0, height: p.y },
    // Android shadows are always grey; skip them for tinted (colored) shadows.
    elevation: Platform.OS === "android" && tint ? 0 : p.android,
  };
}
