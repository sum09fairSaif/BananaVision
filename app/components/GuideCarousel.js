import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  Easing,
  AccessibilityInfo,
  useWindowDimensions,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";
import Sparkles from "lucide-react-native/icons/sparkles";
import Leaf from "lucide-react-native/icons/leaf";
import HeartHandshake from "lucide-react-native/icons/heart-handshake";
import Ban from "lucide-react-native/icons/ban";
import ShieldAlert from "lucide-react-native/icons/shield-alert";
import Puzzle from "lucide-react-native/icons/puzzle";
import BookOpen from "lucide-react-native/icons/book-open";
import { useTheme } from "../theme/ThemeProvider";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { toParagraphs, splitCitations, stripCitations } from "../utils/text";
import { select } from "../utils/haptics";
import AppText from "./AppText";

// Each section's icon and the colour its bubble is tinted with.
const LOOK = {
  benefits: { icon: Sparkles, tint: "#3FAE6A" },
  nutrients: { icon: Leaf, tint: "#2FBFB1" },
  encouraged_for: { icon: HeartHandshake, tint: "#1F9E8F" },
  avoid_or_limit: { icon: Ban, tint: "#D59A2A" },
  risks: { icon: ShieldAlert, tint: "#D0583F" },
  missing: { icon: Puzzle, tint: "#3A7FC4" },
};
const FALLBACK_LOOK = { icon: BookOpen, tint: "#2FBFB1" };

// Neighbours shrink to this size, so they sit this close before scaling.
const SIDE_SCALE = 0.8;
const VISIBLE_GAP = 14;

// The text column as a fraction of the bubble's width, and how much of the
// bubble's height that column may fill before its corners leave the curve.
// For a column 0.70 wide: (0.70)^2 + f^2 = 1, so f = 0.71 of the height.
const TEXT_WIDTH = 0.7;
const TEXT_FILL = 0.7;
// Past this the bubble stops looking like a bubble, so the text carries on in
// the next one instead. Nothing is hidden either way — a bubble always grows
// to hold whatever it is given; this only decides where to break.
const TALLEST = 1.55;

/**
 * Split a section so each bubble holds as much as it can without stretching
 * past TALLEST. Breaks between sentences, never mid-sentence, and keeps
 * paragraphs together where they fit.
 */
function paginate(paragraphs, charsPerLine, linesPerBubble) {
  const linesFor = (page) =>
    page.reduce((total, p) => total + Math.max(1, Math.ceil(p.length / charsPerLine)), 0);
  const pages = [];
  let page = [];

  for (const paragraph of paragraphs) {
    let started = false; // has this paragraph begun on the current bubble?
    // One sentence at a time, so a break always lands at a full stop.
    for (const sentence of paragraph.match(/[^.!?]+[.!?]*\s*/g) ?? [paragraph]) {
      const piece = sentence.trim();
      if (!piece) continue;
      const grown = started
        ? [...page.slice(0, -1), `${page[page.length - 1]} ${piece}`]
        : [...page, piece];
      if (page.length && linesFor(grown) > linesPerBubble) {
        pages.push(page);
        page = [piece];
      } else {
        page = grown;
      }
      started = true;
    }
  }
  if (page.length) pages.push(page);
  return pages;
}

/**
 * The stage guide as a row of floating soap bubbles, one section per bubble.
 * Swipe right-to-left for the next bubble, left-to-right to go back. The
 * centred bubble is full size; its neighbours shrink and peek in from the
 * edges. Long text scrolls inside the bubble. Tappable dots give a non-gesture
 * way through for switch and screen-reader users.
 *   sections: [{ key, title, body }]
 */
