import { View, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "../theme/ThemeProvider";
import { HIT_TARGET, overlay } from "../theme/tokens";
import PressableScale from "./PressableScale";

/**
 * Round icon-only control. `label` is required — it's all a screen reader has.
 * variant: "tinted" (on themed screens), "glass" (over photos and the camera),
 *          "plain" (no fill until pressed)
 * Visible size can be smaller than 48, but hitSlop keeps the touch target at 48.
 */
export default function IconButton({
  icon: Icon,
  label,
  onPress,
  variant = "tinted",
  selected = false,
  disabled = false,
  size = 44,
  style,
}) {
  const { colors } = useTheme();
  const glass = variant === "glass" && !selected;
  const foreground = selected ? colors.onAccent : glass ? overlay.foreground : colors.ink;

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      pressedScale={0.9}
      hitSlop={Math.max(0, (HIT_TARGET - size) / 2)}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      style={style}
      contentStyle={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.4 : 1,
        },
        selected
          ? { backgroundColor: pressed ? colors.accentPressed : colors.accent }
          : glass
            ? { borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.22)" }
            : variant === "tinted"
              ? { backgroundColor: pressed ? colors.sunkenPressed : colors.sunken }
              : { backgroundColor: pressed ? colors.sunken : "transparent" },
      ]}
    >
      {glass ? (
        <>
          <BlurView tint="dark" intensity={36} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(8, 18, 17, 0.28)" }]} />
        </>
      ) : null}
      {/* zIndex keeps the glyph above the blur layers on every platform (web stacks BlurView on top otherwise). */}
      <View style={{ zIndex: 1 }}>
        <Icon size={20} color={foreground} strokeWidth={2} />
      </View>
    </PressableScale>
  );
}
