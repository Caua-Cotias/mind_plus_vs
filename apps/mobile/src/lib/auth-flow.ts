export interface AuthFailure {
  code?: string;
  message?: string;
  status?: number;
}

export interface AuthResult {
  data?: unknown;
  error?: AuthFailure | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegistrationDetails extends LoginCredentials {
  name: string;
}

export interface AuthGateway {
  signIn(credentials: LoginCredentials): Promise<AuthResult>;
  signUp(details: RegistrationDetails): Promise<AuthResult>;
  sendVerificationEmail(email: string, callbackURL: string): Promise<AuthResult>;
  getSession(): Promise<AuthResult>;
  signOut(): Promise<AuthResult>;
}

export const verificationCallbackURL = "/verification-complete";

export const authAvailability = {
  registration: false,
  verificationResend: false,
} as const;

export class AuthFlowError extends Error {
  readonly code:
    | "EMAIL_NOT_VERIFIED"
    | "CONNECTION_ERROR"
    | "AUTH_ERROR"
    | "EMAIL_SERVICE_UNAVAILABLE"
    | "RATE_LIMITED";

  constructor(
    message: string,
    code:
      | "EMAIL_NOT_VERIFIED"
      | "CONNECTION_ERROR"
      | "AUTH_ERROR"
      | "EMAIL_SERVICE_UNAVAILABLE"
      | "RATE_LIMITED",
  ) {
    super(message);
    this.name = "AuthFlowError";
    this.code = code;
  }
}

export function validateEmail(email: string): string | null {
  const normalizedEmail = email.trim();
  if (!normalizedEmail) return "Informe seu e-mail.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return "Informe um e-mail válido.";
  }
  return null;
}

export function validateLogin(credentials: LoginCredentials): string | null {
  const emailError = validateEmail(credentials.email);
  if (emailError) return emailError;
  if (!credentials.password) return "Informe sua senha.";
  return null;
}

export function validateRegistration(details: RegistrationDetails): string | null {
  if (!details.name.trim()) return "Informe seu nome.";
  const emailError = validateEmail(details.email);
  if (emailError) return emailError;
  if (details.password.length < 8) return "A senha deve ter pelo menos 8 caracteres.";
  return null;
}

function asAuthFlowError(error: unknown): AuthFlowError {
  if (error instanceof AuthFlowError) return error;

  if (error && typeof error === "object") {
    const failure = error as AuthFailure;
    if (failure.code === "EMAIL_NOT_VERIFIED") {
      return new AuthFlowError(
        "Seu e-mail ainda não foi verificado. A entrega de e-mails será habilitada em breve.",
        "EMAIL_NOT_VERIFIED",
      );
    }
  }

  return new AuthFlowError(
    "Não foi possível conectar à API. Verifique sua conexão e tente novamente.",
    "CONNECTION_ERROR",
  );
}

function ensureSuccess(result: AuthResult): unknown {
  if (result.error) {
    if (result.error.code === "EMAIL_NOT_VERIFIED") {
      throw new AuthFlowError(
        "Seu e-mail ainda não foi verificado. A entrega de e-mails será habilitada em breve.",
        "EMAIL_NOT_VERIFIED",
      );
    }

    throw new AuthFlowError(
      "Não foi possível concluir a solicitação. Confira os dados e tente novamente.",
      "AUTH_ERROR",
    );
  }

  return result.data;
}

export function createAuthFlow(gateway: AuthGateway) {
  return {
    async login(credentials: LoginCredentials): Promise<unknown> {
      try {
        return ensureSuccess(await gateway.signIn({
          email: credentials.email.trim().toLowerCase(),
          password: credentials.password,
        }));
      } catch (error) {
        throw asAuthFlowError(error);
      }
    },

    async register(details: RegistrationDetails): Promise<"verification-pending"> {
      try {
        ensureSuccess(await gateway.signUp({
          name: details.name.trim(),
          email: details.email.trim().toLowerCase(),
          password: details.password,
        }));
        return "verification-pending";
      } catch (error) {
        throw asAuthFlowError(error);
      }
    },

    async requestVerification(email: string): Promise<void> {
      try {
        const result = await gateway.sendVerificationEmail(
          email.trim().toLowerCase(),
          verificationCallbackURL,
        );
        if (result.error) {
          if (result.error.status === 429 || result.error.code === "TOO_MANY_REQUESTS") {
            throw new AuthFlowError(
              "Muitas solicitações. Aguarde antes de pedir outro e-mail.",
              "RATE_LIMITED",
            );
          }

          if (
            result.error.status === 503 ||
            (typeof result.error.status === "number" && result.error.status >= 500) ||
            ["VERIFICATION_EMAIL_NOT_ENABLED", "EMAIL_PROVIDER_NOT_CONFIGURED"].includes(result.error.code ?? "")
          ) {
            throw new AuthFlowError(
              "O serviço de e-mail está indisponível no momento. Tente novamente mais tarde.",
              "EMAIL_SERVICE_UNAVAILABLE",
            );
          }

          throw new AuthFlowError(
            "Não foi possível solicitar o e-mail. Confira o endereço e tente novamente.",
            "AUTH_ERROR",
          );
        }
      } catch (error) {
        throw asAuthFlowError(error);
      }
    },

    async restoreSession(): Promise<unknown | null> {
      try {
        const session = ensureSuccess(await gateway.getSession());
        return session ?? null;
      } catch (error) {
        throw asAuthFlowError(error);
      }
    },

    async logout(): Promise<void> {
      try {
        ensureSuccess(await gateway.signOut());
      } catch (error) {
        throw asAuthFlowError(error);
      }
    },
  };
}
