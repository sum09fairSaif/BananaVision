import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Pressable,
  Animated,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import X from "lucide-react-native/icons/x";
import ScanLine from "lucide-react-native/icons/scan-line";
import Info from "lucide-react-native/icons/info";
import BookOpen from "lucide-react-native/icons/book-open";
import { useTheme } from "../theme/ThemeProvider";
import { useReducedMotion } from "../hooks/useReducedMotion";
import AppText from "../components/AppText";
import Button from "../components/Button";
import IconButton from "../components/IconButton";
import GlassView from "../components/GlassView";
import Card from "../components/Card";
import GuideCarousel from "../components/GuideCarousel";
import PrebioticPanel from "../components/PrebioticPanel";
import NutritionFacts from "../components/NutritionFacts";
import Reveal from "../components/Reveal";
import RipenessSpectrum, { STAGE_NAMES } from "../components/RipenessSpectrum";

// The headings banana_content.py extracts, ordered by what people ask first.
const SECTIONS = [
  { key: "benefits", title: "Why it's good now" },
  { key: "nutrients", title: "What's in it" },
  { key: "encouraged_for", title: "Best for" },
  { key: "avoid_or_limit", title: "Go easy if…" },
  { key: "risks", title: "Watch out for" },
  { key: "missing", title: "What you miss" },
];
const KNOWN_KEYS = new Set(SECTIONS.map((s) => s.key));

const STAGE_SUMMARY = {
  unripe: "Firm and not very sweet yet, and the best one for your gut. Leave it a few days if you want it sweeter.",
  ripe: "Sweet, soft and easy on your stomach — the best all-rounder.",
  overripe: "As sweet and soft as it gets. Perfect for baking, smoothies, or a quick lift.",
  rotten: "Too far gone to eat. Throw it away or put it in the compost.",
};

const LOW_CONFIDENCE = 0.6;

