import { Link, Stack } from 'expo-router';

import { AuthLoading, AuthScreen, InlineMessage, PrimaryButton } from '@/components/auth-ui';
import { authClient } from '@/lib/auth-client';

export default function AuthenticatedLayout() {
  const { data: session, isPending, error, refetch } = authClient.useSession();

  if (isPending) return <AuthLoading message="Restaurando sua sessão segura…" />;

  if (error) {
    return (
      <AuthScreen title="Não foi possível verificar a sessão" description="A navegação da sua conta precisa confirmar a sessão com a API.">
        <InlineMessage>Confira a conexão. A sessão local não foi apagada.</InlineMessage>
        <PrimaryButton title="Tentar novamente" onPress={() => void refetch()} />
        <Link href="/" style={{ color: '#70D6FF', textAlign: 'center', padding: 16, fontWeight: '700' }}>
          Voltar ao catálogo público
        </Link>
      </AuthScreen>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={Boolean(session)} redirectTo="/login">
        <Stack.Screen name="home" />
      </Stack.Protected>
    </Stack>
  );
}
