import { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "../theme/ThemeProvider";
import { useReducedMotion } from "../hooks/useReducedMotion";
import BananaMark from "../components/BananaMark";

// Shown while fonts and the saved profile load. Uses the system font on
// purpose: the brand fonts may not be ready yet.
export default function SplashScreen() {
  const { colors, dark, motion } = useTheme();
  const reduced = useReducedMotion();
  const enter = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: reduced ? 0 : motion.slow,
      easing: motion.easeOut,
      useNativeDriver: true,
    }).start();
  }, [enter, reduced, motion]);

  const scale = enter.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });

  return (
    <View
      style={[styles.screen, { backgroundColor: colors.background }]}
      accessible
      accessibilityLabel="BananaVision is loading"
    >
      <StatusBar style={dark ? "light" : "dark"} />
      <Animated.View style={[styles.lockup, { opacity: enter, transform: [{ scale }] }]}>
        <BananaMark size={132} />
        <Text style={[styles.wordmark, { color: colors.text }]} maxFontSizeMultiplier={1.3}>
          Banana<Text style={{ color: colors.primary }}>Vision</Text>
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", justifyContent: "center" },
  lockup: { alignItems: "center", gap: 20 },
  wordmark: { fontSize: 30, fontWeight: "800", letterSpacing: -0.5 },
});