export default function GuideCarousel({ sections }) {
  const { space } = useTheme();
  const window = useWindowDimensions();
  // Measure the real row width (split view, iPad, web) rather than assume full screen.
  const [measured, setMeasured] = useState(0);
  const width = measured || window.width;
  const reduced = useReducedMotion();
  const listRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);

  // Big enough to read inside, small enough that neighbours peek in.
  const diameter = Math.min(width - 48, 380);

  const bubbles = useMemo(() => {
    // Roughly how much text one bubble holds. DM Sans averages about half its
    // point size per character, and the text column is TEXT_WIDTH of the bubble.
    const charsPerLine = Math.max(16, Math.floor((diameter * TEXT_WIDTH) / 6.9));
    // The height left for text once the icon and title have taken theirs.
    const linesPerBubble = Math.max(4, Math.floor((diameter * TALLEST * TEXT_FILL - 90) / 22));

    return sections.flatMap((section) => {
      const pages = paginate(toParagraphs(section.body), charsPerLine, linesPerBubble);
      return pages.map((paragraphs, i) => ({
        ...section,
        id: pages.length > 1 ? `${section.key}-${i}` : section.key,
        paragraphs,
        continued: i > 0,
      }));
    });
  }, [sections, diameter]);

  // Every bubble is as tall as its own text, so the row is as tall as the
  // tallest one. Each reports its height once it has measured itself.
  const [heights, setHeights] = useState({});
  const reportHeight = useCallback((key, value) => {
    setHeights((current) => (current[key] === value ? current : { ...current, [key]: value }));
  }, []);
  const rowHeight = Math.max(diameter, ...Object.values(heights));
  // Negative spacing pulls the shrunken neighbours in to a small visible gap.
  const gap = VISIBLE_GAP - (diameter * (1 - SIDE_SCALE)) / 2;
  const interval = diameter + gap;
  const sidePadding = (width - diameter) / 2;

  const settleOn = useCallback(
    (next) => {
      if (next === indexRef.current) return;
      indexRef.current = next;
      setIndex(next);
      select();
      AccessibilityInfo.announceForAccessibility(
        `${bubbles[next].title}${bubbles[next].continued ? ", continued" : ""}, ${next + 1} of ${
          bubbles.length
        }`,
      );
    },
    [bubbles],
  );

  const goTo = useCallback(
    (next) => {
      const clamped = Math.max(0, Math.min(bubbles.length - 1, next));
      listRef.current?.scrollToOffset({ offset: clamped * interval, animated: !reduced });
      settleOn(clamped);
    },
    [bubbles.length, interval, reduced, settleOn],
  );

  const onScroll = useMemo(
    () => Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true }),
    [scrollX],
  );

  if (bubbles.length === 0) return null;

  return (
    <View onLayout={(event) => setMeasured(event.nativeEvent.layout.width)}>
      <RisingBubbles width={width} height={rowHeight + space.lg * 2} />
      <Animated.FlatList
        ref={listRef}
        data={bubbles}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={interval}
        decelerationRate="fast"
        disableIntervalMomentum
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(event) =>
          settleOn(Math.round(event.nativeEvent.contentOffset.x / interval))
        }
        contentContainerStyle={{
          paddingHorizontal: sidePadding,
          paddingVertical: space.lg,
          // Bubbles differ in height, so they hang from a shared centre line.
          alignItems: "center",
        }}
        getItemLayout={(_, i) => ({ length: interval, offset: interval * i, index: i })}
        renderItem={({ item, index: i }) => (
          <View style={{ marginRight: i < bubbles.length - 1 ? gap : 0 }}>
            <Bubble
              section={item}
              position={i}
              total={bubbles.length}
              diameter={diameter}
              interval={interval}
              scrollX={scrollX}
              onMeasure={reportHeight}
            />
          </View>
        )}
      />

      <View style={{ alignItems: "center", minHeight: 44, justifyContent: "center" }}>
        <Dots count={bubbles.length} active={index} onSelect={goTo} titles={bubbles.map((b) => b.title)} />
      </View>
    </View>
  );
}

