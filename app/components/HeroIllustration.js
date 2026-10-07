import { useEffect, useRef } from "react";
import { View, Animated, Easing } from "react-native";
import Clock from "lucide-react-native/icons/clock";
import { useTheme } from "../theme/ThemeProvider";
import { elevation } from "../theme/tokens";
import { useReducedMotion } from "../hooks/useReducedMotion";
import Illustration from "./Illustration";
import AppText from "./AppText";

/**
 * Home hero art: the sliced-bananas illustration with two floating result chips. It previews the
 * payoff ("Ripe · 3 days left") instead of describing it. Decorative only.
 */
export default function HeroIllustration({ height = 196 }) {
  const theme = useTheme();
  const { colors, fonts, radius, dark } = theme;
  const reduced = useReducedMotion();
  const floatA = useRef(new Animated.Value(0)).current;
  const floatB = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) return undefined;
    const drift = (value, duration) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
    const loops = [drift(floatA, 2300), drift(floatB, 2800)];
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [reduced, floatA, floatB]);

  const chip = {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.elevated,
    ...elevation(2, theme),
  };
  const chipLabel = { fontFamily: fonts.textSemibold };

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ height, alignItems: "center", justifyContent: "center" }}
    >
      <View
        style={{
          position: "absolute",
          width: height * 0.86,
          height: height * 0.86,
          borderRadius: height,
          backgroundColor: colors.elevated,
          opacity: dark ? 0.05 : 0.5,
        }}
      />
      <Illustration name="sliced" height={height * 0.78} style={{ marginTop: height * 0.08 }} />

      <Animated.View
        style={[
          chip,
          {
            // The fruit rises to the right, so the chips sit in the two open
            // corners (top-left, bottom-right) and never cover it.
            top: height * 0.02,
            left: 0,
            transform: [
              { translateY: floatA.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) },
            ],
          },
        ]}
      >
        <View
          style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.stage.ripe }}
        />
        <AppText variant="subhead" style={chipLabel} maxFontSizeMultiplier={1.2}>
          Ripe
        </AppText>
      </Animated.View>

      <Animated.View
        style={[
          chip,
          {
            bottom: 0,
            right: 0,
            transform: [
              { translateY: floatB.interpolate({ inputRange: [0, 1], outputRange: [0, 4] }) },
            ],
          },
        ]}
      >
        <Clock size={14} color={colors.ink2} strokeWidth={2.2} />
        <AppText variant="subhead" style={chipLabel} maxFontSizeMultiplier={1.2}>
          3 days left
        </AppText>
      </Animated.View>
    </View>
  );
}
