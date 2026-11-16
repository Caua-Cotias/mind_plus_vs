import type { PropsWithChildren, ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors, Spacing } from "@/constants/theme";

const palette = Colors.dark;

export function AuthScreen({
  title,
  description,
  children,
  footer,
}: PropsWithChildren<{ title: string; description: string; footer?: ReactNode }>) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <Text style={styles.brand}>MIND <Text style={styles.brandPlus}>+</Text></Text>
            <Text style={styles.kicker}>SÉRIES EM UM NOVO RITMO</Text>
            <Text accessibilityRole="header" style={styles.title}>{title}</Text>
            <Text style={styles.description}>{description}</Text>
            {children}
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AuthField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize = "none",
  textContentType,
  autoComplete,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "words";
  textContentType?: "name" | "emailAddress" | "password" | "newPassword";
  autoComplete?: "name" | "email" | "password" | "new-password";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        autoCorrect={false}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textSecondary}
        returnKeyType={secureTextEntry ? "done" : "next"}
        secureTextEntry={secureTextEntry}
        style={styles.input}
        textContentType={textContentType}
        value={value}
      />
    </View>
  );
}

export function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [styles.primaryButton, pressed && !loading && styles.pressed, (disabled || loading) && styles.disabled]}>
      {loading ? <ActivityIndicator color={palette.text} /> : <Text style={styles.primaryButtonText}>{title}</Text>}
    </Pressable>
  );
}

export function TextButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.textButton}>
      <Text style={styles.textButtonText}>{title}</Text>
    </Pressable>
  );
}

export function InlineMessage({ children, tone = "error" }: PropsWithChildren<{ tone?: "error" | "info" }>) {
  return <Text accessibilityRole={tone === "error" ? "alert" : "text"} style={[styles.message, tone === "info" && styles.infoMessage]}>{children}</Text>;
}

export function AuthLoading({ message }: { message: string }) {
  return (
    <SafeAreaView style={[styles.safeArea, styles.centered]}>
      <ActivityIndicator color={palette.accent} size="large" />
      <Text style={styles.description}>{message}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: palette.background },
  centered: { justifyContent: "center", alignItems: "center", padding: Spacing.four, gap: Spacing.three },
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: Spacing.four },
  content: { width: "100%", maxWidth: 440, alignSelf: "center", gap: Spacing.three },
  brand: { color: palette.text, fontSize: 30, fontWeight: "800", letterSpacing: 1.5 },
  brandPlus: { color: palette.accent },
  kicker: { color: palette.accent, fontSize: 11, fontWeight: "700", letterSpacing: 2, marginTop: Spacing.one },
  title: { color: palette.text, fontSize: 32, lineHeight: 38, fontWeight: "700", marginTop: Spacing.two },
  description: { color: palette.textSecondary, fontSize: 15, lineHeight: 23 },
  field: { gap: Spacing.two },
  label: { color: palette.text, fontSize: 14, fontWeight: "600" },
  input: { backgroundColor: palette.backgroundElement, borderColor: palette.border, borderWidth: 1, borderRadius: 14, color: palette.text, fontSize: 16, minHeight: 54, paddingHorizontal: Spacing.three },
  primaryButton: { minHeight: 54, borderRadius: 14, backgroundColor: palette.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: Spacing.three, marginTop: Spacing.one },
  primaryButtonText: { color: palette.text, fontSize: 16, fontWeight: "700" },
  textButton: { minHeight: 44, justifyContent: "center", alignItems: "center", paddingHorizontal: Spacing.two },
  textButtonText: { color: palette.accent, fontSize: 14, fontWeight: "600", textAlign: "center" },
  message: { color: palette.danger, fontSize: 14, lineHeight: 21, backgroundColor: "#2A151C", padding: Spacing.three, borderRadius: 12 },
  infoMessage: { color: palette.textSecondary, backgroundColor: palette.backgroundElement },
  footer: { marginTop: Spacing.two, alignItems: "center" },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.55 },
});
