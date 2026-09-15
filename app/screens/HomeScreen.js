import { View, ScrollView, useWindowDimensions } from "react-native";
import { Feather } from "@react-native-vector-icons/feather";
import { useTheme } from "../theme/ThemeProvider";
import Screen from "../components/Screen";
import AppText from "../components/AppText";
import Button from "../components/Button";
import IconButton from "../components/IconButton";
import BananaMark from "../components/BananaMark";

const STEPS = [
  { icon: "camera", text: "Snap a clear photo of your banana" },
  { icon: "aperture", text: "We identify its ripeness stage" },
  { icon: "book-open", text: "Read nutrition, benefits, and who it suits" },
];

function greetingFor(hour) {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 22) return "Good evening";
  return "Hello";
}

export default function HomeScreen({ firstName, onScan, onExit, onEditName }) {
  const { colors, space, radius } = useTheme();
  const { width } = useWindowDimensions();
  const greeting = greetingFor(new Date().getHours());

  return (
    <Screen>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: space.lg,
          paddingVertical: space.xs,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}>
          <BananaMark size={32} framed={false} />
          <AppText variant="headline">BananaVision</AppText>
        </View>
        <IconButton
          icon="user"
          label={firstName ? `Change your name, currently ${firstName}` : "Add your name"}
          onPress={onEditName}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: space.xl,
          paddingVertical: space.lg,
          gap: space.xl,
        }}
      >
        <View style={{ gap: space.xxs }}>
          <AppText variant="overline" tone="textSecondary">
            {greeting}
          </AppText>
          <AppText variant="display" accessibilityRole="header">
            {firstName ? (
              <>
                Welcome,{"\n"}
                <AppText variant="display" tone="primary">
                  {firstName}
                </AppText>
              </>
            ) : (
              "Welcome!"
            )}
          </AppText>
        </View>

        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            padding: space.xl,
            gap: space.xl,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.lg }}>
            <BananaMark size={Math.min(width * 0.26, 112)} />
            <AppText variant="callout" tone="textSecondary" style={{ flex: 1 }}>
              Got a banana nearby? Scan it to see how ripe it is, how long it'll
              last, and what it's good for.
            </AppText>
          </View>

          <View style={{ height: 1, backgroundColor: colors.border }} />

          <View style={{ gap: space.md }}>
            {STEPS.map((step, i) => (
              <View
                key={step.icon}
                accessible
                accessibilityLabel={`Step ${i + 1}: ${step.text}`}
                style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}
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
                  <Feather name={step.icon} size={18} color={colors.onPrimarySoft} />
                </View>
                <AppText variant="callout" style={{ flex: 1 }}>
                  {step.text}
                </AppText>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View
        style={{
          paddingHorizontal: space.xl,
          paddingTop: space.sm,
          paddingBottom: space.md,
          gap: space.sm,
        }}
      >
        <Button
          label="Scan a banana"
          icon="camera"
          onPress={onScan}
          accessibilityHint="Opens the camera"
        />
        <Button label="Exit app" icon="log-out" variant="secondary" onPress={onExit} />
      </View>
    </Screen>
  );
}
