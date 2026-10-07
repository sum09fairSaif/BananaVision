import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { elevation } from "../theme/tokens";
import AppText from "./AppText";
import PressableScale from "./PressableScale";

/**
 * variant: "primary"   the one filled action on a screen
 *          "secondary" tinted, for a strong alternative next to a primary
 *          "plain"     text only, for low-emphasis actions (Skip, Cancel)
 * tone:    "accent" or "neutral" (plain buttons that shouldn't pull the eye)
 * icon:    a lucide-react-native component
 */
export default function Button({
  label,
  onPress,
  variant = "primary",
  tone = "accent",
  size = "large",
  icon: Icon,
  iconPlacement = "trailing",
  loading = false,
  disabled = false,
  accessibilityHint,
  style,
}) {
  const theme = useTheme();
  const { colors, radius, space } = theme;
  const inactive = disabled || loading;
  const large = size === "large";

  const look = {
    primary: {
      background: colors.accent,
      pressed: colors.accentPressed,
      foreground: colors.onAccent,
    },
    secondary: {
      background: colors.accentSoft,
      pressed: colors.mist,
      foreground: colors.onAccentSoft,
    },
    plain: {
      background: "transparent",
      pressed: colors.sunken,
      foreground: tone === "neutral" ? colors.ink2 : colors.accent,
    },
  }[variant];

  return (
    <PressableScale
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={style}
      contentStyle={({ pressed }) => [
        styles.surface,
        {
          minHeight: large ? 56 : 46,
          borderRadius: radius.button,
          paddingHorizontal: variant === "plain" ? space.md : space.xl,
          backgroundColor: pressed ? look.pressed : look.background,
          opacity: disabled ? 0.38 : 1,
        },
        variant === "primary" && !disabled ? elevation(1, theme, colors.accent) : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={look.foreground} />
      ) : (
        <View
          style={[styles.row, { gap: space.xs }, iconPlacement === "leading" && styles.reverse]}
        >
          <AppText
            variant={large ? "button" : "subhead"}
            numberOfLines={1}
            style={{ color: look.foreground, fontFamily: theme.fonts.textSemibold }}
          >
            {label}
          </AppText>
          {Icon ? (
            <Icon size={large ? 20 : 18} color={look.foreground} strokeWidth={2.2} />
          ) : null}
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  surface: { alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center" },
  reverse: { flexDirection: "row-reverse" },
});
