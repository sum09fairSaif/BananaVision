import { useState } from "react";
import {
  View,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import ArrowLeft from "lucide-react-native/icons/arrow-left";
import Lock from "lucide-react-native/icons/lock";
import TriangleAlert from "lucide-react-native/icons/triangle-alert";
import { useTheme } from "../theme/ThemeProvider";
import { elevation } from "../theme/tokens";
import Screen from "../components/Screen";
import AppText from "../components/AppText";
import Button from "../components/Button";
import IconButton from "../components/IconButton";
import Reveal from "../components/Reveal";
import { NAME_MAX_LENGTH, normalizeName, validateName } from "../utils/text";
import { failure } from "../utils/haptics";

const WAVES = require("../assets/illustrations/name-waves.png");

/**
 * First-launch name prompt over a wavy field of green, turquoise, and blue dots.
 * The form sits centered in the pattern's quiet middle. Reused with
 * editing=true to change the name later.
 */
export default function NameEntryScreen({
  initialName = "",
  editing = false,
  onSubmit,
  onSkip,
  onCancel,
}) {
  const theme = useTheme();
  const { colors, fonts, space, radius, dark } = theme;
  const [name, setName] = useState(initialName);
  const [attempted, setAttempted] = useState(false);
  const [focused, setFocused] = useState(false);

  // Validation only speaks up after a submit attempt — never mid-typing.
  const error = attempted ? validateName(name) : null;
  const hasText = normalizeName(name).length > 0;

  function submit() {
    setAttempted(true);
    if (validateName(name)) {
      failure();
      return;
    }
    Keyboard.dismiss();
    onSubmit(normalizeName(name));
  }

  // A lighter, quieter page than the app canvas so the dot waves carry the screen.
  const page = dark ? colors.canvas : "#FBFDFC";
  const pageClear = dark ? colors.canvasClear : "rgba(251, 253, 252, 0)";
  const borderColor = error ? colors.critical : focused ? colors.accent : colors.separator;

  return (
    <View style={{ flex: 1, backgroundColor: page }}>
      <Image
        source={WAVES}
        contentFit="cover"
        transition={0}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[StyleSheet.absoluteFill, { opacity: dark ? 0.75 : 1 }]}
      />
      {/* A light veil just behind the form keeps small text crisp over the dots. */}
      <LinearGradient
        pointerEvents="none"
        colors={[pageClear, page, page, pageClear]}
        locations={[0.25, 0.35, 0.66, 0.77]}
        style={[StyleSheet.absoluteFill, { opacity: 0.85 }]}
      />

      <Screen transparent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <View style={{ minHeight: 56, paddingHorizontal: space.md, justifyContent: "center" }}>
            {editing ? (
              <IconButton icon={ArrowLeft} label="Back" variant="tinted" onPress={onCancel} />
            ) : null}
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              paddingHorizontal: space.xl,
              paddingBottom: space.huge,
            }}
          >
            <Reveal>
              <AppText variant="hero" accessibilityRole="header" style={{ textAlign: "center" }}>
                What should we{"\n"}
                <AppText variant="hero" italic tone="accent">
                  call you?
                </AppText>
              </AppText>
            </Reveal>
            <Reveal delay={80}>
              <AppText
                variant="body"
                tone="ink2"
                style={{ marginTop: space.md, textAlign: "center", alignSelf: "center", maxWidth: 320 }}
              >
                We'll use it to personalize your BananaVision experience.
              </AppText>
            </Reveal>

            <Reveal delay={160} style={{ marginTop: space.xxl }}>
              <AppText variant="eyebrow" tone="ink2" style={{ marginBottom: space.xs, marginLeft: space.xxs }}>
                First name
              </AppText>
              <View
                style={[
                  {
                    borderRadius: radius.button,
                    borderWidth: focused || error ? 2 : 1,
                    borderColor,
                    backgroundColor: colors.elevated,
                  },
                  elevation(1, theme),
                ]}
              >
                <TextInput
                  value={name}
                  onChangeText={setName}
                  onSubmitEditing={submit}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="e.g. Jordan"
                  placeholderTextColor={colors.ink3}
                  selectionColor={colors.accent}
                  cursorColor={colors.accent}
                  maxLength={NAME_MAX_LENGTH}
                  autoCapitalize="words"
                  autoComplete="given-name"
                  textContentType="givenName"
                  autoCorrect={false}
                  returnKeyType="done"
                  enablesReturnKeyAutomatically
                  accessibilityLabel="First name"
                  accessibilityHint={error ?? "Saved only on this device"}
                  maxFontSizeMultiplier={1.6}
                  style={{
                    minHeight: 60,
                    // Keep the text still when the border thickens on focus.
                    paddingHorizontal: focused || error ? space.lg - 1 : space.lg,
                    paddingVertical: space.md,
                    fontFamily: fonts.textMedium,
                    fontSize: 19,
                    color: colors.ink,
                  }}
                />
              </View>

              <View
                accessibilityLiveRegion="polite"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: space.xs,
                  marginTop: space.sm,
                  marginLeft: space.xxs,
                  minHeight: 20,
                }}
              >
                {error ? (
                  <>
                    <TriangleAlert size={15} color={colors.critical} strokeWidth={2.2} />
                    <AppText variant="footnote" tone="critical">
                      {error}
                    </AppText>
                  </>
                ) : (
                  <>
                    <Lock size={13} color={colors.ink3} strokeWidth={2.2} />
                    <AppText variant="footnote" tone="ink3">
                      Saved only on this device
                    </AppText>
                  </>
                )}
              </View>
            </Reveal>

            <Reveal delay={220} style={{ marginTop: space.xl, gap: space.sm }}>
              {/* Solid backing so the dimmed (disabled) button doesn't let dots show through. */}
              <View style={{ borderRadius: radius.button, backgroundColor: page }}>
                <Button label={editing ? "Save" : "Continue"} onPress={submit} disabled={!hasText} />
              </View>
              {editing ? (
                <Button label="Cancel" variant="secondary" tone="neutral" onPress={onCancel} />
              ) : (
                <Button
                  label="Skip for now"
                  variant="secondary"
                  tone="neutral"
                  onPress={onSkip}
                  accessibilityHint="Continue without adding a name"
                />
              )}
            </Reveal>
          </ScrollView>
        </KeyboardAvoidingView>
      </Screen>
    </View>
  );
}
