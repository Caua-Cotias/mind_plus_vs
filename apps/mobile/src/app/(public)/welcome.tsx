import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AuthScreen, InlineMessage, PrimaryButton } from "@/components/auth-ui";
import { Colors, Spacing } from "@/constants/theme";

const palette = Colors.dark;

export default function WelcomeScreen() {
  return (
    <AuthScreen title="Histórias para sentir." description="Entre com sua conta MIND + para continuar.">
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sua experiência começa aqui</Text>
        <Text style={styles.cardText}>Use seu e-mail para acessar sua conta com segurança.</Text>
      </View>
      <PrimaryButton title="Entrar" onPress={() => router.push("/login")} />
      <InlineMessage tone="info">Novos cadastros estão temporariamente indisponíveis. Contas existentes podem entrar normalmente.</InlineMessage>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  card: { borderColor: palette.border, borderWidth: 1, borderRadius: 18, padding: Spacing.three, backgroundColor: palette.backgroundElement, marginTop: Spacing.two },
  cardTitle: { color: palette.text, fontSize: 16, fontWeight: "700", marginBottom: Spacing.two },
  cardText: { color: palette.textSecondary, fontSize: 14, lineHeight: 21 },
});
