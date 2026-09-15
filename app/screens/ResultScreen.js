import { useMemo } from "react";
import { View, ScrollView, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@react-native-vector-icons/feather";
import { useTheme } from "../theme/ThemeProvider";
import Screen from "../components/Screen";
import AppText from "../components/AppText";
import Button from "../components/Button";
import IconButton from "../components/IconButton";
import Notice from "../components/Notice";
import GuideSection from "../components/GuideSection";
import StageScale, { STAGE_LABELS } from "../components/StageScale";

// The six headings banana_content.py extracts, in the order a shopper cares about.
const SECTIONS = [
  { key: "benefits", title: "Benefits at this stage", icon: "heart" },
  { key: "nutrients", title: "Essential nutrients", icon: "droplet" },
  { key: "encouraged_for", title: "Encouraged for", icon: "thumbs-up" },
  { key: "avoid_or_limit", title: "Who should limit or avoid", icon: "slash" },
  { key: "risks", title: "Potential risks", icon: "alert-triangle" },
  { key: "missing", title: "What's missing", icon: "minus-circle" },
];
const KNOWN_KEYS = new Set(SECTIONS.map((s) => s.key));

const STAGE_SUMMARY = {
  unripe: "Firm and starchy. Give it a few more days for sweetness.",
  ripe: "Sweet, soft, and at its all-round best.",
  overripe: "Very sweet and soft — perfect for baking or smoothies.",
  rotten: "Past the point of eating. Please discard or compost it.",
};

const LOW_CONFIDENCE = 0.6;

function titleFromKey(key) {
  const words = key.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function daysLeftCopy({ edible, days_remaining: days }) {
  if (!edible) {
    return { value: "0", caption: "Don't eat", a11y: "Days left: none. Don't eat." };
  }
  const estimate = Math.max(0, Math.round(days?.estimate ?? 0));
  const low = Math.round(days?.low ?? estimate);
  const high = Math.round(days?.high ?? estimate);
  if (estimate === 0) {
    return { value: "<1", caption: "Best eaten today", a11y: "Less than a day left. Best eaten today." };
  }
  const caption = low !== high ? `Likely ${low}–${high} days` : "Estimated";
  return { value: String(estimate), caption, a11y: `About ${estimate} days left. ${caption}.` };
}

function confidenceCopy(confidence) {
  const percent = Math.round(confidence * 100);
  const level = confidence >= 0.85 ? "High" : confidence >= LOW_CONFIDENCE ? "Moderate" : "Low";
  return {
    value: `${percent}%`,
    caption: level,
    a11y: `Confidence ${percent} percent, ${level.toLowerCase()}.`,
  };
}

export default function ResultScreen({ photo, result, onScanAgain, onRetake, onHome }) {
  const { colors, space, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const { stage, edible, guide = {} } = result;
  const lowConfidence = result.confidence < LOW_CONFIDENCE;

  // Server-side sections the app doesn't know yet still render, so a new
  // "### Storage tips" heading in banana_stages.md needs no app release.
  const sections = useMemo(() => {
    const known = SECTIONS.filter((s) => guide[s.key]);
    const extra = Object.keys(guide)
      .filter((key) => !KNOWN_KEYS.has(key) && guide[key])
      .map((key) => ({ key, title: titleFromKey(key), icon: "file-text" }));
    const all = [...known, ...extra];
    // For a rotten banana the risks matter most, so lead with them.
    return stage === "rotten"
      ? [...all.filter((s) => s.key === "risks"), ...all.filter((s) => s.key !== "risks")]
      : all;
  }, [guide, stage]);

  return (
    <Screen edges={["top"]}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: space.lg,
          paddingVertical: space.xs,
        }}
      >
        <IconButton icon="home" label="Home" onPress={onHome} />
        <AppText variant="headline">Your result</AppText>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: space.lg,
          paddingTop: space.xs,
          paddingBottom: space.xxl,
          gap: space.lg,
        }}
      >
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: "hidden",
          }}
        >
          <Image
            source={{ uri: photo.uri }}
            resizeMode="cover"
            accessibilityLabel="The photo you scanned"
            style={{ width: "100%", aspectRatio: 4 / 3, backgroundColor: colors.surfaceSunken }}
          />
          <View style={{ padding: space.xl, gap: space.md }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: space.xs,
              }}
            >
              <AppText variant="overline" tone="textSecondary">
                Ripeness stage
              </AppText>
              <EdibleBadge edible={edible} />
            </View>
            <View style={{ gap: space.xxs }}>
              <AppText variant="display" accessibilityRole="header">
                {STAGE_LABELS[stage]}
              </AppText>
              <AppText variant="body" tone="textSecondary">
                {STAGE_SUMMARY[stage]}
              </AppText>
            </View>
            <StageScale stage={stage} />
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: space.sm }}>
          <StatTile
            icon="calendar"
            label="Days left"
            tone={edible ? "text" : "danger"}
            {...daysLeftCopy(result)}
          />
          <StatTile icon="target" label="Confidence" {...confidenceCopy(result.confidence)} />
        </View>

        {lowConfidence ? (
          <Notice
            tone="warning"
            title="Not fully sure about this one"
            message="For a sharper read, retake the photo in bright, even light with the whole banana in frame."
            action={
              <Button
                label="Retake photo"
                icon="camera"
                variant="secondary"
                onPress={onRetake}
                style={{ alignSelf: "flex-start" }}
              />
            }
          />
        ) : null}

        <View style={{ gap: space.sm, marginTop: space.xs }}>
          <AppText variant="title2" accessibilityRole="header">
            What to know
          </AppText>
          {sections.map((section, i) => (
            <GuideSection
              key={section.key}
              title={section.title}
              icon={section.icon}
              body={guide[section.key]}
              defaultOpen={i === 0}
            />
          ))}
        </View>

        <View style={{ flexDirection: "row", gap: space.xs }}>
          <Feather name="info" size={14} color={colors.textTertiary} style={{ marginTop: 2 }} />
          <AppText variant="footnote" tone="textTertiary" style={{ flex: 1 }}>
            General educational guidance only — not medical, dietary, or food-safety
            advice. Bracketed numbers cite sources in the BananaVision stage guide.
          </AppText>
        </View>
      </ScrollView>

      <View
        style={{
          paddingHorizontal: space.lg,
          paddingTop: space.sm,
          paddingBottom: insets.bottom + space.sm,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.background,
        }}
      >
        <Button label="Scan another banana" icon="camera" onPress={onScanAgain} />
      </View>
    </Screen>
  );
}

function EdibleBadge({ edible }) {
  const { colors, space, radius } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: space.sm,
        paddingVertical: 6,
        borderRadius: radius.pill,
        backgroundColor: edible ? colors.successSoft : colors.dangerSoft,
      }}
    >
      <Feather
        name={edible ? "check-circle" : "x-octagon"}
        size={16}
        color={edible ? colors.success : colors.danger}
      />
      <AppText
        variant="footnote"
        tone={edible ? "success" : "danger"}
        style={{ fontFamily: "Nunito_800ExtraBold" }}
      >
        {edible ? "Good to eat" : "Don't eat"}
      </AppText>
    </View>
  );
}

function StatTile({ icon, label, value, caption, a11y, tone = "text" }) {
  const { colors, space, radius } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={a11y}
      style={{
        flex: 1,
        gap: space.xxs,
        padding: space.md,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}>
        <Feather name={icon} size={16} color={colors.textSecondary} />
        <AppText variant="footnote" tone="textSecondary">
          {label}
        </AppText>
      </View>
      <AppText variant="title1" tone={tone} numberOfLines={1}>
        {value}
      </AppText>
      <AppText variant="footnote" tone="textTertiary">
        {caption}
      </AppText>
    </View>
  );
}