function Bubble({ section, position, total, diameter, interval, scrollX, onMeasure }) {
  const { colors, fonts, space, dark } = useTheme();
  const reduced = useReducedMotion();
  const look = LOOK[section.key] ?? FALLBACK_LOOK;
  const Icon = look.icon;
  const bob = useRef(new Animated.Value(0)).current;
  // The bubble is drawn around its text, so nothing is ever hidden: measure the
  // words first, then stretch the film to hold them.
  const [contentHeight, setContentHeight] = useState(0);

  // Each bubble drifts on its own rhythm, like it's floating.
  useEffect(() => {
    if (reduced) return undefined;
    const duration = 2200 + (position % 3) * 350;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob, position, reduced]);

  const inputRange = [(position - 1) * interval, position * interval, (position + 1) * interval];
  const scale = scrollX.interpolate({ inputRange, outputRange: [SIDE_SCALE, 1, SIDE_SCALE], extrapolate: "clamp" });
  const opacity = scrollX.interpolate({ inputRange, outputRange: [0.55, 1, 0.55], extrapolate: "clamp" });
  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });

  // Text sits in a column whose corners have to stay inside the curve. For a
  // column this wide, that leaves TEXT_FILL of the bubble's height to fill —
  // so the height the words need decides how tall the bubble is drawn.
  const textWidth = diameter * TEXT_WIDTH;
  const height = Math.max(diameter, Math.ceil(contentHeight / TEXT_FILL));

  // The row has to be as tall as the tallest bubble in it.
  useEffect(() => {
    onMeasure?.(section.id, height);
  }, [onMeasure, section.id, height]);
  const inside = dark ? colors.elevated : "#FFFFFF";
  const id = `bubble-${section.id}`;

  // Light catching the film, as arcs of the rim itself so they follow the
  // curve however far the bubble has stretched.
  const rx = diameter / 2 - 2;
  const ry = height / 2 - 2;
  const rim = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
  const sparkle = { x: diameter / 2 + rx * 0.76 * -1, y: height / 2 - ry * 0.62 };

  return (
    <Animated.View
      style={{
        width: diameter,
        height,
        opacity: contentHeight ? opacity : 0,
        transform: [{ translateY }, { scale }],
      }}
    >
      {/* Soap-film body: clear centre, colour gathering toward the rim. */}
      <Svg width={diameter} height={height} style={{ position: "absolute" }}>
        <Defs>
          {/* Even inside colour over the whole text area; the film colour gathers at the rim. */}
          <RadialGradient id={`${id}-body`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={inside} />
            <Stop offset="0.86" stopColor={inside} />
            <Stop offset="0.94" stopColor={look.tint} stopOpacity={dark ? 0.3 : 0.2} />
            <Stop offset="1" stopColor={look.tint} stopOpacity={dark ? 0.6 : 0.45} />
          </RadialGradient>
          <SvgLinearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#7FE6D8" />
            <Stop offset="0.35" stopColor={look.tint} />
            <Stop offset="0.65" stopColor="#6FA8E8" />
            <Stop offset="1" stopColor="#9BE3A8" />
          </SvgLinearGradient>
        </Defs>
        <Ellipse cx={diameter / 2} cy={height / 2} rx={rx} ry={ry} fill={`url(#${id}-body)`} />
        <Ellipse
          cx={diameter / 2}
          cy={height / 2}
          rx={rx}
          ry={ry}
          fill="none"
          stroke={`url(#${id}-rim)`}
          strokeWidth={4.5}
          strokeOpacity={0.85}
        />
      </Svg>

      <View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: (diameter - textWidth) / 2,
          width: textWidth,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          onLayout={(event) => setContentHeight(event.nativeEvent.layout.height)}
          accessible
          accessibilityLabel={`${section.title}${section.continued ? ", continued" : ""}, ${
            position + 1
          } of ${total}. ${stripCitations(section.paragraphs.join(" "))}`}
          style={{ alignItems: "center", alignSelf: "stretch", gap: space.xs }}
        >
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: look.tint + (dark ? "33" : "22"),
            }}
          >
            <Icon size={18} color={dark ? colors.ink : look.tint} strokeWidth={2.2} />
          </View>
          <View style={{ alignItems: "center" }}>
            <AppText
              variant="headline"
              accessibilityRole="header"
              style={{ fontFamily: fonts.display, fontSize: 20, lineHeight: 25, textAlign: "center" }}
            >
              {section.title}
            </AppText>
            {section.continued ? (
              <AppText variant="caption" tone="ink3" style={{ textAlign: "center" }}>
                continued
              </AppText>
            ) : null}
          </View>

          {section.paragraphs.map((paragraph, i) => (
            <AppText key={i} variant="callout" tone="ink2" style={{ textAlign: "center" }}>
              {splitCitations(paragraph).map((part, j) =>
                part.citation ? (
                  <Text key={j} style={{ fontFamily: fonts.textMedium, fontSize: 11, color: colors.ink3 }}>
                    {part.text}
                  </Text>
                ) : (
                  part.text
                ),
              )}
            </AppText>
          ))}
        </View>
      </View>

      <Svg pointerEvents="none" width={diameter} height={height} style={{ position: "absolute" }}>
        {/* Dashes cut an arc out of the rim: upper left for the long catch-light,
            lower right for the faint one. */}
        <Ellipse
          cx={diameter / 2}
          cy={height / 2}
          rx={rx}
          ry={ry}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={[rim * 0.13, rim]}
          strokeDashoffset={-rim * 0.56}
          opacity={dark ? 0.5 : 0.95}
        />
        <Ellipse
          cx={diameter / 2}
          cy={height / 2}
          rx={rx}
          ry={ry}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={[rim * 0.08, rim]}
          strokeDashoffset={-rim * 0.08}
          opacity={dark ? 0.25 : 0.7}
        />
        <Ellipse cx={sparkle.x} cy={sparkle.y} rx={7} ry={5} fill="#FFFFFF" opacity={dark ? 0.5 : 0.95} />
      </Svg>

      {/* Little bubbles gathered in the open corners around the big one. */}
      {CLUSTER.map(([x, y, s, colour, phase], i) => {
        // Alternate bubbles mirror the layout so neighbours don't look stamped.
        const cx = position % 2 ? 1 - x : x;
        const size = diameter * s;
        return (
          <MiniBubble
            key={i}
            size={size}
            left={cx * diameter - size / 2}
            top={y * height - size / 2}
            tint={colour === "section" ? look.tint : colour}
            drift={bob}
            phase={phase}
          />
        );
      })}
    </Animated.View>
  );
}

