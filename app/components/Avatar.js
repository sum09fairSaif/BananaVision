import UserRound from "lucide-react-native/icons/user-round";
import { useTheme } from "../theme/ThemeProvider";
import AppText from "./AppText";
import PressableScale from "./PressableScale";

// Monogram button for the profile. Falls back to a person glyph with no name.
export default function Avatar({ name, size = 44, label, onPress }) {
  const { colors, fonts } = useTheme();
  const initial = name ? name.trim().charAt(0).toUpperCase() : "";

  return (
    <PressableScale
      onPress={onPress}
      pressedScale={0.92}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={label}
      contentStyle={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.pastel,
        borderWidth: 1,
        borderColor: colors.hairline,
      }}
    >
      {initial ? (
        <AppText
          variant="title"
          maxFontSizeMultiplier={1}
          style={{
            fontFamily: fonts.display,
            fontSize: size * 0.44,
            lineHeight: size * 0.56,
            letterSpacing: 0,
            color: colors.onPastel,
          }}
        >
          {initial}
        </AppText>
      ) : (
        <UserRound size={20} color={colors.onPastel} strokeWidth={2} />
      )}
    </PressableScale>
  );
}
