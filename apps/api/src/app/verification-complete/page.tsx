const verificationErrors: Record<string, string> = {
  INVALID_TOKEN: "Este link é inválido ou já foi usado. Solicite um novo e-mail de verificação no app.",
  TOKEN_EXPIRED: "Este link expirou. Solicite um novo e-mail de verificação no app.",
  USER_NOT_FOUND: "Não foi possível localizar a conta. Abra o MIND + e tente entrar novamente.",
  INVALID_USER: "Este link não corresponde à conta atual. Solicite um novo e-mail de verificação.",
};

export default async function VerificationCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const params = await searchParams;
  const errorCode = Array.isArray(params.error) ? params.error[0] : params.error;
  const message = errorCode
    ? verificationErrors[errorCode] ?? "Não foi possível confirmar este link. Solicite outro pelo app."
    : "Se você chegou aqui pelo link enviado por e-mail, a verificação foi concluída. Volte ao MIND + e entre com sua senha.";

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#080b14", color: "#f5f7ff", padding: 24, fontFamily: "Arial, Helvetica, sans-serif" }}>
      <section style={{ width: "100%", maxWidth: 520, border: "1px solid #273247", borderRadius: 20, background: "#111827", padding: 32 }}>
        <p style={{ color: "#70d6ff", fontSize: 22, fontWeight: 700, letterSpacing: 2 }}>MIND +</p>
        <h1 style={{ fontSize: 28 }}>{errorCode ? "Link de verificação" : "Verificação de e-mail"}</h1>
        <p style={{ color: "#c5cee0", lineHeight: 1.7 }}>{message}</p>
        <p style={{ marginTop: 28 }}>
          <a href="mindplus://verification-complete" style={{ color: "#70d6ff", fontWeight: 700 }}>
            Abrir o MIND +
          </a>
        </p>
        <p style={{ color: "#9aa8be", fontSize: 13, lineHeight: 1.6 }}>
          Se o app não abrir, retorne a ele manualmente e toque em “Já confirmei”. No Expo Go, esse retorno manual é esperado.
        </p>
      </section>
    </main>
  );
}
