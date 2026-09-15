import { View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { STAGES } from "../api/client";
import AppText from "./AppText";

export const STAGE_LABELS = {
  unripe: "Unripe",
  ripe: "Ripe",
  overripe: "Overripe",
  rotten: "Rotten",
};

// Four-step ripeness track. Position and a bold label carry the meaning, so it
// reads correctly for people who can't tell the stage colors apart.
export default function StageScale({ stage }) {
  const { colors, space } = useTheme();
  const current = STAGES.indexOf(stage);

  return (
    <View
      accessible
      accessibilityLabel={`Ripeness scale: ${STAGE_LABELS[stage]}, stage ${current + 1} of ${STAGES.length}`}
      style={{ gap: space.xs }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {STAGES.map((s, i) => (
          <View
            key={s}
            style={{
              flex: 1,
              height: i === current ? 12 : 8,
              borderRadius: 6,
              backgroundColor: i <= current ? colors.stage[s] : colors.border,
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {STAGES.map((s, i) => (
          <AppText
            key={s}
            variant="footnote"
            tone={i === current ? "text" : "textTertiary"}
            numberOfLines={1}
            style={[
              { flex: 1, textAlign: "center" },
              i === current && { fontFamily: "Nunito_800ExtraBold" },
            ]}
          >
            {STAGE_LABELS[s]}
          </AppText>
        ))}
      </View>
    </View>
  );
}
