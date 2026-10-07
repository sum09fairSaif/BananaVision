import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
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
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
// Per-icon imports: the package root would bundle all ~1,800 lucide icons.
import X from "lucide-react-native/icons/x";
import Flashlight from "lucide-react-native/icons/flashlight";
import FlashlightOff from "lucide-react-native/icons/flashlight-off";
import Images from "lucide-react-native/icons/images";
import ArrowRight from "lucide-react-native/icons/arrow-right";
import Lock from "lucide-react-native/icons/lock";
import WifiOff from "lucide-react-native/icons/wifi-off";
import TriangleAlert from "lucide-react-native/icons/triangle-alert";
import { useTheme } from "../theme/ThemeProvider";
import { overlay } from "../theme/tokens";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { networkStatus } from "../api/client";
import Screen from "../components/Screen";
import AppText from "../components/AppText";
import Button from "../components/Button";
import IconButton from "../components/IconButton";
import GlassView from "../components/GlassView";
import PressableScale from "../components/PressableScale";
import Reveal from "../components/Reveal";
import BottomActions from "../components/BottomActions";
import BananaMark from "../components/BananaMark";
import { capture as captureHaptic } from "../utils/haptics";

/**
 * Camera capture with a review sheet, plus a photo-library path.
 * Calls onCapture({ uri, width, height }) with the photo to analyze.
 */
export default function ScanScreen({ onCapture, onClose }) {
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [pickerError, setPickerError] = useState(false);

  // Back from the Settings app: re-read permission so the camera appears
  // without restarting.
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
        <ActivityIndicator color={overlay.foreground} />
      </View>
    );
  }

  if (!permission.granted) {
    const canAsk = permission.canAskAgain;
    return (
      <PermissionView
        title={canAsk ? "Allow camera access" : "Camera access is off"}
        body={
          canAsk
            ? "BananaVision uses your camera to photograph your banana and read how ripe it is."
            : "Turn on camera access for BananaVision in Settings, or choose a photo you've already taken."
        }
        note="Photos are analyzed, never stored."
        pickerError={pickerError}
        onClose={onClose}
      >
        <Button
          label={canAsk ? "Allow camera" : "Open Settings"}
          onPress={canAsk ? requestPermission : () => Linking.openSettings()}
        />
        <Button label="Choose from photos" variant="plain" onPress={pickFromLibrary} />
      </PermissionView>
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
  const frameScale = useRef(new Animated.Value(1)).current;
  const flash = useRef(new Animated.Value(0)).current;

  // The frame breathes slowly while waiting — alive, but never busy.
  useEffect(() => {
    if (reduced || !ready || review || busy) return undefined;
    const ease = Easing.inOut(Easing.sin);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(frameScale, { toValue: 1.015, duration: 1500, easing: ease, useNativeDriver: true }),
        Animated.timing(frameScale, { toValue: 1, duration: 1500, easing: ease, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, ready, review, busy, frameScale]);

  async function takePhoto() {
    if (!ready || busy || !cameraRef.current) return;
    setBusy(true);
    setCaptureError(false);
    captureHaptic();
    if (!reduced) {
      Animated.sequence([
        Animated.timing(frameScale, {
          toValue: 0.965,
          duration: 110,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(frameScale, { toValue: 1, speed: 14, bounciness: 8, useNativeDriver: true }),
      ]).start();
      flash.setValue(0.55);
      Animated.timing(flash, {
        toValue: 0,
        duration: 380,
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
      <PermissionView
        title="Camera unavailable"
        body="Your camera couldn't start — another app might be using it. You can still choose a photo from your library."
        pickerError={pickerError}
        onClose={onClose}
      >
        <Button label="Choose from photos" onPress={onPick} />
        <Button label="Go back" variant="plain" tone="neutral" onPress={onClose} />
      </PermissionView>
    );
  }

  const frame = layout ? frameFor(layout) : null;

  let hint = { text: "Center the banana in the frame" };
  if (!ready) hint = { text: "Starting camera…" };
  if (offline) hint = { text: "No internet — connect to Wi‑Fi or mobile data", icon: WifiOff, caution: true };
  if (pickerError) hint = { text: "Couldn't open your photos", icon: TriangleAlert, caution: true };
  if (captureError) hint = { text: "Couldn't take the photo — try again", icon: TriangleAlert, caution: true };
  const hintColor = hint.caution ? overlay.caution : overlay.foreground;

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
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { transform: [{ scale: frameScale }] }]}
        >
          <Svg width={layout.width} height={layout.height}>
            <Path d={cutoutPath(layout, frame)} fill={overlay.scrim} fillRule="evenodd" />
            <Path
              d={cornersPath(frame)}
              stroke={overlay.frame}
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </Animated.View>
      ) : null}

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: "#FFFFFF", opacity: flash }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0.5)", "rgba(0,0,0,0)"]}
        style={[styles.fadeTop, { height: insets.top + 120 }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.55)"]}
        style={[styles.fadeBottom, { height: insets.bottom + 200 }]}
      />

      <View style={[styles.topBar, { top: insets.top + space.xs, left: space.md, right: space.md }]}>
        <IconButton icon={X} label="Close camera" variant="glass" onPress={onClose} />
        <IconButton
          icon={torch ? Flashlight : FlashlightOff}
          label="Flashlight"
          variant="glass"
          selected={torch}
          disabled={!ready}
          onPress={() => setTorch((on) => !on)}
        />
      </View>

      {frame ? (
        <View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={[styles.hintRow, { top: frame.y + frame.height + space.lg }]}
        >
          <GlassView style={styles.hint}>
            {hint.icon ? <hint.icon size={15} color={hintColor} strokeWidth={2.2} /> : null}
            <AppText variant="subhead" style={[styles.hintText, { color: hintColor }]}>
              {hint.text}
            </AppText>
          </GlassView>
        </View>
      ) : null}

      <View style={[styles.controls, { bottom: insets.bottom + space.xl }]}>
        <PressableScale
          onPress={onPick}
          pressedScale={0.92}
          accessibilityRole="button"
          accessibilityLabel="Choose from photos"
        >
          <GlassView style={styles.gallery}>
            <Images size={22} color={overlay.foreground} strokeWidth={2} />
          </GlassView>
        </PressableScale>
        <Shutter onPress={takePhoto} disabled={!ready || busy} busy={busy} />
        <View style={styles.controlSpacer} />
      </View>

      {review ? (
        <ReviewSheet
          photo={review}
          onRetake={() => setReview(null)}
          onUse={() => onCapture(review)}
        />
      ) : null}
    </View>
  );
}

function Shutter({ onPress, disabled, busy }) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      haptic={false}
      pressedScale={0.9}
      accessibilityRole="button"
      accessibilityLabel="Take photo"
      accessibilityState={{ disabled, busy }}
      contentStyle={[styles.shutter, { opacity: disabled && !busy ? 0.55 : 1 }]}
    >
      <View style={styles.shutterInner}>
        {busy ? <ActivityIndicator color="#102A28" /> : null}
      </View>
    </PressableScale>
  );
}

