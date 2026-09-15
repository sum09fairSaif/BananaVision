import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

// Named for what happened, not how to vibrate. Android uses the system haptic
// constants (no VIBRATE permission, matches the OS feel); iOS uses Taptic
// patterns. Haptics are best-effort: unsupported hardware silently no-ops.
const isAndroid = Platform.OS === "android";

function play(android, ios) {
  try {
    const result = isAndroid ? Haptics.performAndroidHapticsAsync(android) : ios();
    result?.catch?.(() => {});
  } catch {
    // Haptics unavailable on this device.
  }
}

export function tap() {
  play(Haptics.AndroidHaptics.Virtual_Key, () =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  );
}

export function select() {
  play(Haptics.AndroidHaptics.Segment_Tick, () => Haptics.selectionAsync());
}

export function capture() {
  play(Haptics.AndroidHaptics.Context_Click, () =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  );
}

export function success() {
  play(Haptics.AndroidHaptics.Confirm, () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  );
}

export function failure() {
  play(Haptics.AndroidHaptics.Reject, () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  );
}
