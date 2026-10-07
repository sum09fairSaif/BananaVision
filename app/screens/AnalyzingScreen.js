import { useEffect, useRef } from "react";
import {
  View,
  Animated,
  Easing,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Check from "lucide-react-native/icons/check";
import { useTheme } from "../theme/ThemeProvider";
import { overlay } from "../theme/tokens";
import { useReducedMotion } from "../hooks/useReducedMotion";
import Screen from "../components/Screen";
import AppText from "../components/AppText";
import Button from "../components/Button";
import GlassView from "../components/GlassView";

// Real phases reported by api/client.js — the list never pretends to know more.
const STEPS = [
  { key: "preparing", label: "Preparing your photo" },
  { key: "analyzing", label: "Checking ripeness" },
];

/**
 * Wait state. The photo stays in view with a slow sheen passing over it, and
 * a short checklist tracks the two phases we can actually observe.
 */
export default function AnalyzingScreen({ photo, phase = "preparing", slow, onCancel }) {
  const { colors, fonts, space, radius } = useTheme();
  const reduced = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const photoWidth = width - space.xl * 2;
  const photoHeight = Math.min(photoWidth * 1.1, height * 0.42);
  const sheen = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) return undefined;
    const loops = [
      Animated.loop(
        Animated.sequence([
          Animated.timing(sheen, {
            toValue: 1,
            duration: 1900,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.delay(300),
        ]),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(breathe, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(breathe, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ),
    ];
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [reduced, sheen, breathe]);

  const current = Math.max(0, STEPS.findIndex((s) => s.key === phase));

  return (
    <Screen>
      <View style={{ flex: 1, paddingHorizontal: space.xl, paddingTop: space.lg }}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            height: photoHeight,
            borderRadius: radius.sheet - 4,
            overflow: "hidden",
            backgroundColor: colors.sunken,
          }}
        >
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { transform: [{ scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] }) }] },
            ]}
          >
            <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={reduced ? 0 : 250} />
          </Animated.View>

          {!reduced ? (
            <Animated.View
              style={{
                position: "absolute",
                top: -photoHeight * 0.25,
                bottom: -photoHeight * 0.25,
                width: photoWidth * 0.5,
                transform: [
                  { translateX: sheen.interpolate({ inputRange: [0, 1], outputRange: [-photoWidth * 0.7, photoWidth * 1.2] }) },
                  { rotate: "16deg" },
                ],
              }}
            >
              <LinearGradient
                colors={["rgba(190,246,237,0)", "rgba(190,246,237,0.38)", "rgba(190,246,237,0)"]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{ flex: 1 }}
              />
            </Animated.View>
          ) : null}

          <GlassView
            style={{
              position: "absolute",
              left: space.md,
              bottom: space.md,
              flexDirection: "row",
              alignItems: "center",
              gap: space.xs,
              paddingHorizontal: space.sm,
              paddingVertical: space.xs,
              borderRadius: radius.pill,
            }}
          >
            <PulseDot />
            <AppText variant="subhead" style={{ color: overlay.foreground, fontFamily: fonts.textSemibold }}>
              Analyzing
            </AppText>
          </GlassView>
        </View>

        <View style={{ marginTop: space.xxl }} accessibilityLiveRegion="polite">
          <AppText variant="display" accessibilityRole="header">
            Reading your banana
          </AppText>
          <View style={{ marginTop: space.lg, gap: space.md }}>
            {STEPS.map((step, i) => (
              <StepRow
                key={step.key}
                label={step.label}
                state={i < current ? "done" : i === current ? "active" : "pending"}
                detail={
                  step.key === "analyzing" && i === current && slow
                    ? "Our server may be waking up. The first scan after a while can take up to a minute."
                    : null
                }
              />
            ))}
          </View>
        </View>
      </View>

      <View style={{ alignItems: "center", paddingBottom: space.md }}>
        <Button label="Cancel" variant="plain" tone="neutral" size="medium" onPress={onCancel} />
      </View>
    </Screen>
  );
}

function StepRow({ label, state, detail }) {
  const { colors, space } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${label}, ${state === "done" ? "done" : state === "active" ? "in progress" : "waiting"}`}
      style={{ flexDirection: "row", gap: space.sm }}
    >
      <View style={{ width: 22, height: 24, alignItems: "center", justifyContent: "center" }}>
        {state === "done" ? (
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.accent,
            }}
          >
            <Check size={12} color={colors.onAccent} strokeWidth={3} />
          </View>
        ) : state === "active" ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              borderWidth: 1.5,
              borderColor: colors.separator,
            }}
          />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="body" tone={state === "pending" ? "ink3" : state === "done" ? "ink2" : "ink"}>
          {label}
        </AppText>
        {detail ? (
          <AppText variant="footnote" tone="ink2" style={{ marginTop: 2 }}>
            {detail}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

function PulseDot() {
  const reduced = useReducedMotion();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduced) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.35, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, pulse]);

  return (
    <Animated.View
      style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: overlay.accent, opacity: pulse }}
    />
  );
}
