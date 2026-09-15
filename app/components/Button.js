import { useRef } from "react";
import {
  Pressable,
  View,
  ActivityIndicator,
  Animated,
  StyleSheet,
} from "react-native";
import { Feather } from "@react-native-vector-icons/feather";
import { useTheme } from "../theme/ThemeProvider";
import AppText from "./AppText";
import { tap } from "../utils/haptics";

/**
 * variant: "primary" (one per screen), "secondary" (outlined), "quiet" (text-only)
 * icon:    Feather icon name, shown after the label unless iconPosition="start"
 */
export default function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  iconPosition = "end",
  loading = false,
  disabled = false,
  accessibilityHint,
  style,
}) {
  const { colors, radius, space, motion } = useTheme();
  const press = useRef(new Animated.Value(0)).current;
  const inactive = disabled || loading;

  const look = {
    primary: {
      background: colors.primary,
      pressed: colors.primaryPressed,
      foreground: colors.onPrimary,
      border: colors.primary,
    },
    secondary: {
      background: colors.surface,
      pressed: colors.surfaceSunken,
      foreground: colors.text,
      border: colors.borderStrong,
    },
    quiet: {
      background: "transparent",
      pressed: colors.primarySoft,
      foreground: colors.onPrimarySoft,
      border: "transparent",
    },
  }[variant];

  function animateTo(value) {
    Animated.timing(press, {
      toValue: value,
      duration: motion.fast,
      easing: motion.easeOut,
      useNativeDriver: true,
    }).start();
  }

  const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] });

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={() => {
          tap();
          onPress?.();
        }}
        onPressIn={() => animateTo(1)}
        onPressOut={() => animateTo(0)}
        disabled={inactive}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: inactive, busy: loading }}
        style={({ pressed }) => [
          styles.base,
          {
            borderRadius: radius.pill,
            paddingHorizontal: space.xl,
            backgroundColor: pressed ? look.pressed : look.background,
            borderColor: look.border,
            opacity: disabled ? 0.45 : 1,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={look.foreground} />
        ) : (
          <View
            style={[
              styles.row,
              { gap: space.xs },
              iconPosition === "start" && styles.rowReverse,
            ]}
          >
            <AppText
              variant="button"
              numberOfLines={1}
              style={{ color: look.foreground }}
            >
              {label}
            </AppText>
            {icon ? <Feather name={icon} size={20} color={look.foreground} /> : null}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  row: { flexDirection: "row", alignItems: "center" },
  rowReverse: { flexDirection: "row-reverse" },
});
