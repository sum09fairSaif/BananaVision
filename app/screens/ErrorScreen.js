import { useEffect } from "react";
import { View, ScrollView, Image, AccessibilityInfo } from "react-native";
import { useNetworkState } from "expo-network";
import { Feather } from "@react-native-vector-icons/feather";
import { useTheme } from "../theme/ThemeProvider";
import { ErrorKind, networkStatus } from "../api/client";
import Screen from "../components/Screen";
import AppText from "../components/AppText";
import Button from "../components/Button";
import IconButton from "../components/IconButton";
import Notice from "../components/Notice";

// "retry" re-sends the same photo (the problem was the connection);
// "retake" goes back to the camera (the problem was the photo).
const COPY = {
  [ErrorKind.OFFLINE]: {
    icon: "wifi-off",
    tone: "warning",
    title: "You're offline",
    message:
      "BananaVision needs the internet to analyze your photo. Connect to Wi‑Fi or mobile data, then try again.",
    action: "retry",
  },
  [ErrorKind.UNREACHABLE]: {
    icon: "cloud-off",
    tone: "warning",
    title: "Can't reach BananaVision",
    message:
      "You're connected, but our server didn't respond. It may be restarting — try again in a moment.",
    action: "retry",
  },
  [ErrorKind.TIMEOUT]: {
    icon: "clock",
    tone: "warning",
    title: "That took too long",
    message: "The server is slower than usual right now. Check your connection and try again.",
    action: "retry",
  },
  [ErrorKind.SERVER]: {
    icon: "alert-triangle",
    tone: "danger",
    title: "Something went wrong",
    message: "We couldn't analyze your photo this time. Please try again.",
    action: "retry",
  },
  [ErrorKind.NOT_RECOGNIZED]: {
    icon: "eye-off",
    tone: "info",
    title: "Photo not recognized",
    message: "We couldn't find a banana in this photo. A clearer shot usually does the trick.",
    action: "retake",
    tips: [
      "Fill most of the frame with the banana",
      "Use bright, even light and avoid strong shadows",
      "Shoot against a plain, uncluttered background",
    ],
  },
  [ErrorKind.INVALID_IMAGE]: {
    icon: "image",
    tone: "danger",
    title: "We couldn't read that photo",
    message: "The file may be damaged or in an unsupported format. Try taking a new photo.",
    action: "retake",
  },
  [ErrorKind.TOO_LARGE]: {
    icon: "maximize",
    tone: "danger",
    title: "That photo is too large",
    message: "Please take a new photo or choose a smaller one.",
    action: "retake",
  },
};

const WELL = {
  info: { background: "primarySoft", foreground: "onPrimarySoft" },
  warning: { background: "warningSoft", foreground: "warning" },
  danger: { background: "dangerSoft", foreground: "danger" },
};

export default function ErrorScreen({ kind, photo, onRetry, onRetake, onHome }) {
  const { colors, space, radius } = useTheme();
  const network = useNetworkState();
  const copy = COPY[kind] ?? COPY[ErrorKind.SERVER];
  const well = WELL[copy.tone];
  const isOffline = kind === ErrorKind.OFFLINE;
  const backOnline = isOffline && networkStatus(network) === "online";

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`${copy.title}. ${copy.message}`);
  }, [copy]);

  return (
    <Screen>
      <View style={{ paddingHorizontal: space.lg, paddingVertical: space.xs }}>
        <IconButton icon="home" label="Home" onPress={onHome} />
      </View>

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: space.xl,
          paddingVertical: space.lg,
          gap: space.xl,
        }}
      >
        <View style={{ alignItems: "center", gap: space.lg }}>
          {kind === ErrorKind.NOT_RECOGNIZED && photo ? (
            // Showing the photo makes "not recognized" concrete: people can see what went wrong.
            <View>
              <Image
                source={{ uri: photo.uri }}
                accessibilityLabel="The photo you took"
                style={{
                  width: 136,
                  height: 136,
                  borderRadius: radius.lg,
                  backgroundColor: colors.surfaceSunken,
                }}
              />
              <View
                style={{
                  position: "absolute",
                  right: -12,
                  bottom: -12,
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  borderWidth: 3,
                  borderColor: colors.background,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors[well.background],
                }}
              >
                <Feather name={copy.icon} size={22} color={colors[well.foreground]} />
              </View>
            </View>
          ) : (
            <View
              style={{
                width: 88,
                height: 88,
                borderRadius: 44,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors[well.background],
              }}
            >
              <Feather name={copy.icon} size={36} color={colors[well.foreground]} />
            </View>
          )}

          <View style={{ gap: space.xs }}>
            <AppText variant="title1" accessibilityRole="header" style={{ textAlign: "center" }}>
              {copy.title}
            </AppText>
            <AppText variant="body" tone="textSecondary" style={{ textAlign: "center" }}>
              {copy.message}
            </AppText>
          </View>
        </View>

        {copy.tips ? (
          <View
            style={{
              gap: space.sm,
              padding: space.lg,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            }}
          >
            <AppText variant="overline" tone="textSecondary">
              Tips for a good scan
            </AppText>
            {copy.tips.map((tip) => (
              <View key={tip} style={{ flexDirection: "row", gap: space.sm }}>
                <Feather name="check" size={18} color={colors.primary} style={{ marginTop: 2 }} />
                <AppText variant="callout" style={{ flex: 1 }}>
                  {tip}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}

        {isOffline ? (
          <Notice
            live
            tone={backOnline ? "success" : "info"}
            icon={backOnline ? "wifi" : "loader"}
            title={backOnline ? "You're back online" : "Waiting for a connection"}
            message={
              backOnline
                ? "Tap Try again to analyze your photo."
                : "This updates as soon as you're connected."
            }
          />
        ) : null}
      </ScrollView>

      <View style={{ paddingHorizontal: space.xl, paddingVertical: space.md, gap: space.sm }}>
        {copy.action === "retry" ? (
          <>
            <Button
              label={backOnline ? "Try again now" : "Try again"}
              icon="rotate-cw"
              onPress={onRetry}
            />
            <Button label="Take a new photo" icon="camera" variant="secondary" onPress={onRetake} />
          </>
        ) : (
          <>
            <Button label="Retake photo" icon="camera" onPress={onRetake} />
            <Button label="Back to home" variant="secondary" onPress={onHome} />
          </>
        )}
      </View>
    </Screen>
  );
}
