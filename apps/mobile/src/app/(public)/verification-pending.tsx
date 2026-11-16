import { router } from "expo-router";

import { AuthScreen, InlineMessage, TextButton } from "@/components/auth-ui";

export default function VerificationPendingScreen() {
  return (
    <AuthScreen title="Verificação temporariamente indisponível" description="O envio de e-mails está arquivado no momento.">
      <InlineMessage tone="info">
        Novos cadastros e reenvios de verificação estão suspensos. Se você já tem uma conta verificada, volte ao login.
      </InlineMessage>
      <TextButton title="Voltar ao login" onPress={() => router.replace("/login")} />
    </AuthScreen>
  );
}
