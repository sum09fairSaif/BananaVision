import { View } from "react-native";
import { Feather } from "@react-native-vector-icons/feather";
import { useTheme } from "../theme/ThemeProvider";
import AppText from "./AppText";

const TONES = {
  info: { background: "primarySoft", accent: "onPrimarySoft", icon: "info" },
  success: { background: "successSoft", accent: "success", icon: "check-circle" },
  warning: { background: "warningSoft", accent: "warning", icon: "alert-triangle" },
  danger: { background: "dangerSoft", accent: "danger", icon: "alert-circle" },
};

/**
 * Inline status message. Set `live` when it appears in response to something
 * changing, so screen readers announce it without moving focus.
 */
export default function Notice({ tone = "info", icon, title, message, action, live = false, style }) {
  const { colors, space, radius } = useTheme();
  const t = TONES[tone];

  return (
    <View
      accessibilityLiveRegion={live ? "polite" : "none"}
      style={[
        {
          flexDirection: "row",
          gap: space.sm,
          padding: space.md,
          borderRadius: radius.md,
          backgroundColor: colors[t.background],
        },
        style,
      ]}
    >
      <Feather
        name={icon ?? t.icon}
        size={20}
        color={colors[t.accent]}
        style={{ marginTop: 2 }}
      />
      <View style={{ flex: 1, gap: space.xxs }}>
        {title ? (
          <AppText variant="headline" tone={t.accent}>
            {title}
          </AppText>
        ) : null}
        {message ? <AppText variant="callout">{message}</AppText> : null}
        {action ? <View style={{ marginTop: space.xs }}>{action}</View> : null}
      </View>
    </View>
  );
}
