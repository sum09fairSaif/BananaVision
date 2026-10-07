import { useEffect, useRef } from "react";
import { View, ScrollView, Animated, Easing, AccessibilityInfo, StyleSheet } from "react-native";
import { useNetworkState } from "expo-network";
import { Image } from "expo-image";
import X from "lucide-react-native/icons/x";
import WifiOff from "lucide-react-native/icons/wifi-off";
import CloudOff from "lucide-react-native/icons/cloud-off";
import Timer from "lucide-react-native/icons/timer";
import TriangleAlert from "lucide-react-native/icons/triangle-alert";
import SearchX from "lucide-react-native/icons/search-x";
import ImageOff from "lucide-react-native/icons/image-off";
import RotateCcw from "lucide-react-native/icons/rotate-ccw";
import Camera from "lucide-react-native/icons/camera";
import { useTheme } from "../theme/ThemeProvider";
import { elevation } from "../theme/tokens";
import { ErrorKind, networkStatus } from "../api/client";
import { useReducedMotion } from "../hooks/useReducedMotion";
import Screen from "../components/Screen";
import AppText from "../components/AppText";
import Button from "../components/Button";
import IconButton from "../components/IconButton";
import Reveal from "../components/Reveal";
import BottomActions from "../components/BottomActions";

// "retry" re-sends the same photo (the connection failed);
// "retake" returns to the camera (the photo was the problem).
const COPY = {
  [ErrorKind.OFFLINE]: {
    icon: WifiOff,
    title: "You're offline",
    message:
      "BananaVision needs an internet connection to read your photo. Connect to Wi‑Fi or mobile data and we'll pick up where you left off.",
    action: "retry",
  },
  [ErrorKind.UNREACHABLE]: {
    icon: CloudOff,
    title: "Can't reach our server",
    message:
      "Your connection looks fine, but the server didn't answer. It may be restarting — try again in a moment.",
    action: "retry",
  },
  [ErrorKind.TIMEOUT]: {
    icon: Timer,
    title: "This is taking too long",
    message: "The server is slower than usual right now. Check your connection and try again.",
    action: "retry",
  },
  [ErrorKind.SERVER]: {
    icon: TriangleAlert,
    title: "Something went wrong",
    message: "We couldn't analyze your photo this time. Please try again.",
    action: "retry",
  },
  [ErrorKind.NOT_RECOGNIZED]: {
    icon: SearchX,
    title: "We couldn't find a banana",
    message: "This photo wasn't recognized as a banana. A clearer shot usually does it.",
    action: "retake",
    tips: [
      ["Fill the frame", "Get close enough that the banana takes up most of the photo."],
      ["Find soft, even light", "Daylight works best. Avoid harsh shadows and glare."],
      ["Keep the background simple", "A plain counter or table helps the banana stand out."],
    ],
  },
  [ErrorKind.INVALID_IMAGE]: {
    icon: ImageOff,
    title: "We couldn't read that photo",
    message: "The file may be damaged or in an unsupported format. Try taking a new photo.",
    action: "retake",
  },
  [ErrorKind.TOO_LARGE]: {
    icon: ImageOff,
    title: "That photo is too large",
    message: "Please take a new photo, or choose a smaller one from your library.",
    action: "retake",
  },
};

