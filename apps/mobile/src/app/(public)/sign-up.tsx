import { router } from "expo-router";
import { useState } from "react";

import { AuthField, AuthScreen, InlineMessage, PrimaryButton, TextButton } from "@/components/auth-ui";
import { authAvailability, validateRegistration } from "@/lib/auth-flow";
import { authFlow } from "@/lib/auth-client";

export default function SignUpScreen() {
  if (!authAvailability.registration) {
    return (
      <AuthScreen title="Cadastro indisponível" description="Novos cadastros estão temporariamente suspensos.">
        <InlineMessage tone="info">
          A verificação de e-mail é obrigatória e o envio transacional está arquivado. Volte quando essa etapa estiver disponível.
        </InlineMessage>
        <TextButton title="Voltar ao login" onPress={() => router.replace("/login")} />
      </AuthScreen>
    );
  }

  return <ArchivedRegistrationForm />;
}

// Preserved for the future approved reactivation. The route above keeps this
// form inaccessible while registration is suspended.
function ArchivedRegistrationForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    const validationError = validateRegistration({ name, email, password });
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await authFlow.register({ name, email, password });
      router.replace("/verification-pending");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível criar a conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen title="Crie sua conta" description="Informe seus dados para iniciar o cadastro.">
      <AuthField label="Nome" value={name} onChangeText={setName} placeholder="Seu nome" autoCapitalize="words" textContentType="name" autoComplete="name" />
      <AuthField label="E-mail" value={email} onChangeText={setEmail} placeholder="voce@exemplo.com" keyboardType="email-address" textContentType="emailAddress" autoComplete="email" />
      <AuthField label="Senha" value={password} onChangeText={setPassword} placeholder="Pelo menos 8 caracteres" secureTextEntry textContentType="newPassword" autoComplete="new-password" />
      <InlineMessage tone="info">A verificação de e-mail é obrigatória antes do primeiro acesso.</InlineMessage>
      {error ? <InlineMessage>{error}</InlineMessage> : null}
      <PrimaryButton title="Criar conta" onPress={() => void handleSignUp()} loading={loading} />
      <TextButton title="Já tem uma conta? Entrar" onPress={() => router.push("/login")} />
    </AuthScreen>
  );
}
