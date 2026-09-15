import { useMemo, useRef, useState } from "react";
import { View, Pressable, Text, Animated, LayoutAnimation } from "react-native";
import { Feather } from "@react-native-vector-icons/feather";
import { useTheme } from "../theme/ThemeProvider";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { toParagraphs, splitCitations, stripCitations } from "../utils/text";
import { select } from "../utils/haptics";
import AppText from "./AppText";

// One collapsible card of guide prose from banana_stages.md. Renders nothing
// when the field is empty, so sections can be added or removed server-side.
export default function GuideSection({ title, icon, body, defaultOpen = false }) {
  const { colors, space, radius, motion } = useTheme();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(defaultOpen);
  const rotation = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;
  const paragraphs = useMemo(() => toParagraphs(body), [body]);

  if (paragraphs.length === 0) return null;

  function toggle() {
    const next = !open;
    select();
    if (!reduced) {
      LayoutAnimation.configureNext(
        LayoutAnimation.create(motion.base, "easeInEaseOut", "opacity"),
      );
    }
    Animated.timing(rotation, {
      toValue: next ? 1 : 0,
      duration: reduced ? 0 : motion.base,
      easing: motion.easeOut,
      useNativeDriver: true,
    }).start();
    setOpen(next);
  }

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: "hidden",
      }}
    >
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: space.sm,
          minHeight: 64,
          paddingHorizontal: space.md,
          paddingVertical: space.sm,
          backgroundColor: pressed ? colors.surfaceSunken : "transparent",
        })}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.primarySoft,
          }}
        >
          <Feather name={icon} size={18} color={colors.onPrimarySoft} />
        </View>
        <AppText variant="headline" style={{ flex: 1 }}>
          {title}
        </AppText>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Feather name="chevron-down" size={22} color={colors.textSecondary} />
        </Animated.View>
      </Pressable>

      {open ? (
        <View
          style={{
            paddingHorizontal: space.md,
            paddingBottom: space.lg,
            paddingTop: space.xxs,
            gap: space.sm,
          }}
        >
          {paragraphs.map((paragraph, i) => (
            <AppText key={i} variant="body" accessibilityLabel={stripCitations(paragraph)}>
              {splitCitations(paragraph).map((part, j) =>
                part.citation ? (
                  <Text
                    key={j}
                    style={{
                      fontFamily: "Nunito_600SemiBold",
                      fontSize: 12,
                      color: colors.textTertiary,
                    }}
                  >
                    {part.text}
                  </Text>
                ) : (
                  part.text
                ),
              )}
            </AppText>
          ))}
        </View>
      ) : null}
    </View>
  );
}
