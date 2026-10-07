import { useEffect, useRef, useState } from "react";
import { View, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../theme/ThemeProvider";
import { useReducedMotion } from "../hooks/useReducedMotion";
import AppText from "./AppText";

export const STAGE_ORDER = ["unripe", "ripe", "overripe", "rotten"];
export const STAGE_NAMES = {
  unripe: "Unripe",
  ripe: "Ripe",
  overripe: "Overripe",
  rotten: "Rotten",
};
// From api/banana_config.json days_by_stage.
const STAGE_DAYS = {
  unripe: "~7 days",
  ripe: "~3 days",
  overripe: "~1 day",
  rotten: "Discard",
};

// Days-remaining → position along the bar, anchored at each stage's centre.
const ANCHORS = [
  [7, 0.125],
  [3, 0.375],
  [1, 0.625],
  [0, 0.875],
];

/**
 * Where a banana sits on the 0–1 ripening spectrum. Interpolated from the
 * model's days estimate so two "ripe" bananas can sit at different points,
 * then kept inside the predicted stage's quarter so the marker never
 * contradicts the label.
 */
export function spectrumPosition(stage, daysEstimate) {
  const days = Math.max(0, Math.min(7, Number.isFinite(daysEstimate) ? daysEstimate : 3));
  let position = ANCHORS[0][1];
  for (let i = 0; i < ANCHORS.length - 1; i++) {
    const [d0, p0] = ANCHORS[i];
    const [d1, p1] = ANCHORS[i + 1];
    if (days <= d0 && days >= d1) {
      position = p0 + ((d0 - days) / (d0 - d1)) * (p1 - p0);
      break;
    }
  }
  const index = STAGE_ORDER.indexOf(stage);
  if (index >= 0) {
    const low = index / 4 + 0.04;
    const high = (index + 1) / 4 - 0.04;
    position = Math.min(high, Math.max(low, position));
  }
  return position;
}

const KNOB = 24;

/**
 * Continuous ripening bar from green to brown.
 *   stage + daysEstimate: shows a marker that glides into place
 *   showDays:             adds typical shelf life under each label (Home uses this)
 */
export default function RipenessSpectrum({ stage, daysEstimate, showDays = false }) {
  const { colors, fonts, space } = useTheme();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const current = STAGE_ORDER.indexOf(stage);
  const target = current >= 0 ? spectrumPosition(stage, daysEstimate) : null;

  useEffect(() => {
    if (!width || target == null) return;
    if (reduced) {
      progress.setValue(target);
      return;
    }
    progress.setValue(0);
    Animated.sequence([
      Animated.delay(280),
      Animated.spring(progress, {
        toValue: target,
        useNativeDriver: true,
        speed: 5,
        bounciness: 5,
      }),
    ]).start();
  }, [width, target, reduced, progress]);

  return (
    <View
      accessible
      accessibilityLabel={
        current >= 0
          ? `Ripeness: ${STAGE_NAMES[stage]}, stage ${current + 1} of 4, from unripe to rotten`
          : "Ripeness scale from unripe, about 7 days, to rotten"
      }
      style={{ gap: space.sm }}
    >
      <View
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={{ height: KNOB, justifyContent: "center" }}
      >
        <LinearGradient
          colors={STAGE_ORDER.map((s) => colors.stage[s])}
          locations={[0.08, 0.4, 0.64, 0.94]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ height: 8, borderRadius: 4 }}
        />
        {target != null && width > 0 ? (
          <Animated.View
            style={{
              position: "absolute",
              left: 0,
              width: KNOB,
              height: KNOB,
              borderRadius: KNOB / 2,
              backgroundColor: colors.elevated,
              borderWidth: 6,
              borderColor: colors.stage[stage],
              shadowColor: "#000",
              shadowOpacity: 0.2,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 3,
              transform: [
                { translateX: Animated.add(Animated.multiply(progress, width), -KNOB / 2) },
              ],
            }}
          />
        ) : null}
      </View>

      <View style={{ flexDirection: "row" }}>
        {STAGE_ORDER.map((s, i) => {
          const active = i === current;
          return (
            <View key={s} style={{ flex: 1, alignItems: "center", gap: 2 }}>
              <AppText
                variant="footnote"
                tone={current < 0 ? "ink2" : active ? "ink" : "ink3"}
                numberOfLines={1}
                style={active ? { fontFamily: fonts.textSemibold } : null}
              >
                {STAGE_NAMES[s]}
              </AppText>
              {showDays ? (
                <AppText variant="caption" tone="ink3" numberOfLines={1}>
                  {STAGE_DAYS[s]}
                </AppText>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}
