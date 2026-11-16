import { createHash } from "node:crypto";
import type { BetterAuthOptions } from "better-auth";

export interface TransactionalEmail {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailTransport {
  send(message: TransactionalEmail, idempotencyKey: string): Promise<void>;
  requiresPublicHttps?: boolean;
}

export class EmailDeliveryError extends Error {
  readonly code: "EMAIL_PROVIDER_NOT_CONFIGURED" | "EMAIL_PROVIDER_FAILED" | "INVALID_VERIFICATION_URL";

  constructor(
    message: string,
    code: "EMAIL_PROVIDER_NOT_CONFIGURED" | "EMAIL_PROVIDER_FAILED" | "INVALID_VERIFICATION_URL",
  ) {
    super(message);
    this.name = "EmailDeliveryError";
    this.code = code;
  }
}

type VerificationEmailSender = NonNullable<NonNullable<BetterAuthOptions["emailVerification"]>["sendVerificationEmail"]>;
type VerificationEmailData = Parameters<VerificationEmailSender>[0];

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character] ?? character;
  });
}

export function createVerificationEmail(data: VerificationEmailData, verificationURL: string): Omit<TransactionalEmail, "from" | "to"> {
  const displayName = data.user.name?.trim() || "";
  const safeName = displayName ? escapeHtml(displayName) : "";
  const greeting = safeName ? `Olá, ${safeName}!` : "Olá!";
  const subject = "Confirme seu e-mail para acessar o MIND +";
  const html = `<!doctype html>
<html lang="pt-BR">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;background:#080b14;color:#f5f7ff;font-family:Arial,Helvetica,sans-serif">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#080b14;padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#111827;border:1px solid #273247;border-radius:20px">
          <tr><td style="padding:36px 32px">
            <p style="margin:0 0 28px;color:#70d6ff;font-size:24px;font-weight:700;letter-spacing:2px">MIND +</p>
            <h1 style="margin:0 0 16px;font-size:25px;line-height:1.3">Confirme seu e-mail</h1>
            <p style="margin:0 0 24px;color:#c5cee0;font-size:16px;line-height:1.6">${greeting} Confirme que este endereço pertence a você para liberar o acesso à sua conta.</p>
            <p style="margin:0 0 28px"><a href="${escapeHtml(verificationURL)}" style="display:inline-block;padding:14px 22px;border-radius:12px;background:#635bff;color:#ffffff;text-decoration:none;font-weight:700">Verificar meu e-mail</a></p>
            <p style="margin:0;color:#9aa8be;font-size:13px;line-height:1.6">O link expira em 1 hora. Se você não criou uma conta no MIND +, ignore esta mensagem.</p>
            <p style="margin:24px 0 0;color:#9aa8be;font-size:12px;line-height:1.6">Se o botão não funcionar, abra este endereço no navegador:<br><a href="${escapeHtml(verificationURL)}" style="color:#70d6ff;word-break:break-all">${escapeHtml(verificationURL)}</a></p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
  const text = `${greeting}\n\nConfirme que este endereço pertence a você para liberar o acesso à sua conta MIND +.\n\nVerifique seu e-mail: ${verificationURL}\n\nO link expira em 1 hora. Se você não criou uma conta, ignore esta mensagem.`;

  return { subject, html, text };
}

export function createResendTransport(apiKey: string, fetchImplementation: typeof fetch = fetch): EmailTransport {
  return {
    requiresPublicHttps: true,
    async send(message, idempotencyKey) {
      let response: Response;
      try {
        response = await fetchImplementation("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify({
            from: message.from,
            to: [message.to],
            subject: message.subject,
            html: message.html,
            text: message.text,
          }),
          signal: AbortSignal.timeout(10_000),
        });
      } catch {
        throw new EmailDeliveryError("The email provider could not be reached.", "EMAIL_PROVIDER_FAILED");
      }

      if (!response.ok) {
        // Do not read or log the provider response: it may contain recipient data.
        throw new EmailDeliveryError("The email provider rejected the message.", "EMAIL_PROVIDER_FAILED");
      }
    },
  };
}

export function createVerificationEmailSender(options: {
  apiKey?: string;
  from?: string;
  baseURL: string;
  transport?: EmailTransport;
}): VerificationEmailSender {
  const apiKey = options.apiKey?.trim();
  const from = options.from?.trim();
  const transport = options.transport ?? (apiKey ? createResendTransport(apiKey) : undefined);

  return async ({ user, url, token }) => {
    if (!apiKey || !from || !transport) {
      throw new EmailDeliveryError("Transactional email is not configured.", "EMAIL_PROVIDER_NOT_CONFIGURED");
    }

    const baseURL = new URL(options.baseURL);
    const link = new URL(url);
    if (link.origin !== baseURL.origin) {
      throw new EmailDeliveryError("The verification URL does not match the API origin.", "INVALID_VERIFICATION_URL");
    }

    if (transport.requiresPublicHttps && (baseURL.protocol !== "https:" || ["localhost", "127.0.0.1", "::1"].includes(baseURL.hostname))) {
      throw new EmailDeliveryError("Email links require a publicly reachable HTTPS API URL.", "EMAIL_PROVIDER_NOT_CONFIGURED");
    }

    // Always return to the API's HTTPS landing page. This avoids embedding the
    // temporary Expo Go / LAN URL in an email opened outside the local network.
    link.searchParams.set("callbackURL", new URL("/verification-complete", baseURL).toString());
    const verificationURL = link.toString();
    const content = createVerificationEmail({ user, url, token }, verificationURL);
    const idempotencyKey = `verification-${createHash("sha256").update(token).digest("hex")}`;

    try {
      await transport.send({ from, to: user.email, ...content }, idempotencyKey);
    } catch (error) {
      if (error instanceof EmailDeliveryError) throw error;
      throw new EmailDeliveryError("The email provider could not deliver the message.", "EMAIL_PROVIDER_FAILED");
    }
  };
}

export function createAuthEmailDelivery(options: {
  apiKey?: string;
  from?: string;
  baseURL: string;
  transport?: EmailTransport;
}) {
  return {
    sendVerificationEmail: createVerificationEmailSender(options),
    // Password recovery remains unavailable until its own approved UX and delivery flow.
    sendResetPassword: async () => {},
  } satisfies {
    sendVerificationEmail: VerificationEmailSender;
    sendResetPassword: NonNullable<NonNullable<BetterAuthOptions["emailAndPassword"]>["sendResetPassword"]>;
  };
}

export function createAuthEmailDeliveryFromEnvironment(baseURL: string) {
  return createAuthEmailDelivery({
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.MIND_PLUS_EMAIL_FROM,
    baseURL,
  });
}