// [x, y, size] as fractions of the big bubble's diameter (corners of its square
// sit outside the circle, so that is where clusters go), then colour and drift phase.
const CLUSTER = [
  // top-right cluster
  [0.9, 0.07, 0.12, "section", 1],
  [0.99, 0.17, 0.05, "#6FA8E8", -1],
  [0.8, -0.01, 0.045, "#2FBFB1", 0.6],
  [1.01, 0.03, 0.028, "section", -0.5],
  // bottom-left cluster
  [0.08, 0.9, 0.095, "#2FBFB1", -1],
  [-0.01, 0.8, 0.042, "section", 0.8],
  [0.17, 0.99, 0.035, "#9BE3A8", 1],
  [0.0, 0.97, 0.024, "#6FA8E8", -0.6],
  // strays
  [0.05, 0.13, 0.03, "#9BE3A8", 0.7],
  [0.95, 0.92, 0.065, "#6FA8E8", -0.8],
  [0.86, 1.0, 0.028, "section", 1],
  [-0.02, 0.5, 0.022, "#2FBFB1", -1],
];

// A small soap bubble: faint fill, coloured film edge, and a catch-light.
function MiniBubble({ size, tint, drift, phase = 1, ...position }) {
  const translateY = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -5 * phase] });
  const translateX = drift.interpolate({ inputRange: [0, 1], outputRange: [0, 2 * phase] });
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: size,
        height: size,
        ...position,
        transform: [{ translateX }, { translateY }],
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 20 20">
        <Circle cx="10" cy="10" r="9" fill={tint} fillOpacity={0.1} />
        <Circle cx="10" cy="10" r="9" fill="none" stroke={tint} strokeOpacity={0.65} strokeWidth="0.9" />
        <Path d="M 4.2 8 A 6.5 6.5 0 0 1 8 4.2" stroke="#FFFFFF" strokeWidth="1.3" strokeLinecap="round" fill="none" opacity={0.9} />
        <Circle cx="13.5" cy="14" r="0.9" fill="#FFFFFF" opacity={0.6} />
      </Svg>
    </Animated.View>
  );
}

