import { Pressable } from "react-native";
import { Feather } from "@react-native-vector-icons/feather";
import { useTheme } from "../theme/ThemeProvider";
import { HIT_TARGET, cameraChrome } from "../theme/tokens";
import { tap } from "../utils/haptics";

/**
 * Circular icon-only button. `label` is required: it is the only thing a
 * screen reader can announce.
 * variant: "surface" on themed screens, "overlay" on top of the camera
 */
export default function IconButton({
  icon,
  label,
  onPress,
  variant = "surface",
  selected = false,
  disabled = false,
  style,
}) {
  const { colors } = useTheme();

  const look = selected
    ? {
        background: colors.primary,
        pressed: colors.primaryPressed,
        foreground: colors.onPrimary,
        border: colors.primary,
      }
    : variant === "overlay"
      ? {
          background: cameraChrome.control,
          pressed: cameraChrome.controlPressed,
          foreground: cameraChrome.foreground,
          border: cameraChrome.controlBorder,
        }
      : {
          background: colors.surface,
          pressed: colors.surfaceSunken,
          foreground: colors.text,
          border: colors.border,
        };

  return (
    <Pressable
      onPress={() => {
        tap();
        onPress?.();
      }}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      style={({ pressed }) => [
        {
          width: HIT_TARGET,
          height: HIT_TARGET,
          borderRadius: HIT_TARGET / 2,
          borderWidth: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: pressed ? look.pressed : look.background,
          borderColor: look.border,
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      <Feather name={icon} size={20} color={look.foreground} />
    </Pressable>
  );
}