function titleFromKey(key) {
  const words = key.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function facts({ edible, confidence, days_remaining: days }) {
  const estimate = Math.max(0, Math.round(days?.estimate ?? 0));
  const low = Math.round(days?.low ?? estimate);
  const high = Math.round(days?.high ?? estimate);
  const percent = Math.round(confidence * 100);

  const keeps = !edible
    ? { value: "None", tone: "critical", a11y: "Shelf life: none." }
    : estimate === 0
      ? { value: "<1 day", a11y: "Keeps for less than a day. Best eaten today." }
      : {
          value: `${estimate} ${estimate === 1 ? "day" : "days"}`,
          a11y: `Keeps for about ${estimate} days${low !== high ? `, likely ${low} to ${high}` : ""}.`,
        };

  return [
    {
      label: "Safe to eat",
      value: edible ? "Yes" : "No",
      tone: edible ? "positive" : "critical",
      a11y: edible ? "Safe to eat." : "Not safe to eat.",
    },
    { label: "Keeps for", ...keeps },
    { label: "How sure", value: `${percent}%`, a11y: `We are ${percent} percent sure.` },
  ];
}

export default function ResultScreen({ photo, result, onScanAgain, onRetake, onHome, onSources }) {
  const theme = useTheme();
  const { colors, space, dark, motion } = theme;
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const { stage, guide = {} } = result;
  const lowConfidence = result.confidence < LOW_CONFIDENCE;
  // Older server builds send no sources or nutrition; those blocks then stay hidden.
  const sourceCount = result.sources?.length ?? 0;

  const heroHeight = Math.min(width * 1.05, height * 0.48);
  const collapseAt = heroHeight - insets.top - 56;
  const scrollY = useRef(new Animated.Value(0)).current;
  const settle = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const [collapsed, setCollapsed] = useState(false);
  const collapsedRef = useRef(false);
  const [barHeight, setBarHeight] = useState(100);

  useEffect(() => {
    Animated.timing(settle, {
      toValue: 1,
      duration: reduced ? 0 : 900,
      easing: motion.easeOut,
      useNativeDriver: true,
    }).start();
  }, [settle, reduced, motion]);

  // Sections the app doesn't know yet still render, so a new heading in
  // banana_stages.md needs no app release. Rotten bananas lead with risks.
  const sections = useMemo(() => {
    const known = SECTIONS.filter((s) => guide[s.key]);
    const extra = Object.keys(guide)
      .filter((key) => !KNOWN_KEYS.has(key) && guide[key])
      .map((key) => ({ key, title: titleFromKey(key) }));
    const all = [...known, ...extra].map((s) => ({ ...s, body: guide[s.key] }));
    return stage === "rotten"
      ? [...all.filter((s) => s.key === "risks"), ...all.filter((s) => s.key !== "risks")]
      : all;
  }, [guide, stage]);

  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
    useNativeDriver: true,
    listener: (event) => {
      const next = event.nativeEvent.contentOffset.y > collapseAt - 20;
      if (next !== collapsedRef.current) {
        collapsedRef.current = next;
        setCollapsed(next);
      }
    },
  });

  const heroTranslate = scrollY.interpolate({
    inputRange: [0, heroHeight],
    outputRange: [0, heroHeight * 0.35],
    extrapolate: "clamp",
  });
  const heroScale = settle.interpolate({ inputRange: [0, 1], outputRange: [1.08, 1] });
  const headerOpacity = scrollY.interpolate({
    inputRange: [collapseAt - 40, collapseAt],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const chromeWash = dark ? "rgba(10, 20, 19, 0.78)" : "rgba(243, 246, 242, 0.82)";

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style={collapsed ? (dark ? "light" : "dark") : "light"} />

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: barHeight + space.xl }}
      >
        <View style={{ height: heroHeight, overflow: "hidden", backgroundColor: colors.sunken }}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { transform: [{ translateY: heroTranslate }, { scale: heroScale }] },
            ]}
          >
            <Image
              source={{ uri: photo.uri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={reduced ? 0 : 300}
              accessibilityLabel="The photo you scanned"
            />
          </Animated.View>
          <LinearGradient
            colors={["rgba(0,0,0,0.38)", "rgba(0,0,0,0)"]}
            style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top + 96 }}
          />
          <LinearGradient
            colors={[colors.canvasClear, colors.canvas]}
            style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 140 }}
          />
        </View>

        <View style={{ marginTop: -space.xxxl, paddingHorizontal: space.xl }}>
          <Reveal>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}>
              <View
                style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.stage[stage] }}
              />
              <AppText variant="subhead" tone="ink2">
                Ripeness stage
              </AppText>
            </View>
            <AppText
              variant="hero"
              accessibilityRole="header"
              style={{ fontSize: 54, lineHeight: 60, letterSpacing: -1.4, marginTop: space.xxs }}
            >
              {STAGE_NAMES[stage]}
            </AppText>
            <AppText variant="body" tone="ink2" style={{ marginTop: space.xxs }}>
              {STAGE_SUMMARY[stage]}
            </AppText>
          </Reveal>

          <Reveal delay={90} style={{ marginTop: space.xl }}>
            <RipenessSpectrum stage={stage} daysEstimate={result.days_remaining?.estimate} />
          </Reveal>

          <Reveal delay={170} style={{ marginTop: space.xl }}>
            <FactStrip items={facts(result)} />
          </Reveal>

          {lowConfidence ? (
            <Reveal delay={220} style={{ marginTop: space.md }}>
              <LowConfidenceNote onRetake={onRetake} />
            </Reveal>
          ) : null}

          {/* The heart of the app: how much prebiotic this particular stage carries. */}
          <Reveal delay={240} style={{ marginTop: space.xxl }}>
            <PrebioticPanel data={result.prebiotics} explainer={result.nutrition?.explainer} />
          </Reveal>

          <Reveal delay={260} style={{ marginTop: space.xxxl }}>
            <AppText variant="title" accessibilityRole="header">
              Good to know
            </AppText>
            <AppText variant="callout" tone="ink3" style={{ marginTop: 2 }}>
              Swipe through {sections.length} {sections.length === 1 ? "bubble" : "bubbles"}
            </AppText>
          </Reveal>
        </View>

        {/* Full-bleed so bubbles float in from the screen edges. */}
        <Reveal delay={300} style={{ marginTop: space.xs }}>
          <GuideCarousel sections={sections} />
        </Reveal>

        <View style={{ paddingHorizontal: space.xl }}>
          {result.nutrition?.baseline ? (
            <Reveal delay={340} style={{ marginTop: space.xxxl }}>
              <AppText variant="title" accessibilityRole="header">
                Nutrition facts
              </AppText>
              <AppText variant="callout" tone="ink3" style={{ marginTop: 2, marginBottom: space.md }}>
                The bits that hardly change as it ripens
              </AppText>
              <NutritionFacts data={result.nutrition} />
            </Reveal>
          ) : null}

          {sourceCount ? (
            <Reveal delay={360} style={{ marginTop: space.lg }}>
              <Button
                label={`View all ${sourceCount} sources`}
                variant="secondary"
                tone="neutral"
                size="medium"
                icon={BookOpen}
                iconPlacement="leading"
                onPress={() => onSources(result.sources)}
                accessibilityHint="Where all these numbers come from"
              />
            </Reveal>
          ) : null}

          <AppText variant="footnote" tone="ink3" style={{ marginTop: space.lg }}>
            General information to help you choose a banana — not medical or diet advice.
            The small numbers in brackets point to the list of sources.
          </AppText>
        </View>
      </Animated.ScrollView>

      {/* Compact title bar that fades in once the photo scrolls away. */}
      <Animated.View
        pointerEvents="none"
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top + 60, opacity: headerOpacity }}
      >
        <GlassView
          tint={dark ? "dark" : "light"}
          wash={chromeWash}
          style={{
            flex: 1,
            borderWidth: 0,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            alignItems: "center",
            justifyContent: "flex-end",
            paddingBottom: 18,
          }}
        >
          <AppText variant="headline">{STAGE_NAMES[stage]}</AppText>
        </GlassView>
      </Animated.View>

      <View style={{ position: "absolute", top: insets.top + space.xs, left: space.md }}>
        <IconButton icon={X} label="Done" variant={collapsed ? "plain" : "glass"} onPress={onHome} />
      </View>

      <View
        onLayout={(event) => setBarHeight(event.nativeEvent.layout.height)}
        style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}
      >
        <GlassView
          tint={dark ? "dark" : "light"}
          wash={chromeWash}
          style={{
            borderWidth: 0,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            paddingHorizontal: space.xl,
            paddingTop: space.sm,
            paddingBottom: insets.bottom + space.sm,
          }}
        >
          <Button label="Scan another banana" icon={ScanLine} iconPlacement="leading" onPress={onScanAgain} />
        </GlassView>
      </View>
    </View>
  );
}

