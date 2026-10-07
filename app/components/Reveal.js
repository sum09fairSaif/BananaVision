import { useEffect, useRef } from "react";
import { Animated } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useReducedMotion } from "../hooks/useReducedMotion";

/**
 * Fades and lifts its children into place once, after `delay` ms. Stagger a
 * few of these down a screen so content settles in reading order instead of
 * popping in all at once. Instant when the user prefers reduced motion.
 */
export default function Reveal({ delay = 0, distance = 14, style, children }) {
  const { motion } = useTheme();
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      return;
    }
    Animated.timing(progress, {
      toValue: 1,
      duration: motion.slow,
      delay,
      easing: motion.easeOut,
      useNativeDriver: true,
    }).start();
  }, [progress, reduced, delay, motion]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] });

  return (
    <Animated.View style={[{ opacity: progress, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}
