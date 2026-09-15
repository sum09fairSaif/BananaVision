import Svg, { Circle, Path } from "react-native-svg";
import { useTheme } from "../theme/ThemeProvider";

// The BananaVision mark: a banana inside viewfinder brackets. Drawn in code so
// it follows the theme and stays sharp at any size. Purely decorative.
export default function BananaMark({ size = 120, framed = true }) {
  const { colors } = useTheme();
  const stem = colors.stage.rotten;

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {framed ? <Circle cx="60" cy="60" r="44" fill={colors.mint} /> : null}

      <Path d="M88 27 C98 62 72 98 25 93 C57 83 78 62 79 29 Z" fill={colors.stage.ripe} />
      <Path
        d="M85.5 38 C88 62 70 84 42 89"
        stroke="#FFFFFF"
        strokeOpacity={0.4}
        strokeWidth={2.5}
        strokeLinecap="round"
        fill="none"
      />
      <Path d="M79 29 L81 17 Q85 13 90 16 L88 27 Z" fill={stem} />
      <Circle cx="26.5" cy="92.5" r="3.2" fill={stem} />

      {framed ? (
        <Path
          d="M12 30 V20 Q12 12 20 12 H30 M90 12 H100 Q108 12 108 20 V30 M108 90 V100 Q108 108 100 108 H90 M30 108 H20 Q12 108 12 100 V90"
          stroke={colors.primary}
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ) : null}
    </Svg>
  );
}