// Tiny bubbles rising slowly behind the row, drifting side to side as they go.
const RISING = [
  { x: 0.04, size: 10, duration: 9000, delay: 0, tint: "#2FBFB1" },
  { x: 0.13, size: 6, duration: 7200, delay: 2600, tint: "#9BE3A8" },
  { x: 0.27, size: 14, duration: 10500, delay: 5200, tint: "#6FA8E8" },
  { x: 0.42, size: 7, duration: 8000, delay: 1200, tint: "#3FAE6A" },
  { x: 0.58, size: 9, duration: 9600, delay: 6400, tint: "#2FBFB1" },
  { x: 0.71, size: 5, duration: 6800, delay: 3600, tint: "#6FA8E8" },
  { x: 0.84, size: 12, duration: 11000, delay: 800, tint: "#9BE3A8" },
  { x: 0.95, size: 7, duration: 7600, delay: 4400, tint: "#2FBFB1" },
];

function RisingBubbles({ width, height }) {
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width, height }}>
      {RISING.map((b, i) => (
        <RisingBubble key={i} {...b} width={width} height={height} />
      ))}
    </View>
  );
}

function RisingBubble({ x, size, duration, delay, tint, width, height }) {
  const reduced = useReducedMotion();
  // Where each bubble rests when motion is off, so they don't line up.
  const restAt = 0.15 + ((x * 7.3) % 1) * 0.7;
  const rise = useRef(new Animated.Value(reduced ? restAt : 0)).current;

  useEffect(() => {
    if (reduced) {
      rise.setValue(restAt);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.timing(rise, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }),
    );
    const timer = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(timer);
      loop.stop();
    };
  }, [rise, duration, delay, reduced, restAt]);

  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [height, -size] });
  const translateX = rise.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, 6, 0, -6, 0],
  });
  const opacity = reduced
    ? 0.8
    : rise.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 0.9, 0.9, 0] });

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: x * width - size / 2,
        top: 0,
        width: size,
        height: size,
        opacity,
        transform: [{ translateY }, { translateX }],
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 20 20">
        <Circle cx="10" cy="10" r="9" fill={tint} fillOpacity={0.12} stroke={tint} strokeOpacity={0.7} strokeWidth="1.1" />
        <Circle cx="7" cy="7" r="2.2" fill="#FFFFFF" opacity={0.9} />
      </Svg>
    </Animated.View>
  );
}

// Page dots: the active one stretches into a pill. Each dot is also a shortcut.
function Dots({ count, active, onSelect, titles }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
      {Array.from({ length: count }, (_, i) => (
        <Pressable
          key={i}
          onPress={() => onSelect(i)}
          hitSlop={{ top: 14, bottom: 14 }}
          accessibilityRole="button"
          accessibilityLabel={`Go to ${titles[i]}`}
          accessibilityState={{ selected: i === active }}
          style={{ padding: 4 }}
        >
          <Dot active={i === active} color={colors.accent} idle={colors.separator} />
        </Pressable>
      ))}
    </View>
  );
}

function Dot({ active, color, idle }) {
  const { motion } = useTheme();
  const reduced = useReducedMotion();
  const grow = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(grow, {
      toValue: active ? 1 : 0,
      duration: reduced ? 0 : motion.fast,
      easing: motion.easeOut,
      useNativeDriver: false, // animates width
    }).start();
  }, [active, grow, reduced, motion]);

  return (
    <Animated.View
      style={{
        height: 8,
        borderRadius: 4,
        width: grow.interpolate({ inputRange: [0, 1], outputRange: [8, 22] }),
        backgroundColor: active ? color : idle,
      }}
    />
  );
}
