import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Image,
  Pressable,
  ScrollView,
  Animated,
  Easing,
  ActivityIndicator,
  StyleSheet,
  Linking,
  AppState,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useNetworkState } from "expo-network";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { Feather } from "@react-native-vector-icons/feather";
import { useTheme } from "../theme/ThemeProvider";
import { cameraChrome, HIT_TARGET } from "../theme/tokens";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { networkStatus } from "../api/client";
import Screen from "../components/Screen";
import AppText from "../components/AppText";
import Button from "../components/Button";
import IconButton from "../components/IconButton";
import Notice from "../components/Notice";
import { capture as captureHaptic } from "../utils/haptics";

/**
 * Camera capture with a review step, plus a photo-library fallback.
 * Calls onCapture({ uri, width, height }) with the photo to analyze.
 */
export default function ScanScreen({ onCapture, onClose }) {
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [pickerError, setPickerError] = useState(false);

  // Coming back from the Settings app: re-read permission so the camera
  // appears without restarting the app.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") getPermission();
    });
    return () => subscription.remove();
  }, [getPermission]);

  const pickFromLibrary = useCallback(async () => {
    setPickerError(false);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        quality: 1,
      });
      const asset = result.canceled ? null : result.assets?.[0];
      if (asset) onCapture({ uri: asset.uri, width: asset.width, height: asset.height });
    } catch {
      setPickerError(true);
    }
  }, [onCapture]);

  if (!permission) {
    return (
      <View style={[styles.camera, styles.center]}>
        <StatusBar style="light" />
        <ActivityIndicator color={cameraChrome.foreground} />
      </View>
    );
  }

  if (!permission.granted) {
    const canAsk = permission.canAskAgain;
    return (
      <MessageLayout
        icon={canAsk ? "camera" : "camera-off"}
        title={canAsk ? "Let's use your camera" : "Camera access is off"}
        body={
          canAsk
            ? "BananaVision needs your camera to photograph your banana. Photos are only used to check ripeness and aren't stored."
            : "To scan a banana, turn on camera access for BananaVision in Settings. Or pick a photo you've already taken."
        }
        pickerError={pickerError}
        onClose={onClose}
      >
        <Button
          label={canAsk ? "Allow camera" : "Open Settings"}
          icon={canAsk ? "camera" : "settings"}
          onPress={canAsk ? requestPermission : () => Linking.openSettings()}
        />
        <Button
          label="Choose from photos"
          icon="image"
          variant="secondary"
          onPress={pickFromLibrary}
        />
      </MessageLayout>
    );
  }

  return (
    <CameraCapture
      onCapture={onCapture}
      onClose={onClose}
      onPick={pickFromLibrary}
      pickerError={pickerError}
    />
  );
}

