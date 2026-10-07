import { useEffect, useRef } from "react";
import { Animated } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useReducedMotion } from "../hooks/useReducedMotion";

// Route transition: a short cross-fade with a slight settle. Instant with reduced motion.
export default function FadeIn({ children }) {
  const { motion } = useTheme();
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: reduced ? 0 : motion.base + 60,
      easing: motion.easeOut,
      useNativeDriver: true,
    }).start();
  }, [progress, reduced, motion]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });

  return (
    <Animated.View style={{ flex: 1, opacity: progress, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}
