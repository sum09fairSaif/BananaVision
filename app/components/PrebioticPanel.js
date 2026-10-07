import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Sprout from "lucide-react-native/icons/sprout";
import { useTheme } from "../theme/ThemeProvider";
import { elevation } from "../theme/tokens";
import { toParagraphs, splitCitations, stripCitations } from "../utils/text";
import AppText from "./AppText";

// How full the meter reads at each stage, and the word for it.
const LEVELS = { high: 4, moderate: 2, low: 1, none: 0 };
const STEPS = 4;

/**
 * The prebiotic headline for this stage — the thing this app is really about.
 * Deliberately the loudest block on the result screen: a big number, a meter,
 * and plain language about what it feeds. Renders nothing if the server is an
 * older build that doesn't send `prebiotics`.
 *   data: result.prebiotics      explainer: result.nutrition.explainer
 */
export default function PrebioticPanel({ data, explainer }) {
  const theme = useTheme();
  const { colors, fonts, space, radius, dark } = theme;
  const filled = LEVELS[data?.level] ?? 0;

  const paragraphs = useMemo(
    () => [data?.summary, data?.gut].filter(Boolean).flatMap(toParagraphs),
    [data],
  );

  if (!data?.level) return null;

  const tone = data.level === "none" ? colors.ink3 : colors.accent;

  return (
    <View style={[{ borderRadius: radius.sheet }, elevation(2, theme)]}>
      <LinearGradient
        colors={[colors.heroFrom, colors.heroTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: radius.sheet, padding: space.xl, overflow: "hidden" }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}>
          <Sprout size={16} color={tone} strokeWidth={2.4} />
          <AppText variant="eyebrow" tone="onAccentSoft">
            Prebiotics
          </AppText>
        </View>

        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: space.sm, marginTop: space.sm }}>
          <AppText
            variant="hero"
            style={{ fontSize: 46, lineHeight: 50, letterSpacing: -1.2 }}
            accessibilityRole="header"
          >
            {data.headline_value}
          </AppText>
          <AppText variant="callout" tone="ink2" style={{ flex: 1, paddingBottom: 6 }}>
            {data.headline_label}
          </AppText>
        </View>

        <View
          accessible
          accessibilityLabel={`Prebiotic level: ${data.level_label}`}
          style={{ marginTop: space.md }}
        >
          <View style={{ flexDirection: "row", gap: 5 }}>
            {Array.from({ length: STEPS }, (_, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor:
                    i < filled ? tone : dark ? "rgba(255,255,255,0.12)" : "rgba(16,42,40,0.1)",
                }}
              />
            ))}
          </View>
          <AppText variant="subhead" style={{ marginTop: space.xs, fontFamily: fonts.textSemibold }}>
            {data.level_label}
          </AppText>
        </View>

        <View style={{ marginTop: space.md, gap: space.sm }}>
          {paragraphs.map((paragraph, i) => (
            <Cited key={i} text={paragraph} />
          ))}
        </View>

        {data.facts?.length ? (
          <View style={{ marginTop: space.lg, gap: space.xs }}>
            {data.facts.map((fact) => (
              <FactRow key={fact.label} fact={fact} />
            ))}
          </View>
        ) : null}

        {explainer ? (
          <View
            style={{
              marginTop: space.lg,
              paddingTop: space.md,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: colors.separator,
              gap: space.xs,
            }}
          >
            <AppText variant="caption" tone="ink3">
              WHAT THAT MEANS
            </AppText>
            {[explainer.what, explainer.how, explainer.why].filter(Boolean).map((line, i) => (
              <Cited key={i} text={line} variant="footnote" />
            ))}
          </View>
        ) : null}
      </LinearGradient>
    </View>
  );
}

// One measured figure: name on the left, value on the right, and a bar for
// anything carrying a share of the daily value.
function FactRow({ fact }) {
  const { colors, fonts, space } = useTheme();
  const share = typeof fact.dv === "number" ? Math.max(0, Math.min(1, fact.dv)) : null;

  return (
    <View
      accessible
      accessibilityLabel={`${fact.label}: ${stripCitations(fact.value)}${
        share !== null ? `, ${Math.round(share * 100)} percent of the daily fibre value` : ""
      }${fact.note ? `. ${fact.note}` : ""}`}
      style={{ gap: 3 }}
    >
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: space.sm }}>
        <AppText variant="callout" tone="ink2" style={{ flex: 1 }}>
          {fact.label}
        </AppText>
        <AppText variant="callout" style={{ fontFamily: fonts.textSemibold }}>
          {fact.value}
        </AppText>
      </View>
      {share !== null ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}>
          <View
            style={{
              flex: 1,
              height: 5,
              borderRadius: 3,
              overflow: "hidden",
              backgroundColor: colors.sunken,
            }}
          >
            <View
              style={{
                width: `${share * 100}%`,
                height: "100%",
                borderRadius: 3,
                backgroundColor: colors.accent,
              }}
            />
          </View>
          <AppText variant="caption" tone="ink3">
            {Math.round(share * 100)}% daily fibre
          </AppText>
        </View>
      ) : fact.note ? (
        <AppText variant="caption" tone="ink3">
          {fact.note}
        </AppText>
      ) : null}
    </View>
  );
}

// Prose with the bracketed source numbers kept, but quietened.
function Cited({ text, variant = "body" }) {
  const { colors, fonts } = useTheme();
  return (
    <AppText variant={variant} tone="ink2" accessibilityLabel={stripCitations(text)}>
      {splitCitations(text).map((part, i) =>
        part.citation ? (
          <Text key={i} style={{ fontFamily: fonts.textMedium, fontSize: 11, color: colors.ink3 }}>
            {part.text}
          </Text>
        ) : (
          part.text
        ),
      )}
    </AppText>
  );
}
