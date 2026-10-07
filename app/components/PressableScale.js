import { useRef } from "react";
import { Animated, Pressable } from "react-native";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { tap } from "../utils/haptics";

/**
 * A Pressable that gives under the finger and springs back, like native
 * controls do.
 *   style:        sizes and positions the touch area (flex, margins, alignSelf)
 *   contentStyle: paints the visible surface; object or ({ pressed }) => style
 */
export default function PressableScale({
  children,
  style,
  contentStyle,
  pressedScale = 0.97,
  haptic = true,
  onPress,
  onPressIn,
  onPressOut,
  ...rest
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const reduced = useReducedMotion();

  function springTo(value) {
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 50,
      bounciness: value === 1 ? 7 : 0,
    }).start();
  }

  return (
    <Pressable
      {...rest}
      style={style}
      onPressIn={(event) => {
        if (!reduced) springTo(pressedScale);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        springTo(1);
        onPressOut?.(event);
      }}
      onPress={(event) => {
        if (haptic) tap();
        onPress?.(event);
      }}
    >
      {(state) => (
        <Animated.View
          style={[
            { transform: [{ scale }] },
            typeof contentStyle === "function" ? contentStyle(state) : contentStyle,
          ]}
        >
          {typeof children === "function" ? children(state) : children}
        </Animated.View>
      )}
    </Pressable>
  );
}
