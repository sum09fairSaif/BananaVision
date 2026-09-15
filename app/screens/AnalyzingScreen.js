import { useEffect, useRef } from "react";
import {
  View,
  Image,
  Animated,
  Easing,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../theme/ThemeProvider";
import { cameraChrome } from "../theme/tokens";
import { useReducedMotion } from "../hooks/useReducedMotion";
import Screen from "../components/Screen";
import AppText from "../components/AppText";
import Button from "../components/Button";
import Notice from "../components/Notice";

/**
 * Upload-and-analyze wait state. `slow` flips on after a few seconds so a
 * sleeping server reads as "working", never as "frozen".
 */
export default function AnalyzingScreen({ photo, slow, onCancel }) {
  const { colors, space, radius } = useTheme();
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();
  const size = Math.min(width * 0.62, 280);
  const sweep = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) return undefined;
    const loops = [
      Animated.loop(
        Animated.timing(sweep, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ),
      Animated.loop(
        Animated.timing(halo, {
          toValue: 1,
          duration: 2000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ),
    ];
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [reduced, sweep, halo]);

  const sweepY = sweep.interpolate({ inputRange: [0, 1], outputRange: [-64, size] });
  const haloScale = halo.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const haloOpacity = halo.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });

  return (
    <Screen>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: space.xl,
          gap: space.xxl,
        }}
      >
        <View
          style={{ width: size, height: size }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {!reduced ? (
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: radius.xl,
                  borderWidth: 2,
                  borderColor: colors.turquoise,
                  opacity: haloOpacity,
                  transform: [{ scale: haloScale }],
                },
              ]}
            />
          ) : null}
          <View
            style={{
              flex: 1,
              borderRadius: radius.xl,
              overflow: "hidden",
              backgroundColor: colors.surfaceSunken,
            }}
          >
            <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            {!reduced ? (
              <Animated.View
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  transform: [{ translateY: sweepY }],
                }}
              >
                <LinearGradient
                  colors={["rgba(127,227,214,0)", "rgba(127,227,214,0.45)"]}
                  style={{ height: 62 }}
                />
                <View style={{ height: 2, backgroundColor: cameraChrome.accent }} />
              </Animated.View>
            ) : null}
          </View>
        </View>

        <View style={{ alignItems: "center", gap: space.xs }} accessibilityLiveRegion="polite">
          <AppText variant="title2" accessibilityRole="header" style={{ textAlign: "center" }}>
            Checking your banana
          </AppText>
          <AppText variant="body" tone="textSecondary" style={{ textAlign: "center" }}>
            {slow ? "Still working on it…" : "This usually takes a few seconds."}
          </AppText>
          {reduced ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: space.xs }} />
          ) : null}
        </View>

        {slow ? (
          <Notice
            live
            tone="info"
            icon="coffee"
            title="Taking a little longer"
            message="If our server was asleep, the first scan can take up to a minute. Hang tight."
            style={{ alignSelf: "stretch" }}
          />
        ) : null}
      </View>

      <View style={{ paddingHorizontal: space.xl, paddingBottom: space.md }}>
        <Button label="Cancel" variant="quiet" onPress={onCancel} />
      </View>
    </Screen>
  );
}