function FactStrip({ items }) {
  const { colors, space } = useTheme();
  return (
    <Card>
      <View style={{ flexDirection: "row" }}>
        {items.map((item, i) => (
          <View
            key={item.label}
            accessible
            accessibilityLabel={item.a11y}
            style={{
              flex: 1,
              alignItems: "center",
              gap: 2,
              paddingVertical: space.md,
              paddingHorizontal: space.xs,
              borderLeftWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
              borderLeftColor: colors.separator,
            }}
          >
            <AppText variant="metric" tone={item.tone ?? "ink"} numberOfLines={1} adjustsFontSizeToFit>
              {item.value}
            </AppText>
            <AppText variant="caption" tone="ink3" numberOfLines={1}>
              {item.label}
            </AppText>
          </View>
        ))}
      </View>
    </Card>
  );
}

function LowConfidenceNote({ onRetake }) {
  const { colors, fonts, space, radius } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        gap: space.sm,
        padding: space.md,
        borderRadius: radius.md,
        backgroundColor: colors.cautionSoft,
      }}
    >
      <Info size={18} color={colors.caution} strokeWidth={2.2} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <AppText variant="callout">
          We're not fully sure about this one. A closer photo in soft, even light helps.
        </AppText>
        <Pressable
          onPress={onRetake}
          hitSlop={10}
          accessibilityRole="button"
          style={{ alignSelf: "flex-start", marginTop: space.xs }}
        >
          <AppText variant="subhead" tone="caution" style={{ fontFamily: fonts.textSemibold }}>
            Retake photo
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}
