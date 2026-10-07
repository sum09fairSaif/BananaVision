import { View, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { stripCitations } from "../utils/text";
import AppText from "./AppText";
import Card from "./Card";

/**
 * The steady part of a banana, laid out like a nutrition label: the figures
 * USDA publishes for raw banana, which barely move as the fruit ripens.
 * The stage-specific numbers live in PrebioticPanel instead.
 *   data: result.nutrition
 */
export default function NutritionFacts({ data }) {
  const { colors, fonts, space } = useTheme();
  const rows = data?.baseline?.rows;
  if (!rows?.length) return null;

  return (
    <Card>
      <View style={{ paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.sm }}>
        <AppText variant="headline" accessibilityRole="header">
          {data.baseline.title ?? "Nutrition facts"}
        </AppText>
        {data.basis ? (
          <AppText variant="footnote" tone="ink3" style={{ marginTop: 2 }}>
            {data.basis}
          </AppText>
        ) : null}
      </View>

      {rows.map((row, i) => (
        <View
          key={row.label}
          accessible
          accessibilityLabel={`${row.label}: ${row.value}${
            typeof row.dv === "number" ? `, ${Math.round(row.dv * 100)} percent daily value` : ""
          }${row.note ? `. ${row.note}` : ""}`}
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            gap: space.sm,
            paddingHorizontal: space.lg,
            paddingVertical: space.sm,
            borderTopWidth: i === 0 ? StyleSheet.hairlineWidth : StyleSheet.hairlineWidth,
            borderTopColor: colors.separator,
          }}
        >
          <View style={{ flex: 1 }}>
            <AppText variant="callout">{row.label}</AppText>
            {row.note ? (
              <AppText variant="caption" tone="ink3" style={{ marginTop: 1 }}>
                {row.note}
              </AppText>
            ) : null}
          </View>
          <AppText variant="callout" style={{ fontFamily: fonts.textSemibold }}>
            {row.value}
          </AppText>
          {typeof row.dv === "number" ? (
            <AppText
              variant="caption"
              tone="ink3"
              style={{ width: 44, textAlign: "right", fontVariant: ["tabular-nums"] }}
            >
              {Math.round(row.dv * 100)}%
            </AppText>
          ) : (
            <View style={{ width: 44 }} />
          )}
        </View>
      ))}

      {data.baseline.note ? (
        <View
          style={{
            paddingHorizontal: space.lg,
            paddingTop: space.sm,
            paddingBottom: space.lg,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.separator,
          }}
        >
          <AppText variant="footnote" tone="ink3" accessibilityLabel={stripCitations(data.baseline.note)}>
            {data.baseline.note}
          </AppText>
        </View>
      ) : null}
    </Card>
  );
}
