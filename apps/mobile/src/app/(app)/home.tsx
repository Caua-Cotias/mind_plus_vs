import { useState } from "react";
import { Text, View } from "react-native";

import { AuthScreen, InlineMessage, PrimaryButton } from "@/components/auth-ui";
import { Colors, Spacing } from "@/constants/theme";
import { authFlow, authClient } from "@/lib/auth-client";

const palette = Colors.dark;

export default function AuthenticatedHomeScreen() {
  const { data: session } = authClient.useSession();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const user = session?.user;

  async function handleLogout() {
    setError(null);
    setLoading(true);
    try {
      await authFlow.logout();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível sair da conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen title={`Olá, ${user?.name?.trim() || "bem-vindo"}`} description="Sua sessão está ativa e protegida neste dispositivo.">
      <View style={{ backgroundColor: palette.backgroundElement, borderColor: palette.border, borderWidth: 1, borderRadius: 16, padding: Spacing.three, gap: Spacing.two }}>
        <Text style={{ color: palette.textSecondary, fontSize: 12, fontWeight: "700", letterSpacing: 1 }}>CONTA</Text>
        <Text selectable style={{ color: palette.text, fontSize: 16 }}>{user?.email ?? ""}</Text>
      </View>
      {error ? <InlineMessage>{error}</InlineMessage> : null}
      <PrimaryButton title="Sair da conta" onPress={() => void handleLogout()} loading={loading} />
    </AuthScreen>
  );
}