function CameraCapture({ onCapture, onClose, onPick, pickerError }) {
  const { space, motion } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const network = useNetworkState();
  const offline = networkStatus(network) === "offline";

  const cameraRef = useRef(null);
  const [layout, setLayout] = useState(null);
  const [ready, setReady] = useState(false);
  const [mountError, setMountError] = useState(false);
  const [torch, setTorch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [captureError, setCaptureError] = useState(false);
  const [review, setReview] = useState(null);
  const flash = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced || review || !ready) return undefined;
    const ease = Easing.inOut(Easing.quad);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: 1800, easing: ease, useNativeDriver: true }),
        Animated.timing(sweep, { toValue: 0, duration: 1800, easing: ease, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, review, ready, sweep]);

  async function takePhoto() {
    if (!ready || busy || !cameraRef.current) return;
    setBusy(true);
    setCaptureError(false);
    captureHaptic();
    if (!reduced) {
      flash.setValue(0.85);
      Animated.timing(flash, {
        toValue: 0,
        duration: motion.slow,
        easing: motion.easeOut,
        useNativeDriver: true,
      }).start();
    }
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      setReview({ uri: photo.uri, width: photo.width, height: photo.height });
    } catch {
      setCaptureError(true);
    } finally {
      setBusy(false);
    }
  }

  if (mountError) {
    return (
      <MessageLayout
        icon="camera-off"
        title="Camera unavailable"
        body="Your camera couldn't start — another app may be using it. You can still choose a photo from your library."
        pickerError={pickerError}
        onClose={onClose}
      >
        <Button label="Choose from photos" icon="image" onPress={onPick} />
        <Button label="Go back" variant="secondary" onPress={onClose} />
      </MessageLayout>
    );
  }

  const frame = layout ? frameFor(layout, space.xl) : null;

  let hint = { text: "Fit the whole banana inside the frame", warning: false };
  if (!ready) hint = { text: "Starting camera…", warning: false };
  if (offline) hint = { text: "You're offline — connect to Wi‑Fi or mobile data", warning: true };
  if (pickerError) hint = { text: "Couldn't open your photos. Please try again.", warning: true };
  if (captureError) hint = { text: "Couldn't take the photo. Hold steady and try again.", warning: true };

  return (
    <View style={styles.camera} onLayout={(e) => setLayout(e.nativeEvent.layout)}>
      <StatusBar style="light" />
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch && !review}
        active={!review}
        onCameraReady={() => setReady(true)}
        onMountError={() => setMountError(true)}
      />

      {frame ? (
        <>
          <Svg
            width={layout.width}
            height={layout.height}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            <Path d={cutoutPath(layout, frame)} fill={cameraChrome.scrim} fillRule="evenodd" />
            <Path
              d={bracketsPath(frame)}
              stroke={cameraChrome.accent}
              strokeWidth={5}
              strokeLinecap="round"
              fill="none"
            />
          </Svg>

          {!reduced && ready ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.sweep,
                {
                  left: frame.x + 20,
                  width: frame.width - 40,
                  top: frame.y + 12,
                  transform: [
                    {
                      translateY: sweep.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, frame.height - 24],
                      }),
                    },
                  ],
                },
              ]}
            />
          ) : null}

          <View
            pointerEvents="none"
            accessibilityLiveRegion="polite"
            style={[styles.hintWrap, { top: frame.y + frame.height + space.md }]}
          >
            <View style={[styles.hint, hint.warning && styles.hintWarning]}>
              {hint.warning ? (
                <Feather name="alert-triangle" size={14} color={cameraChrome.onWarning} />
              ) : null}
              <AppText
                variant="callout"
                style={[
                  styles.hintText,
                  { color: hint.warning ? cameraChrome.onWarning : cameraChrome.foreground },
                ]}
              >
                {hint.text}
              </AppText>
            </View>
          </View>
        </>
      ) : null}

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: "#FFFFFF", opacity: flash }]}
      />

      <View style={[styles.topBar, { top: insets.top + space.xs, left: space.lg, right: space.lg }]}>
        <IconButton icon="x" label="Close camera" variant="overlay" onPress={onClose} />
        <AppText
          variant="headline"
          accessibilityRole="header"
          style={{ color: cameraChrome.foreground }}
        >
          Scan a banana
        </AppText>
        <IconButton
          icon={torch ? "zap" : "zap-off"}
          label="Flashlight"
          variant="overlay"
          selected={torch}
          disabled={!ready}
          onPress={() => setTorch((on) => !on)}
        />
      </View>

      <View style={[styles.bottomBar, { bottom: insets.bottom + space.xl }]}>
        <IconButton icon="image" label="Choose from photos" variant="overlay" onPress={onPick} />
        <Shutter onPress={takePhoto} disabled={!ready || busy} busy={busy} />
        <View style={{ width: HIT_TARGET }} />
      </View>

      {review ? (
        <View style={[StyleSheet.absoluteFill, styles.camera]}>
          <Image
            source={{ uri: review.uri }}
            style={StyleSheet.absoluteFill}
            resizeMode="contain"
            accessibilityLabel="The photo you just took"
          />
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(0,0,0,0.6)", "rgba(0,0,0,0)"]}
            style={[styles.gradientTop, { height: insets.top + 96 }]}
          />
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.72)"]}
            style={[styles.gradientBottom, { height: insets.bottom + 180 }]}
          />
          <View
            style={[
              styles.topBar,
              { top: insets.top + space.xs, left: space.lg, right: space.lg, minHeight: HIT_TARGET },
            ]}
          >
            <View style={{ width: HIT_TARGET }} />
            <AppText
              variant="headline"
              accessibilityRole="header"
              style={{ color: cameraChrome.foreground }}
            >
              Use this photo?
            </AppText>
            <View style={{ width: HIT_TARGET }} />
          </View>
          <View
            style={[
              styles.reviewActions,
              { bottom: insets.bottom + space.xl, left: space.xl, right: space.xl, gap: space.sm },
            ]}
          >
            <Button
              label="Retake"
              icon="rotate-ccw"
              iconPosition="start"
              variant="secondary"
              onPress={() => setReview(null)}
              style={{ flex: 1 }}
            />
            <Button
              label="Analyze"
              icon="arrow-right"
              onPress={() => onCapture(review)}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Shutter({ onPress, disabled, busy }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Take photo"
      accessibilityState={{ disabled, busy }}
      style={({ pressed }) => [
        styles.shutter,
        { opacity: disabled && !busy ? 0.5 : 1, transform: [{ scale: pressed ? 0.92 : 1 }] },
      ]}
    >
      <View style={styles.shutterInner}>
        {busy ? <ActivityIndicator color="#0B2B2A" /> : null}
      </View>
    </Pressable>
  );
}

