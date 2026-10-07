import { Text } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { fontScaleCap } from "../theme/tokens";

/**
 * Every string renders through this, so the type scale, colors, and the
 * text-size cap stay consistent.
 *   variant: a key of `type` in tokens.js
 *   tone:    a color token name (ink, ink2, ink3, accent, critical, …)
 *   italic:  switches serif variants to Fraunces Italic, for editorial emphasis
 * Nested AppText must repeat the parent's variant, or it resets the size.
 */
export default function AppText({ variant = "body", tone = "ink", italic = false, style, ...rest }) {
  const { type, colors, fonts } = useTheme();
  const base = type[variant];
  const italicFace =
    italic && base.fontFamily === fonts.display ? { fontFamily: fonts.displayItalic } : null;

  return (
    <Text
      maxFontSizeMultiplier={fontScaleCap[variant]}
      style={[base, { color: colors[tone] }, italicFace, style]}
      {...rest}
    />
  );
}
