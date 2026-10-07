import { View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { elevation } from "../theme/tokens";

// Elevated surface. The shadow lives on the outer view and the clipping on the
// inner one — on iOS, overflow:hidden on the same view would cut the shadow off.
export default function Card({ children, style, contentStyle }) {
  const theme = useTheme();
  const { colors, radius } = theme;

  return (
    <View
      style={[
        { borderRadius: radius.card, backgroundColor: colors.elevated },
        elevation(2, theme),
        style,
      ]}
    >
      <View style={[{ borderRadius: radius.card, overflow: "hidden" }, contentStyle]}>
        {children}
      </View>
    </View>
  );
}
