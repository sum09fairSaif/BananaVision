import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "../theme/ThemeProvider";

// Themed, safe-area-aware page container used by every non-camera screen.
export default function Screen({ children, edges = ["top", "bottom"], style }) {
  const { colors, dark } = useTheme();
  return (
    <SafeAreaView
      edges={edges}
      style={[styles.fill, { backgroundColor: colors.background }]}
    >
      <StatusBar style={dark ? "light" : "dark"} />
      <View style={[styles.fill, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