export default function ErrorScreen({ kind, photo, onRetry, onRetake, onHome }) {
  const theme = useTheme();
  const { colors, space } = theme;
  const network = useNetworkState();
  const copy = COPY[kind] ?? COPY[ErrorKind.SERVER];
  const isOffline = kind === ErrorKind.OFFLINE;
  const backOnline = isOffline && networkStatus(network) === "online";
  const Icon = copy.icon;

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`${copy.title}. ${copy.message}`);
  }, [copy]);

  return (
    <Screen>
      <View style={{ minHeight: 56, paddingHorizontal: space.md, justifyContent: "center" }}>
        <IconButton icon={X} label="Close" variant="plain" onPress={onHome} />
      </View>

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: space.xl,
          paddingTop: space.lg,
          paddingBottom: space.xl,
        }}
      >
        <Reveal>
          {kind === ErrorKind.NOT_RECOGNIZED && photo ? (
            // Seeing the photo makes "not recognized" concrete.
            <View style={{ width: 132, height: 132 }}>
              <View
                style={[
                  {
                    width: 132,
                    height: 132,
                    borderRadius: 26,
                    backgroundColor: colors.sunken,
                    transform: [{ rotate: "-5deg" }],
                  },
                  elevation(2, theme),
                ]}
              >
                <Image
                  source={{ uri: photo.uri }}
                  style={{ flex: 1, borderRadius: 26 }}
                  contentFit="cover"
                  accessibilityLabel="The photo you took"
                />
              </View>
              <View
                style={[
                  {
                    position: "absolute",
                    right: -14,
                    bottom: -10,
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: colors.elevated,
                  },
                  elevation(2, theme),
                ]}
              >
                <SearchX size={22} color={colors.caution} strokeWidth={2} />
              </View>
            </View>
          ) : (
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 22,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.sunken,
              }}
            >
              <Icon size={30} color={colors.ink2} strokeWidth={1.8} />
            </View>
          )}
        </Reveal>

        <Reveal delay={70} style={{ marginTop: space.xxl }}>
          <AppText variant="display" accessibilityRole="header">
            {copy.title}
          </AppText>
          <AppText variant="body" tone="ink2" style={{ marginTop: space.sm }}>
            {copy.message}
          </AppText>
        </Reveal>

        {copy.tips ? (
          <Reveal delay={140} style={{ marginTop: space.xxl }}>
            <AppText variant="headline">For a better shot</AppText>
            <View style={{ marginTop: space.xs }}>
              {copy.tips.map(([title, detail], i) => (
                <View
                  key={title}
                  style={{
                    flexDirection: "row",
                    gap: space.md,
                    paddingVertical: space.md,
                    borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                    borderTopColor: colors.separator,
                  }}
                >
                  <AppText variant="title" tone="accent" style={{ width: 20 }}>
                    {i + 1}
                  </AppText>
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText variant="headline">{title}</AppText>
                    <AppText variant="callout" tone="ink2">
                      {detail}
                    </AppText>
                  </View>
                </View>
              ))}
            </View>
          </Reveal>
        ) : null}

        {isOffline ? (
          <Reveal delay={140} style={{ marginTop: space.xl }}>
            <ConnectionStatus online={backOnline} />
          </Reveal>
        ) : null}
      </ScrollView>

      <BottomActions>
        {copy.action === "retry" ? (
          <>
            <Button
              label={backOnline ? "Try again now" : "Try again"}
              icon={RotateCcw}
              iconPlacement="leading"
              onPress={onRetry}
            />
            <Button label="Take a new photo" variant="plain" onPress={onRetake} />
          </>
        ) : (
          <>
            <Button label="Retake photo" icon={Camera} iconPlacement="leading" onPress={onRetake} />
            <Button label="Back to home" variant="plain" tone="neutral" onPress={onHome} />
          </>
        )}
      </BottomActions>
    </Screen>
  );
}

// Live connection indicator: pulses while waiting, settles green when back.
function ConnectionStatus({ online }) {
  const { colors, space, radius } = useTheme();
  const reduced = useReducedMotion();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (online || reduced) {
      pulse.setValue(1);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [online, reduced, pulse]);

  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: space.sm,
        paddingHorizontal: space.md,
        paddingVertical: space.sm,
        borderRadius: radius.pill,
        backgroundColor: online ? colors.positiveSoft : colors.sunken,
      }}
    >
      <Animated.View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          opacity: pulse,
          backgroundColor: online ? colors.positive : colors.caution,
        }}
      />
      <AppText variant="subhead" tone={online ? "positive" : "ink2"}>
        {online ? "Back online — ready when you are" : "Waiting for a connection…"}
      </AppText>
    </View>
  );
}
