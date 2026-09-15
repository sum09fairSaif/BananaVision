import { useState } from "react";
import {
  View,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
} from "react-native";
import { Feather } from "@react-native-vector-icons/feather";
import { useTheme } from "../theme/ThemeProvider";
import Screen from "../components/Screen";
import AppText from "../components/AppText";
import Button from "../components/Button";
import IconButton from "../components/IconButton";
import BananaMark from "../components/BananaMark";
import { NAME_MAX_LENGTH, normalizeName, validateName } from "../utils/text";
import { failure } from "../utils/haptics";

/**
 * First-launch name prompt; also reused (editing=true) to change the name later.
 */
export default function NameEntryScreen({
  initialName = "",
  editing = false,
  onSubmit,
  onSkip,
  onCancel,
}) {
  const { colors, space, radius, type } = useTheme();
  const [name, setName] = useState(initialName);
  const [attempted, setAttempted] = useState(false);
  const [focused, setFocused] = useState(false);

  // Only show validation after the first submit, so we never scold mid-typing.
  const error = attempted ? validateName(name) : null;
  const hasText = normalizeName(name).length > 0;
  const emphasized = focused || Boolean(error);

  function submit() {
    setAttempted(true);
    if (validateName(name)) {
      failure();
      return;
    }
    Keyboard.dismiss();
    onSubmit(normalizeName(name));
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        {editing ? (
          <View style={{ paddingHorizontal: space.lg, paddingVertical: space.xs }}>
            <IconButton icon="arrow-left" label="Back" onPress={onCancel} />
          </View>
        ) : null}

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: space.xl,
            paddingVertical: space.xl,
            gap: space.xl,
          }}
        >
          <BananaMark size={96} />

          <View style={{ gap: space.xs }}>
            <AppText variant="overline" tone="textSecondary">
              {editing ? "Your profile" : "Welcome to BananaVision"}
            </AppText>
            <AppText variant="title1" accessibilityRole="header">
              {editing ? "Update your name" : "What's your first name?"}
            </AppText>
            <AppText variant="body" tone="textSecondary">
              We'll use it to greet you. It's saved only on this device.
            </AppText>
          </View>

          <View style={{ gap: space.xs }}>
            <AppText variant="footnote" tone="textSecondary" nativeID="firstNameLabel">
              First name
            </AppText>
            <TextInput
              value={name}
              onChangeText={setName}
              onSubmitEditing={submit}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="e.g. Jordan"
              placeholderTextColor={colors.textTertiary}
              selectionColor={colors.primary}
              cursorColor={colors.primary}
              maxLength={NAME_MAX_LENGTH}
              autoCapitalize="words"
              autoComplete="given-name"
              textContentType="givenName"
              autoCorrect={false}
              returnKeyType="done"
              enablesReturnKeyAutomatically
              accessibilityLabel="First name"
              accessibilityLabelledBy="firstNameLabel"
              accessibilityHint={error ?? undefined}
              maxFontSizeMultiplier={1.6}
              style={{
                fontFamily: type.body.fontFamily,
                fontSize: 17,
                minHeight: 56,
                paddingHorizontal: emphasized ? space.md - 1 : space.md,
                borderRadius: radius.md,
                borderWidth: emphasized ? 2 : 1,
                borderColor: error
                  ? colors.danger
                  : focused
                    ? colors.primary
                    : colors.borderStrong,
                backgroundColor: colors.surface,
                color: colors.text,
              }}
            />
            {/* Fixed-height slot so the error appearing doesn't shift the buttons. */}
            <View style={{ minHeight: 20 }}>
              {error ? (
                <View
                  accessibilityLiveRegion="polite"
                  style={{ flexDirection: "row", alignItems: "center", gap: space.xxs }}
                >
                  <Feather name="alert-circle" size={14} color={colors.danger} />
                  <AppText variant="footnote" tone="danger">
                    {error}
                  </AppText>
                </View>
              ) : null}
            </View>
          </View>
        </ScrollView>

        <View style={{ paddingHorizontal: space.xl, paddingBottom: space.md, gap: space.xs }}>
          <Button
            label={editing ? "Save" : "Continue"}
            icon={editing ? "check" : "arrow-right"}
            onPress={submit}
            disabled={!hasText}
          />
          {!editing ? (
            <Button label="Skip for now" variant="quiet" onPress={onSkip} />
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
