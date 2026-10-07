import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

// Cached so screens mounted after the first read start with the right value.
let lastKnown = false;

// Reads the setting ahead of the first screen, so the launch animation (and
// anything mounted right after) starts with the right value. Never rejects.
export function primeReducedMotion() {
  return AccessibilityInfo.isReduceMotionEnabled()
    .then((value) => {
      lastKnown = value;
    })
    .catch(() => {});
}

// True when the user asked the OS to reduce motion; animations should then be
// replaced by instant state changes.
export function useReducedMotion() {
  const [reduced, setReduced] = useState(lastKnown);

  useEffect(() => {
    let mounted = true;
    const update = (value) => {
      lastKnown = value;
      if (mounted) setReduced(value);
    };
    AccessibilityInfo.isReduceMotionEnabled().then(update).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", update);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}
