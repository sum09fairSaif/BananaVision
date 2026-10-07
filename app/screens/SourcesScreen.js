import { View, ScrollView, Linking, StyleSheet } from "react-native";
import ArrowLeft from "lucide-react-native/icons/arrow-left";
import ExternalLink from "lucide-react-native/icons/external-link";
import { useTheme } from "../theme/ThemeProvider";
import Screen from "../components/Screen";
import AppText from "../components/AppText";
import IconButton from "../components/IconButton";
import PressableScale from "../components/PressableScale";
import Reveal from "../components/Reveal";

/**
 * Every reference behind the figures and prose, numbered to match the [n]
 * markers shown on the result screen. Tapping one opens it in the browser.
 */
export default function SourcesScreen({ sources = [], onBack }) {
  const { colors, space } = useTheme();

  return (
    <Screen>
      <View style={{ minHeight: 56, paddingHorizontal: space.md, justifyContent: "center" }}>
        <IconButton icon={ArrowLeft} label="Back" variant="plain" onPress={onBack} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: space.xl,
          paddingTop: space.xs,
          paddingBottom: space.huge,
        }}
      >
        <Reveal>
          <AppText variant="display" accessibilityRole="header">
            Sources
          </AppText>
          <AppText variant="body" tone="ink2" style={{ marginTop: space.sm }}>
            Every number and claim in the app comes from one of these. The small numbers
            in brackets beside the text match this list. Tap any one to read it yourself.
          </AppText>
        </Reveal>

        <Reveal delay={80} style={{ marginTop: space.xl }}>
          {sources.map((source, i) => (
            <PressableScale
              key={source.id}
              onPress={source.url ? () => Linking.openURL(source.url).catch(() => {}) : undefined}
              disabled={!source.url}
              pressedScale={0.99}
              accessibilityRole={source.url ? "link" : "text"}
              accessibilityLabel={`Source ${source.id}. ${source.text}`}
              accessibilityHint={source.url ? "Opens in your browser" : undefined}
              contentStyle={({ pressed }) => ({
                flexDirection: "row",
                gap: space.md,
                paddingVertical: space.md,
                paddingHorizontal: space.xs,
                borderRadius: 12,
                borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                borderTopColor: colors.separator,
                backgroundColor: pressed ? colors.sunken : "transparent",
              })}
            >
              <AppText
                variant="subhead"
                tone="accent"
                style={{ width: 26, fontVariant: ["tabular-nums"] }}
              >
                [{source.id}]
              </AppText>
              <View style={{ flex: 1, gap: 4 }}>
                <AppText variant="callout">{source.text}</AppText>
                {source.url ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <ExternalLink size={12} color={colors.ink3} strokeWidth={2.2} />
                    <AppText variant="caption" tone="ink3" numberOfLines={1} style={{ flex: 1 }}>
                      {source.url.replace(/^https?:\/\//, "")}
                    </AppText>
                  </View>
                ) : null}
              </View>
            </PressableScale>
          ))}
        </Reveal>

        <Reveal delay={140} style={{ marginTop: space.xl }}>
          <AppText variant="footnote" tone="ink3">
            General information to help you choose a banana — not medical or diet advice.
            The numbers are good averages: they change with the type of banana, where it
            grew and how it was stored.
          </AppText>
        </Reveal>
      </ScrollView>
    </Screen>
  );
}
