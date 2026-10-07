import { View, ScrollView, StyleSheet } from "react-native";
import ArrowLeft from "lucide-react-native/icons/arrow-left";
import Camera from "lucide-react-native/icons/camera";
import Cpu from "lucide-react-native/icons/cpu";
import Sparkles from "lucide-react-native/icons/sparkles";
import ShieldCheck from "lucide-react-native/icons/shield-check";
import Wifi from "lucide-react-native/icons/wifi";
import HeartPulse from "lucide-react-native/icons/heart-pulse";
import Pencil from "lucide-react-native/icons/pencil";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import appConfig from "../app.json";
import { useTheme } from "../theme/ThemeProvider";
import Screen from "../components/Screen";
import AppText from "../components/AppText";
import IconButton from "../components/IconButton";
import PressableScale from "../components/PressableScale";
import Reveal from "../components/Reveal";
import Card from "../components/Card";
import BananaMark from "../components/BananaMark";

const STEPS = [
  {
    icon: Camera,
    title: "Take or choose a photo",
    body: "One banana, filling most of the frame, in soft light works best.",
  },
  {
    icon: Cpu,
    title: "We check it's a banana",
    body: "Your photo is made smaller and sent to our server, which first checks there really is a banana in it.",
  },
  {
    icon: Sparkles,
    title: "We work out how ripe it is",
    body: "A program that has looked at thousands of banana photos decides whether yours is unripe, ripe, overripe or rotten, and works out roughly how many days it has left.",
  },
];

const GOOD_TO_KNOW = [
  {
    icon: ShieldCheck,
    title: "Private by design",
    body: "Your first name stays on this phone. Your photo is looked at and then thrown away — we never keep it.",
  },
  {
    icon: Wifi,
    title: "Needs a connection",
    body: "The check happens online, so you need Wi‑Fi or mobile data. The first scan after a while can take up to a minute, because our server has to wake up.",
  },
  {
    icon: HeartPulse,
    title: "A helpful estimate",
    body: "Treat the result as a helpful guess, not medical or diet advice. If a banana smells off or has mould on it, throw it out.",
  },
];

/**
 * About: what the app does, how a scan works, privacy, and credits.
 * Reached from the home screen; "Your name" links to the name editor.
 */
export default function AboutScreen({ firstName, onBack, onEditName }) {
  const { colors, space } = useTheme();
  const version = appConfig.expo.version;

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
        <Reveal style={{ alignItems: "center" }}>
          <BananaMark size={104} />
          <AppText variant="display" accessibilityRole="header" style={{ marginTop: space.lg, textAlign: "center" }}>
            Banana
            <AppText variant="display" italic tone="accent">
              Vision
            </AppText>
          </AppText>
          <AppText variant="footnote" tone="ink3" style={{ marginTop: space.xxs }}>
            Version {version}
          </AppText>
          <AppText variant="body" tone="ink2" style={{ marginTop: space.lg, textAlign: "center", maxWidth: 340 }}>
            Point your camera at a banana to see how ripe it is, how long it will keep, and who it's
            best for.
          </AppText>
        </Reveal>

        <Reveal delay={80} style={{ marginTop: space.xxxl }}>
          <SectionTitle>How a scan works</SectionTitle>
          <Card>
            {STEPS.map((step, i) => (
              <Row key={step.title} {...step} first={i === 0} />
            ))}
          </Card>
        </Reveal>

        <Reveal delay={140} style={{ marginTop: space.xxl }}>
          <SectionTitle>Good to know</SectionTitle>
          <Card>
            {GOOD_TO_KNOW.map((item, i) => (
              <Row key={item.title} {...item} first={i === 0} />
            ))}
          </Card>
        </Reveal>

        <Reveal delay={200} style={{ marginTop: space.xxl }}>
          <SectionTitle>You</SectionTitle>
          <Card>
            <PressableScale
              onPress={onEditName}
              pressedScale={0.99}
              accessibilityRole="button"
              accessibilityLabel={firstName ? `Your name, ${firstName}` : "Add your name"}
              accessibilityHint="Change how BananaVision greets you"
              contentStyle={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: space.md,
                minHeight: 56,
                paddingHorizontal: space.lg,
                paddingVertical: space.md,
                backgroundColor: pressed ? colors.sunkenPressed : "transparent",
              })}
            >
              <IconTile icon={Pencil} />
              <AppText variant="headline" style={{ flex: 1 }}>
                Your name
              </AppText>
              <AppText variant="callout" tone="ink2" numberOfLines={1} style={{ flexShrink: 1 }}>
                {firstName || "Add"}
              </AppText>
              <ChevronRight size={18} color={colors.ink3} strokeWidth={2.2} />
            </PressableScale>
          </Card>
        </Reveal>

        <Reveal delay={240} style={{ marginTop: space.xxl }}>
          <AppText variant="footnote" tone="ink3" style={{ textAlign: "center" }}>
            Banana bunch artwork: Fxemoji by Mozilla, CC BY 4.0.
          </AppText>
        </Reveal>
      </ScrollView>
    </Screen>
  );
}

function SectionTitle({ children }) {
  const { space } = useTheme();
  return (
    <AppText variant="eyebrow" tone="ink3" accessibilityRole="header" style={{ marginBottom: space.sm, marginLeft: space.xxs }}>
      {children}
    </AppText>
  );
}

function IconTile({ icon: Icon }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: 11,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.accentSoft,
      }}
    >
      <Icon size={18} color={colors.onAccentSoft} strokeWidth={2.2} />
    </View>
  );
}

function Row({ icon, title, body, first }) {
  const { colors, space } = useTheme();
  return (
    <View
      accessible
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: space.md,
        paddingHorizontal: space.lg,
        paddingVertical: space.lg,
        borderTopWidth: first ? 0 : StyleSheet.hairlineWidth,
        borderTopColor: colors.separator,
      }}
    >
      <IconTile icon={icon} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="headline">{title}</AppText>
        <AppText variant="callout" tone="ink2">
          {body}
        </AppText>
      </View>
    </View>
  );
}