function ReviewSheet({ photo, onRetake, onUse }) {
  const { colors, space, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const rise = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(rise, { toValue: 1, speed: 14, bounciness: 3, useNativeDriver: true }).start();
  }, [rise]);

  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [340, 0] });

  return (
    <View style={[StyleSheet.absoluteFill, styles.camera]}>
      <Image
        source={{ uri: photo.uri }}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        transition={reduced ? 0 : 180}
        accessibilityLabel="The photo you just took"
      />
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.canvas,
            borderTopLeftRadius: radius.sheet,
            borderTopRightRadius: radius.sheet,
            paddingHorizontal: space.xl,
            paddingTop: space.sm,
            paddingBottom: insets.bottom + space.md,
            transform: [{ translateY }],
          },
        ]}
      >
        <View style={[styles.grabber, { backgroundColor: colors.separator }]} />
        <AppText variant="title" accessibilityRole="header" style={{ marginTop: space.md }}>
          Use this photo?
        </AppText>
        <AppText variant="callout" tone="ink2" style={{ marginTop: space.xxs }}>
          Check that the banana is sharp and well lit.
        </AppText>
        <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.xl }}>
          <Button label="Retake" variant="secondary" onPress={onRetake} style={{ flex: 1 }} />
          <Button label="Analyze" icon={ArrowRight} onPress={onUse} style={{ flex: 1.4 }} />
        </View>
      </Animated.View>
    </View>
  );
}

// Explains a blocked camera and offers the way forward.
function PermissionView({ title, body, note, pickerError, onClose, children }) {
  const { colors, space } = useTheme();
  return (
    <Screen>
      <View style={{ minHeight: 56, paddingHorizontal: space.md, justifyContent: "center" }}>
        <IconButton icon={X} label="Close" variant="plain" onPress={onClose} />
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
          <BananaMark size={112} />
        </Reveal>
        <Reveal delay={70} style={{ marginTop: space.xxl }}>
          <AppText variant="display" accessibilityRole="header">
            {title}
          </AppText>
          <AppText variant="body" tone="ink2" style={{ marginTop: space.sm }}>
            {body}
          </AppText>
          {note ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: space.xs, marginTop: space.lg }}
            >
              <Lock size={13} color={colors.ink3} strokeWidth={2.2} />
              <AppText variant="footnote" tone="ink3">
                {note}
              </AppText>
            </View>
          ) : null}
          {pickerError ? (
            <AppText
              variant="footnote"
              tone="critical"
              accessibilityLiveRegion="polite"
              style={{ marginTop: space.md }}
            >
              Couldn't open your photos. Please try again.
            </AppText>
          ) : null}
        </Reveal>
      </ScrollView>
      <BottomActions>{children}</BottomActions>
    </Screen>
  );
}

// Viewfinder geometry from the real layout, so the dimmed cut-out, corners,
// and hint line up on every screen size.
const FRAME_RADIUS = 22;

function frameFor(layout) {
  const width = Math.min(layout.width * 0.74, 340);
  const height = Math.min(width * 1.2, layout.height * 0.5);
  return {
    width,
    height,
    x: (layout.width - width) / 2,
    y: (layout.height - height) / 2 - 36,
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

function cornersPath({ x, y, width: w, height: h }, r = FRAME_RADIUS, arm = 36) {
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
  fadeTop: { position: "absolute", top: 0, left: 0, right: 0 },
  fadeBottom: { position: "absolute", bottom: 0, left: 0, right: 0 },
  topBar: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hintRow: { position: "absolute", left: 24, right: 24, alignItems: "center" },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: "100%",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  hintText: { flexShrink: 1, textAlign: "center" },
  controls: {
    position: "absolute",
    left: 32,
    right: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  gallery: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  controlSpacer: { width: 52 },
  shutter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0 },
  grabber: { width: 36, height: 5, borderRadius: 3, alignSelf: "center" },
});
