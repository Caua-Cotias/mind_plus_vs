import { router } from "expo-router";
import { useState } from "react";

import { AuthField, AuthScreen, InlineMessage, PrimaryButton } from "@/components/auth-ui";
import { AuthFlowError, validateLogin } from "@/lib/auth-flow";
import { authFlow } from "@/lib/auth-client";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    const validationError = validateLogin({ email, password });
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await authFlow.login({ email, password });
      router.replace("/home");
    } catch (cause) {
      if (cause instanceof AuthFlowError && cause.code === "EMAIL_NOT_VERIFIED") {
        router.replace("/verification-pending");
        return;
      }
      setError(cause instanceof Error ? cause.message : "Não foi possível entrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen title="Boas-vindas de volta" description="Entre com o e-mail e a senha da sua conta.">
      <AuthField label="E-mail" value={email} onChangeText={setEmail} placeholder="voce@exemplo.com" keyboardType="email-address" textContentType="emailAddress" autoComplete="email" />
      <AuthField label="Senha" value={password} onChangeText={setPassword} placeholder="Sua senha" secureTextEntry textContentType="password" autoComplete="password" />
      <InlineMessage tone="info">Novos cadastros estão temporariamente indisponíveis. O login das contas existentes continua ativo.</InlineMessage>
      {error ? <InlineMessage>{error}</InlineMessage> : null}
      <PrimaryButton title="Entrar" onPress={() => void handleLogin()} loading={loading} />
    </AuthScreen>
  );
}
