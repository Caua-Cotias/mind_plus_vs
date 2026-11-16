import { router } from "expo-router";

import { AuthScreen, InlineMessage, PrimaryButton } from "@/components/auth-ui";

export default function VerificationCompleteScreen() {
  return (
    <AuthScreen title="Confirme o acesso" description="A página de verificação foi aberta no MIND +.">
      <InlineMessage tone="info">
        Tente entrar para confirmar o estado da sua conta. O servidor só permitirá o login depois de validar o link de verificação.
      </InlineMessage>
      <PrimaryButton title="Ir para o login" onPress={() => router.replace("/login")} />
    </AuthScreen>
  );
}
