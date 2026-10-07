import { useEffect, useRef } from "react";
import { View, Animated, Easing, StyleSheet } from "react-native";
import Svg, {
  Defs,
  RadialGradient,
  LinearGradient,
  Stop,
  Path,
  Rect,
  G,
} from "react-native-svg";
import { useTheme } from "../theme/ThemeProvider";
import Illustration from "./Illustration";

// Launch art: the banana bunch from svgs/ bursting through a torn hole in the page,
// with rising light and a few twinkles. Drawn in code so it follows the theme.
// Decorative only — the launch screen carries the words.

const VIEW_W = 320;
const VIEW_H = 300;

// The hole: a jagged ellipse. Fixed jitter keeps the tear identical every launch.
const CX = 160;
const CY = 184;
const RX = 112;
const RY = 82;
const JITTER = [
  1, 0.9, 0.97, 0.85, 1.02, 0.92, 0.98, 0.87, 1, 0.9, 0.95, 0.84, 1.03, 0.91,
  0.97, 0.86, 1, 0.9, 0.96, 0.85, 1.02, 0.93, 0.98, 0.87, 1, 0.9, 0.95, 0.86,
];

function rim(i, scale = 1, twist = 0) {
  const n = JITTER.length;
  const angle = (i / n) * Math.PI * 2 + twist;
  const r = JITTER[((Math.round(i) % n) + n) % n] * scale; // fractional i: nearest jitter
  return [CX + Math.cos(angle) * RX * r, CY + Math.sin(angle) * RY * r];
}

