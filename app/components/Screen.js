import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "../theme/ThemeProvider";

// Themed, safe-area-aware page container used by every non-camera screen.
// transparent=true lets a background drawn behind the screen show through.
export default function Screen({ children, edges = ["top", "bottom"], style, transparent = false }) {
  const { colors, dark } = useTheme();
  return (
    <SafeAreaView edges={edges} style={[styles.fill, { backgroundColor: transparent ? "transparent" : colors.canvas }]}>
      <StatusBar style={dark ? "light" : "dark"} />
      <View style={[styles.fill, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
