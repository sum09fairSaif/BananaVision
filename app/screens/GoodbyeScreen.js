import { useEffect, useRef } from "react";
import { View, Animated, Easing, AppState } from "react-native";
import { Feather } from "@react-native-vector-icons/feather";
import { useTheme } from "../theme/ThemeProvider";
import { useReducedMotion } from "../hooks/useReducedMotion";
import Screen from "../components/Screen";
import AppText from "../components/AppText";
import Button from "../components/Button";
import BananaMark from "../components/BananaMark";

/**
 * iPhone "Exit app". iOS forbids apps from quitting themselves (it reads as a
 * crash and fails App Store review), so this confirms the session is over and
 * shows the system gesture that closes the app.
 */
export default function GoodbyeScreen({ firstName, onReturn }) {
  const { colors, space, radius, motion } = useTheme();
  const reduced = useReducedMotion();
  const nudge = useRef(new Animated.Value(0)).current;

  // Once the user actually leaves, reopening the app should land on Home.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background") onReturn();
    });
    return () => subscription.remove();
  }, [onReturn]);

  useEffect(() => {
    if (reduced) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(nudge, {
          toValue: 1,
          duration: motion.slow * 2,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(nudge, {
          toValue: 0,
          duration: motion.slow * 2,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, nudge, motion]);

  const translateY = nudge.interpolate({ inputRange: [0, 1], outputRange: [3, -5] });

  return (
    <Screen>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          paddingHorizontal: space.xl,
          gap: space.xl,
        }}
      >
        <BananaMark size={112} />
        <View style={{ gap: space.xs }}>
          <AppText variant="title1" accessibilityRole="header">
            {firstName ? `See you soon, ${firstName}!` : "See you soon!"}
          </AppText>
          <AppText variant="body" tone="textSecondary">
            iPhone apps don't close themselves. To leave BananaVision, swipe up from
            the bottom edge of the screen — or press the Home button if your iPhone
            has one.
          </AppText>
        </View>

        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            flexDirection: "row",
            alignItems: "center",
            alignSelf: "flex-start",
            gap: space.sm,
            paddingVertical: space.sm,
            paddingHorizontal: space.md,
            borderRadius: radius.pill,
            backgroundColor: colors.primarySoft,
          }}
        >
          <Animated.View style={{ transform: [{ translateY }] }}>
            <Feather name="chevrons-up" size={20} color={colors.onPrimarySoft} />
          </Animated.View>
          <AppText variant="callout" tone="onPrimarySoft">
            Swipe up from the bottom edge
          </AppText>
        </View>
      </View>

      <View style={{ paddingHorizontal: space.xl, paddingBottom: space.md }}>
        <Button
          label="Back to BananaVision"
          icon="arrow-left"
          iconPosition="start"
          variant="secondary"
          onPress={onReturn}
        />
      </View>
    </Screen>
  );
}
