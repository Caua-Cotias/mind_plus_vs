import { DarkTheme, Stack, ThemeProvider } from "expo-router";

import { AuthLoading, AuthScreen, InlineMessage, PrimaryButton } from "@/components/auth-ui";
import { authClient } from "@/lib/auth-client";

export default function RootLayout() {
  const { data: session, isPending, error, refetch } = authClient.useSession();

  if (isPending) return <AuthLoading message="Restaurando sua sessão segura…" />;

  if (error) {
    return (
      <AuthScreen title="Sem conexão com a API" description="Não foi possível verificar sua sessão agora.">
        <InlineMessage>Confira a rede e o endereço da API. Sua sessão local não foi removida.</InlineMessage>
        <PrimaryButton title="Tentar novamente" onPress={() => void refetch()} />
      </AuthScreen>
    );
  }

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#080B14" } }}>
        <Stack.Screen name="index" />
        <Stack.Protected guard={!session}>
          <Stack.Screen name="(public)" />
        </Stack.Protected>
        <Stack.Protected guard={Boolean(session)}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