const pt = ([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`;
const HOLE = `M${JITTER.map((_, i) => pt(rim(i))).join(" L")} Z`;

// Paper flaps peel outward from the rim; each has its own length and lean.
const FLAPS = [
  [2, 1.34, 0.05],
  [6, 1.24, -0.04],
  [9, 1.3, 0.06],
  [13, 1.36, -0.05],
  [16, 1.26, 0.04],
  [20, 1.32, -0.06],
  [24, 1.28, 0.05],
].map(([i, reach, twist]) => {
  const a = rim(i - 1);
  const b = rim(i + 1);
  const tip = rim(i, reach, twist);
  const bulge = rim(i + 0.6, (1 + reach) / 2 + 0.06, twist);
  const mid = rim(i);
  return {
    outline: `M${pt(a)} Q${pt(rim(i - 0.5, (1 + reach) / 2, twist))} ${pt(tip)} Q${pt(bulge)} ${pt(b)} Z`,
    crease: `M${pt(mid)} L${pt(tip)} Q${pt(bulge)} ${pt(b)} Z`,
  };
});

const RAYS = [
  { x: 104, w: 7, top: 14, o: 0.55 },
  { x: 126, w: 12, top: 0, o: 0.8 },
  { x: 152, w: 6, top: 30, o: 0.5 },
  { x: 170, w: 14, top: 4, o: 0.75 },
  { x: 198, w: 8, top: 20, o: 0.6 },
  { x: 222, w: 5, top: 40, o: 0.45 },
];

const SPARKLES = [
  { x: 0.2, y: 0.08, size: 18, tone: "ripe", delay: 0 },
  { x: 0.83, y: 0.2, size: 12, tone: "turquoise", delay: 500 },
  { x: 0.07, y: 0.5, size: 11, tone: "turquoise", delay: 900 },
  { x: 0.92, y: 0.62, size: 16, tone: "ripe", delay: 300 },
  { x: 0.33, y: 0.03, size: 9, tone: "ripe", delay: 1200 },
  { x: 0.16, y: 0.86, size: 10, tone: "ripe", delay: 700 },
];

const SPARKLE_PATH =
  "M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0 Z";

export default function BananaBurst({ width = 320, animated = true }) {
  const theme = useTheme();
  const { colors, dark } = theme;
  const height = (width * VIEW_H) / VIEW_W;

  const hole = useRef(new Animated.Value(animated ? 0 : 1)).current;
  const burst = useRef(new Animated.Value(animated ? 0 : 1)).current;
  const glow = useRef(new Animated.Value(animated ? 0 : 1)).current;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) {
      [hole, burst, glow].forEach((value) => value.setValue(1));
      float.setValue(0);
      return undefined;
    }
    const intro = Animated.sequence([
      Animated.spring(hole, { toValue: 1, damping: 13, stiffness: 180, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(burst, { toValue: 1, damping: 11, stiffness: 120, useNativeDriver: true }),
        Animated.timing(glow, {
          toValue: 1,
          duration: 520,
          delay: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]);
    const bob = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    intro.start(({ finished }) => finished && bob.start());
    return () => {
      intro.stop();
      bob.stop();
    };
  }, [animated, hole, burst, glow, float]);

  const holeEdge = dark ? "#030908" : "#A9D6CD";
  const holeCore = dark ? "#16403A" : "#E9F7F3";
  const flapFill = dark ? colors.sunken : colors.elevated;
  const flapEdge = colors.hairline;
  const flapFold = dark ? "rgba(0, 0, 0, 0.22)" : "rgba(16, 42, 40, 0.06)";
  const { ripe } = colors.stage;
  const bunchSize = width * 0.6;

  const bunchStyle = {
    opacity: burst.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
    transform: [
      { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [height * 0.16, 0] }) },
      { translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -height * 0.015] }) },
      { scale: burst.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
    ],
  };

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width, height }}
    >
      {/* The torn page */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: hole.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
            transform: [{ scale: hole.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
          },
        ]}
      >
        <Svg width={width} height={height} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
          <Defs>
            <RadialGradient id="hole" cx={CX} cy={CY - 10} r={RX} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={holeCore} />
              <Stop offset="0.7" stopColor={holeCore} stopOpacity={dark ? 0.7 : 0.85} />
              <Stop offset="1" stopColor={holeEdge} />
            </RadialGradient>
          </Defs>
          {FLAPS.map(({ outline, crease }, i) => (
            <G key={i}>
              {dark ? null : <Path d={outline} fill={colors.shadow} opacity={0.07} translateX={2} translateY={4} />}
              <Path d={outline} fill={flapFill} stroke={flapEdge} strokeWidth={1} strokeLinejoin="round" />
              <Path d={crease} fill={flapFold} />
            </G>
          ))}
          <Path d={HOLE} fill="url(#hole)" />
          <Path d={HOLE} fill="none" stroke={holeEdge} strokeWidth={3} strokeOpacity={0.55} strokeLinejoin="round" />
        </Svg>
      </Animated.View>

      {/* Rising light */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: glow }]}>
        <Svg width={width} height={height} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
          <Defs>
            <LinearGradient id="ray" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={ripe} stopOpacity={0} />
              <Stop offset="0.55" stopColor={ripe} stopOpacity={dark ? 0.35 : 0.55} />
              <Stop offset="1" stopColor={ripe} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {RAYS.map((ray) => (
            <Rect
              key={ray.x}
              x={ray.x}
              y={ray.top}
              width={ray.w}
              height={CY + 10 - ray.top}
              rx={ray.w / 2}
              fill="url(#ray)"
              opacity={ray.o}
            />
          ))}
        </Svg>
      </Animated.View>

      {/* The bunch */}
      <Animated.View
        style={[
          { position: "absolute", left: width * 0.21, top: height * 0.1, width: bunchSize, height: bunchSize },
          bunchStyle,
        ]}
      >
        <Illustration name="bunch" width={bunchSize} />
      </Animated.View>

      {SPARKLES.map((sparkle) => (
        <Sparkle key={`${sparkle.x}-${sparkle.y}`} {...sparkle} width={width} height={height} animated={animated} />
      ))}
    </View>
  );
}

function Sparkle({ x, y, size, tone, delay, width, height, animated }) {
  const { colors } = useTheme();
  const twinkle = useRef(new Animated.Value(animated ? 0 : 1)).current;

  useEffect(() => {
    if (!animated) {
      twinkle.setValue(1);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(twinkle, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(twinkle, { toValue: 0.25, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const timer = setTimeout(() => loop.start(), 400 + delay);
    return () => {
      clearTimeout(timer);
      loop.stop();
    };
  }, [animated, delay, twinkle]);

  const color = tone === "ripe" ? colors.stage.ripe : colors.turquoise;
  return (
    <Animated.View
      style={{
        position: "absolute",
        left: x * width - size / 2,
        top: y * height - size / 2,
        opacity: twinkle,
        transform: [{ scale: twinkle.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d={SPARKLE_PATH} fill={color} />
      </Svg>
    </Animated.View>
  );
}
