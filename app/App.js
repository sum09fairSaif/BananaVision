import { useCallback, useEffect, useRef, useState } from "react";
import { View, BackHandler, Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import {
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from "@expo-google-fonts/nunito";
import { Baloo2_700Bold, Baloo2_800ExtraBold } from "@expo-google-fonts/baloo-2";
import { ThemeProvider, useTheme } from "./theme/ThemeProvider";
import { loadProfile, saveProfile } from "./storage/profile";
import { analyzePhoto, warmUp, AnalyzeError, ErrorKind } from "./api/client";
import { success, failure } from "./utils/haptics";
import FadeIn from "./components/FadeIn";
import SplashScreen from "./screens/SplashScreen";
import NameEntryScreen from "./screens/NameEntryScreen";
import HomeScreen from "./screens/HomeScreen";
import ScanScreen from "./screens/ScanScreen";
import AnalyzingScreen from "./screens/AnalyzingScreen";
import ResultScreen from "./screens/ResultScreen";
import ErrorScreen from "./screens/ErrorScreen";
import GoodbyeScreen from "./screens/GoodbyeScreen";

// Keeps the brand splash up long enough to read as intentional, not a flicker.
const MIN_SPLASH_MS = 700;

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
 *   boot → name (first launch only) → home → scan → analyzing → result | error
 *   home → goodbye (iOS "Exit app")
 * Five linear screens don't need a navigation library; one route object is
 * easier to reason about, and Android's back button is handled below.
 */
function Root() {
  const { colors } = useTheme();
  const [fontsLoaded, fontError] = useFonts({
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
  });
  const [profile, setProfile] = useState(undefined); // undefined = loading, null = first launch
  const [splashElapsed, setSplashElapsed] = useState(false);
  const [route, setRoute] = useState({ name: "boot" });
  const requestRef = useRef(null);

  useEffect(() => {
    warmUp(); // wake the server while the user is still on the welcome screens
    loadProfile().then(setProfile);
    const timer = setTimeout(() => setSplashElapsed(true), MIN_SPLASH_MS);
    return () => {
      clearTimeout(timer);
      requestRef.current?.abort();
    };
  }, []);

  const booted = (fontsLoaded || Boolean(fontError)) && profile !== undefined && splashElapsed;

  useEffect(() => {
    if (booted && route.name === "boot") {
      setRoute(profile ? { name: "home" } : { name: "name", editing: false });
    }
  }, [booted, profile, route.name]);

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
    setRoute({ name: "analyzing", photo, slow: false });

    try {
      const result = await analyzePhoto(photo, {
        signal: controller.signal,
        onSlow: () =>
          setRoute((current) =>
            current.name === "analyzing" && current.photo === photo
              ? { ...current, slow: true }
              : current,
          ),
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

  // Android can close the app outright; iOS can't, so it gets a goodbye screen.
  const exitApp = useCallback(() => {
    if (Platform.OS === "android") BackHandler.exitApp();
    else setRoute({ name: "goodbye" });
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
        case "goodbye":
          goHome();
          return true;
        default:
          return false;
      }
    });
    return () => subscription.remove();
  }, [route, goHome, cancelAnalysis]);

  const firstName = profile?.firstName ?? "";
  let screen;

  switch (route.name) {
    case "boot":
      screen = <SplashScreen />;
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
          onExit={exitApp}
          onEditName={() => setRoute({ name: "name", editing: true })}
        />
      );
      break;
    case "scan":
      screen = <ScanScreen onCapture={analyze} onClose={goHome} />;
      break;
    case "analyzing":
      screen = (
        <AnalyzingScreen photo={route.photo} slow={route.slow} onCancel={cancelAnalysis} />
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
    case "goodbye":
      screen = <GoodbyeScreen firstName={firstName} onReturn={goHome} />;
      break;
    default:
      screen = null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FadeIn key={route.name}>{screen}</FadeIn>
    </View>
  );
}
