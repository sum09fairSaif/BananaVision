import { View, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";

/**
 * Frosted surface for controls over photos, the camera, and scrolling content.
 * iOS and web blur what's behind it. Android can't blur a camera preview
 * without a BlurTargetView, so it gets the same tint unblurred — at a glance
 * it reads the same.
 *   tint: "dark" over imagery, "light" | "dark" for themed chrome
 *   wash: optional color laid over the blur (defaults per tint)
 */
export default function GlassView({ tint = "dark", intensity = 40, wash, style, children, ...rest }) {
  const defaultWash = tint === "dark" ? "rgba(8, 18, 17, 0.32)" : "rgba(255, 255, 255, 0.6)";
  const edge = tint === "dark" ? "rgba(255, 255, 255, 0.16)" : "rgba(16, 42, 40, 0.08)";

  return (
    <View style={[styles.clip, { borderColor: edge }, style]} {...rest}>
      <BlurView tint={tint} intensity={intensity} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: wash ?? defaultWash }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: "hidden", borderWidth: StyleSheet.hairlineWidth },
});
