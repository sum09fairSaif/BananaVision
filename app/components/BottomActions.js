import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../theme/ThemeProvider";

// Bottom-anchored action area for scrolling screens. A short fade above it lets
// content scroll under the buttons instead of being cut off at a hard edge.
export default function BottomActions({ children, style }) {
  const { colors, space } = useTheme();
  return (
    <View
      style={[
        {
          paddingHorizontal: space.xl,
          paddingBottom: space.md,
          gap: space.xxs,
          backgroundColor: colors.canvas,
        },
        style,
      ]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={[colors.canvasClear, colors.canvas]}
        style={{ position: "absolute", left: 0, right: 0, top: -28, height: 28 }}
      />
      {children}
    </View>
  );
}