// Full-screen explanation with actions, for permission and camera failures.
function MessageLayout({ icon, title, body, pickerError, onClose, children }) {
  const { colors, space, radius } = useTheme();
  return (
    <Screen>
      <View style={{ paddingHorizontal: space.lg, paddingVertical: space.xs }}>
        <IconButton icon="x" label="Close" onPress={onClose} />
      </View>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: space.xl,
          paddingVertical: space.lg,
          gap: space.lg,
        }}
      >
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: radius.lg,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.primarySoft,
          }}
        >
          <Feather name={icon} size={32} color={colors.onPrimarySoft} />
        </View>
        <View style={{ gap: space.xs }}>
          <AppText variant="title1" accessibilityRole="header">
            {title}
          </AppText>
          <AppText variant="body" tone="textSecondary">
            {body}
          </AppText>
        </View>
        {pickerError ? (
          <Notice tone="danger" title="Couldn't open your photos" message="Please try again." live />
        ) : null}
      </ScrollView>
      <View style={{ paddingHorizontal: space.xl, paddingVertical: space.md, gap: space.sm }}>
        {children}
      </View>
    </Screen>
  );
}

// Viewfinder geometry, derived from the real layout so the dimmed cut-out,
// brackets, sweep line, and hint all line up on every screen size.
const FRAME_RADIUS = 24;

function frameFor(layout, lift) {
  const width = Math.min(layout.width * 0.78, 360);
  const height = Math.min(width * 1.15, layout.height * 0.52);
  return {
    width,
    height,
    x: (layout.width - width) / 2,
    y: (layout.height - height) / 2 - lift,
  };
}

function cutoutPath({ width: W, height: H }, { x, y, width: w, height: h }, r = FRAME_RADIUS) {
  const right = x + w;
  const bottom = y + h;
  return [
    `M0 0H${W}V${H}H0Z`,
    `M${x + r} ${y}H${right - r}Q${right} ${y} ${right} ${y + r}`,
    `V${bottom - r}Q${right} ${bottom} ${right - r} ${bottom}`,
    `H${x + r}Q${x} ${bottom} ${x} ${bottom - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`,
  ].join(" ");
}

function bracketsPath({ x, y, width: w, height: h }, r = FRAME_RADIUS, arm = 44) {
  const right = x + w;
  const bottom = y + h;
  return [
    `M${x} ${y + arm}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + arm}`,
    `M${right - arm} ${y}H${right - r}Q${right} ${y} ${right} ${y + r}V${y + arm}`,
    `M${right} ${bottom - arm}V${bottom - r}Q${right} ${bottom} ${right - r} ${bottom}H${right - arm}`,
    `M${x + arm} ${bottom}H${x + r}Q${x} ${bottom} ${x} ${bottom - r}V${bottom - arm}`,
  ].join(" ");
}

const styles = StyleSheet.create({
  camera: { flex: 1, backgroundColor: "#000000" },
  center: { alignItems: "center", justifyContent: "center" },
  topBar: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sweep: {
    position: "absolute",
    height: 2,
    borderRadius: 1,
    backgroundColor: cameraChrome.accent,
    shadowColor: cameraChrome.accent,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  hintWrap: { position: "absolute", left: 24, right: 24, alignItems: "center" },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: "100%",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: cameraChrome.control,
  },
  hintWarning: { backgroundColor: cameraChrome.warning },
  hintText: { flexShrink: 1, textAlign: "center" },
  bottomBar: {
    position: "absolute",
    left: 32,
    right: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  shutter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  gradientTop: { position: "absolute", top: 0, left: 0, right: 0 },
  gradientBottom: { position: "absolute", bottom: 0, left: 0, right: 0 },
  reviewActions: { position: "absolute", flexDirection: "row" },
});
