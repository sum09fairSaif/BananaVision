import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Animated, StyleSheet, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../theme/ThemeProvider";
import { useReducedMotion } from "../hooks/useReducedMotion";
import AppText from "../components/AppText";
import Reveal from "../components/Reveal";
import BananaBurst from "../components/BananaBurst";

/**
 * Launch screen shown once fonts and the saved profile are ready, right after
 * the native splash fades. Art on top, a progress bar, then the wordmark.
 * It runs about seven and a half seconds, then hands over to the next screen.
 */
export default function LaunchScreen({ onDone }) {
  const { colors, fonts, space, radius, motion, dark } = useTheme();
  const reduced = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(1)).current;
  const [percent, setPercent] = useState(0);
  const [lineWidth, setLineWidth] = useState(0);
  const finished = useRef(false);
  const timer = useRef(null);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    progress.stopAnimation();
    Animated.timing(exit, {
      toValue: 0,
      duration: reduced ? 0 : motion.base,
      easing: motion.easeInOut,
      useNativeDriver: true,
    }).start(() => onDoneRef.current());
  }, [exit, progress, reduced, motion]);

  useEffect(() => {
    const step = (toValue, duration, delay = 0) =>
      Animated.timing(progress, {
        toValue,
        duration,
        delay,
        easing: motion.easeInOut,
        useNativeDriver: false, // animates width
      });
    // Loading rarely moves at a constant speed; a few uneven steps read as real
    // work. About 7.1 s of filling, then a short hold and the exit fade.
    const run = Animated.sequence([
      step(0.22, 1300, 400),
      step(0.48, 1500, 250),
      step(0.7, 1200, 300),
      step(0.93, 1300, 200),
      step(1, 500, 150),
    ]);
    const listener = progress.addListener(({ value }) => {
      setPercent((current) => {
        const next = Math.round(value * 10) * 10;
        return next === current ? current : next;
      });
    });
    run.start(({ finished: done }) => {
      if (done) timer.current = setTimeout(finish, 220);
    });
    return () => {
      run.stop();
      progress.removeListener(listener);
      clearTimeout(timer.current);
    };
  }, [progress, motion, finish]);

  // Keep the whole composition on one screen, even on short phones.
  const artWidth = Math.max(180, Math.min(width - space.md * 2, 380, (height - 330) * (320 / 300)));
  // "BananaVision" in Fraunces runs about 6.6× its font size; fit it to the line.
  const wordmarkSize = Math.min(58, Math.floor((lineWidth || width - space.xl * 2) / 6.9));

  return (
    <Animated.View style={{ flex: 1, opacity: exit, backgroundColor: colors.canvas }}>
      <StatusBar style={dark ? "light" : "dark"} />
      <LinearGradient
        pointerEvents="none"
        colors={[colors.heroFrom, colors.heroTo, colors.canvas]}
        locations={[0, 0.45, 0.85]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <BananaBurst width={artWidth} animated={!reduced} />
          </View>

          <View
            onLayout={(event) => setLineWidth(event.nativeEvent.layout.width - space.xl * 2)}
            style={{ paddingHorizontal: space.xl, paddingBottom: space.xxl }}
          >
            <View
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel="Loading BananaVision"
              accessibilityValue={{ min: 0, max: 100, now: percent }}
              style={{
                height: 16,
                borderRadius: radius.pill,
                padding: 3,
                backgroundColor: dark ? colors.sunken : colors.elevated,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: colors.separator,
              }}
            >
              <Animated.View
                style={{
                  height: "100%",
                  borderRadius: radius.pill,
                  overflow: "hidden",
                  width: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
                }}
              >
                <LinearGradient
                  colors={[colors.stage.ripe, "#F6D766"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
            </View>

            <View
              accessible
              accessibilityRole="header"
              accessibilityLabel="Activating your trusted BananaVision"
              style={{ marginTop: space.xxl, alignItems: "center" }}
            >
              <Reveal delay={reduced ? 0 : 250}>
                <AppText
                  variant="headline"
                  tone="ink2"
                  style={{ fontSize: 21, lineHeight: 28, textAlign: "center" }}
                  maxFontSizeMultiplier={1.4}
                >
                  activating your trusted
                </AppText>
              </Reveal>
              <Reveal delay={reduced ? 0 : 380} style={{ alignSelf: "stretch" }}>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                  // A logo, not body text: fixed size, and read aloud via the label above.
                  allowFontScaling={false}
                  style={{
                    fontFamily: fonts.display,
                    fontSize: wordmarkSize,
                    lineHeight: Math.round(wordmarkSize * 1.18),
                    letterSpacing: -wordmarkSize * 0.028,
                    color: colors.ink,
                    textAlign: "center",
                  }}
                >
                  Banana
                  <Text style={{ fontFamily: fonts.displayItalic, color: colors.accent }}>Vision</Text>
                </Text>
              </Reveal>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}
