import { useCallback, useEffect, useRef, useState } from "react";
import { View, BackHandler } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as NativeSplash from "expo-splash-screen";
import { useFonts } from "expo-font";
import { ThemeProvider, useTheme } from "./theme/ThemeProvider";
import { fontAssets } from "./theme/fontAssets";
import { loadProfile, saveProfile } from "./storage/profile";
import { analyzePhoto, warmUp, AnalyzeError, ErrorKind } from "./api/client";
import { success, failure } from "./utils/haptics";
import { primeReducedMotion } from "./hooks/useReducedMotion";
import FadeIn from "./components/FadeIn";
import LaunchScreen from "./screens/LaunchScreen";
import NameEntryScreen from "./screens/NameEntryScreen";
import HomeScreen from "./screens/HomeScreen";
import ScanScreen from "./screens/ScanScreen";
import AnalyzingScreen from "./screens/AnalyzingScreen";
import ResultScreen from "./screens/ResultScreen";
import ErrorScreen from "./screens/ErrorScreen";
import AboutScreen from "./screens/AboutScreen";
import SourcesScreen from "./screens/SourcesScreen";

// Hold the native splash until fonts, the saved profile, and the reduce-motion
// setting are ready. The launch screen then fades in as the splash fades out.
NativeSplash.preventAutoHideAsync().catch(() => {});
try {
  NativeSplash.setOptions({ duration: 350, fade: true });
} catch {
  // Not supported on this platform.
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Root />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

/**
 * Routes:
 *   boot (native splash) → launch → name (first launch only) → home → scan → analyzing → result | error
 *   home → about → name (editing)
 * A handful of linear screens don't need a navigation library; one route
 * object is easier to reason about, and Android's back button is handled below.
 */
function Root() {
  const { colors } = useTheme();
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const [profile, setProfile] = useState(undefined); // undefined = loading, null = first launch
  const [motionKnown, setMotionKnown] = useState(false);
  const [route, setRoute] = useState({ name: "boot" });
  const requestRef = useRef(null);

  useEffect(() => {
    warmUp(); // wake the server while the user is still on the welcome screens
    loadProfile().then(setProfile);
    primeReducedMotion().then(() => setMotionKnown(true));
    return () => requestRef.current?.abort();
  }, []);

  const ready = (fontsLoaded || Boolean(fontError)) && profile !== undefined && motionKnown;

  useEffect(() => {
    if (!ready || route.name !== "boot") return;
    setRoute({ name: "launch" });
    NativeSplash.hideAsync().catch(() => {});
  }, [ready, route.name]);

  const finishLaunch = useCallback(() => {
    setRoute(profile ? { name: "home" } : { name: "name", editing: false });
  }, [profile]);

  const goHome = useCallback(() => setRoute({ name: "home" }), []);

  const openScanner = useCallback(() => {
    warmUp(); // the server may have fallen asleep since launch
    setRoute({ name: "scan" });
  }, []);

  const submitName = useCallback((firstName) => {
    setProfile({ firstName });
    // Not fatal if this fails: the worst case is being asked again next launch.
    saveProfile(firstName).catch(() => {});
    setRoute({ name: "home" });
  }, []);

  const analyze = useCallback(async (photo) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setRoute({ name: "analyzing", photo, phase: "preparing", slow: false });

    // Only update the analyzing screen that belongs to this photo.
    const patch = (changes) =>
      setRoute((current) =>
        current.name === "analyzing" && current.photo === photo
          ? { ...current, ...changes }
          : current,
      );

    try {
      const result = await analyzePhoto(photo, {
        signal: controller.signal,
        onPhase: (phase) => patch({ phase }),
        onSlow: () => patch({ slow: true }),
      });
      if (controller.signal.aborted) return;
      success();
      setRoute({ name: "result", photo, result });
    } catch (error) {
      if (controller.signal.aborted) return; // cancelled; the screen already moved on
      const kind = error instanceof AnalyzeError ? error.kind : ErrorKind.SERVER;
      failure();
      setRoute({ name: "error", photo, kind });
    }
  }, []);

  const cancelAnalysis = useCallback(() => {
    requestRef.current?.abort();
    setRoute({ name: "scan" });
  }, []);

  // Android back button mirrors each screen's on-screen "back" action.
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      switch (route.name) {
        case "name":
          if (!route.editing) return false; // first launch: back leaves the app
          goHome();
          return true;
        case "analyzing":
          cancelAnalysis();
          return true;
        case "scan":
        case "result":
        case "error":
        case "about":
          goHome();
          return true;
        case "sources":
          setRoute(route.from ?? { name: "home" });
          return true;
        default:
          return false;
      }
    });
    return () => subscription.remove();
  }, [route, goHome, cancelAnalysis]);

  const firstName = profile?.firstName ?? "";
  let screen = null;

  switch (route.name) {
    case "launch":
      screen = <LaunchScreen onDone={finishLaunch} />;
      break;
    case "name":
      screen = (
        <NameEntryScreen
          editing={route.editing}
          initialName={route.editing ? firstName : ""}
          onSubmit={submitName}
          onSkip={() => submitName("")}
          onCancel={goHome}
        />
      );
      break;
    case "home":
      screen = (
        <HomeScreen
          firstName={firstName}
          onScan={openScanner}
          onAbout={() => setRoute({ name: "about" })}
          onEditName={() => setRoute({ name: "name", editing: true })}
        />
      );
      break;
    case "scan":
      screen = <ScanScreen onCapture={analyze} onClose={goHome} />;
      break;
    case "analyzing":
      screen = (
        <AnalyzingScreen
          photo={route.photo}
          phase={route.phase}
          slow={route.slow}
          onCancel={cancelAnalysis}
        />
      );
      break;
    case "result":
      screen = (
        <ResultScreen
          photo={route.photo}
          result={route.result}
          onScanAgain={openScanner}
          onRetake={openScanner}
          onHome={goHome}
          onSources={(sources) => setRoute({ name: "sources", sources, from: route })}
        />
      );
      break;
    case "sources":
      screen = (
        <SourcesScreen
          sources={route.sources}
          onBack={() => setRoute(route.from ?? { name: "home" })}
        />
      );
      break;
    case "error":
      screen = (
        <ErrorScreen
          kind={route.kind}
          photo={route.photo}
          onRetry={() => analyze(route.photo)}
          onRetake={openScanner}
          onHome={goHome}
        />
      );
      break;
    case "about":
      screen = (
        <AboutScreen
          firstName={firstName}
          onBack={goHome}
          onEditName={() => setRoute({ name: "name", editing: true })}
        />
      );
      break;
    default:
      screen = null; // "boot": the native splash is still covering the app
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <FadeIn key={route.name}>{screen}</FadeIn>
    </View>
  );
}
