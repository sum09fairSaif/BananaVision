import { Text } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { fontScaleCap } from "../theme/tokens";

// Every string in the app renders through this, so type styles, colors, and
// the text-size cap stay consistent. `tone` is a color token name.
export default function AppText({ variant = "body", tone = "text", style, ...rest }) {
  const { type, colors } = useTheme();
  return (
    <Text
      maxFontSizeMultiplier={fontScaleCap[variant]}
      style={[type[variant], { color: colors[tone] }, style]}
      {...rest}
    />
  );
}
