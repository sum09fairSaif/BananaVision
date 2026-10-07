import { View, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import ScanLine from "lucide-react-native/icons/scan-line";
import Info from "lucide-react-native/icons/info";
import { useTheme } from "../theme/ThemeProvider";
import { elevation } from "../theme/tokens";
import Screen from "../components/Screen";
import AppText from "../components/AppText";
import Button from "../components/Button";
import Avatar from "../components/Avatar";
import Reveal from "../components/Reveal";
import HeroIllustration from "../components/HeroIllustration";
import RipenessSpectrum from "../components/RipenessSpectrum";

function greetingFor(hour) {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 22) return "Good evening";
  return "Hello";
}

export default function HomeScreen({ firstName, onScan, onAbout, onEditName }) {
  const theme = useTheme();
  const { colors, space, radius } = theme;
  const now = new Date();
  const greeting = greetingFor(now.getHours());
  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: space.xl,
          paddingTop: space.sm,
          paddingBottom: space.xl,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <AppText variant="subhead" tone="ink2">
            {dateLabel}
          </AppText>
          <Avatar
            name={firstName}
            label={firstName ? `Profile. Change your name, currently ${firstName}` : "Add your name"}
            onPress={onEditName}
          />
        </View>

        <Reveal style={{ marginTop: space.lg }}>
          <AppText variant="hero" accessibilityRole="header">
            {greeting}
            {firstName ? (
              <>
                ,{"\n"}
                <AppText variant="hero" italic tone="accent">
                  {firstName}
                </AppText>
                .
              </>
            ) : (
              "."
            )}
          </AppText>
        </Reveal>

        <Reveal delay={90} style={{ marginTop: space.xl }}>
          <View style={[{ borderRadius: radius.sheet }, elevation(2, theme)]}>
            <LinearGradient
              colors={[colors.heroFrom, colors.heroTo]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: radius.sheet, padding: space.xl, overflow: "hidden" }}
            >
              <HeroIllustration />
              <AppText variant="title" style={{ marginTop: space.lg }}>
                With a banana as a snack in hand?
              </AppText>
              <AppText variant="callout" tone="ink2" style={{ marginTop: space.xs }}>
                Take a photo and we'll tell you its stage, how long it will keep, and
                who it suits best.
              </AppText>
              <Button
                label="Scan a banana"
                icon={ScanLine}
                iconPlacement="leading"
                onPress={onScan}
                accessibilityHint="Opens the camera"
                style={{ marginTop: space.xl }}
              />
            </LinearGradient>
          </View>
        </Reveal>

        <Reveal delay={180} style={{ marginTop: space.xxxl }}>
          <AppText variant="headline">The ripening curve</AppText>
          <AppText variant="callout" tone="ink2" style={{ marginTop: space.xxs }}>
            Every banana travels this scale. A scan shows where yours is.
          </AppText>
          <View style={{ marginTop: space.lg }}>
            <RipenessSpectrum showDays />
          </View>
        </Reveal>

        <View style={{ alignItems: "center", marginTop: space.xxxl }}>
          <Button
            label="About BananaVision"
            variant="plain"
            tone="neutral"
            size="medium"
            icon={Info}
            iconPlacement="leading"
            onPress={onAbout}
            accessibilityHint="What the app does, how it works, and your privacy"
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
