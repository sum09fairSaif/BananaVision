import { View, StyleSheet } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { useTheme } from "../theme/ThemeProvider";
import Illustration from "./Illustration";

// The BananaVision mark: the banana bunch from svgs/ inside viewfinder corners.
// Decorative, hidden from screen readers.
//   framed=false shows the bunch alone.
export default function BananaMark({ size = 120, framed = true }) {
  const { colors } = useTheme();

  if (!framed) return <Illustration name="bunch" width={size} />;

  const art = size * 0.56;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}
    >
      <Svg width={size} height={size} viewBox="0 0 120 120" style={StyleSheet.absoluteFill}>
        <Circle cx="60" cy="60" r="44" fill={colors.pastel} />
        <Path
          d="M12 30 V20 Q12 12 20 12 H30 M90 12 H100 Q108 12 108 20 V30 M108 90 V100 Q108 108 100 108 H90 M30 108 H20 Q12 108 12 100 V90"
          stroke={colors.accent}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
      <Illustration name="bunch" width={art} />
    </View>
  );
}
