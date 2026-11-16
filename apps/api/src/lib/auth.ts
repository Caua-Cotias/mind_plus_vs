import { expo } from "@better-auth/expo";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import "./load-env.ts";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { prisma } from "@mind-plus/database";

type VerificationEmailSender = NonNullable<
  NonNullable<BetterAuthOptions["emailVerification"]>["sendVerificationEmail"]
>;
type PasswordResetEmailSender = NonNullable<
  NonNullable<BetterAuthOptions["emailAndPassword"]>["sendResetPassword"]
>;

export interface AuthEmailDelivery {
  sendVerificationEmail: VerificationEmailSender;
  sendResetPassword: PasswordResetEmailSender;
}

export interface CreateAuthOptions {
  database?: BetterAuthOptions["database"];
  advanced?: BetterAuthOptions["advanced"];
  secret?: string;
  baseURL?: string;
  trustedOrigins?: string[];
  emailDelivery?: AuthEmailDelivery;
  /** Explicitly injectable for isolated tests; the API default always blocks sign-up. */
  disableSignUp?: boolean;
}

const archivedEmailDelivery: AuthEmailDelivery = {
  sendVerificationEmail: async () => {},
  sendResetPassword: async () => {},
};

function requiredValue(name: string, value: string | undefined): string {
  if (!value?.trim()) {
    throw new Error(`${name} must be configured in the API environment.`);
  }

  return value.trim();
}

function resolveTrustedOrigins(baseURL: string, overrides?: string[]): string[] {
  const configuredOrigins = overrides ??
    process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? [];

  if (configuredOrigins.length === 0) {
    throw new Error("BETTER_AUTH_TRUSTED_ORIGINS must contain an explicit origin allowlist.");
  }

  const baseOrigin = new URL(baseURL).origin;
  const origins = new Set([baseOrigin, ...configuredOrigins]);

  if (process.env.NODE_ENV === "development") {
    origins.add("exp://**");
  }

  const baseHostname = new URL(baseURL).hostname;
  const isLocalBase = baseHostname === "localhost" || baseHostname === "127.0.0.1";

  if (
    process.env.NODE_ENV === "production" &&
    !isLocalBase &&
    [...origins].some((origin) => /^(https?:\/\/localhost|https?:\/\/127\.0\.0\.1|exp:\/\/)/i.test(origin))
  ) {
    throw new Error("Production trusted origins must not contain local development origins.");
  }

  return [...origins];
}

export function createAuth(options: CreateAuthOptions = {}) {
  const secret = requiredValue("BETTER_AUTH_SECRET", options.secret ?? process.env.BETTER_AUTH_SECRET);

  if (Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 bytes.");
  }

  const baseURL = requiredValue("BETTER_AUTH_URL", options.baseURL ?? process.env.BETTER_AUTH_URL);
  const baseUrlObject = new URL(baseURL);

  if (!(["http:", "https:"].includes(baseUrlObject.protocol)) || baseUrlObject.pathname !== "/") {
    throw new Error("BETTER_AUTH_URL must be an HTTP(S) origin without a path.");
  }

  const emailDelivery = options.emailDelivery ?? archivedEmailDelivery;
  const disableSignUp = process.env.NODE_ENV === "production" || options.disableSignUp !== false;

  return betterAuth({
    appName: "MIND +",
    secret,
    baseURL: baseUrlObject.origin,
    trustedOrigins: resolveTrustedOrigins(baseUrlObject.origin, options.trustedOrigins),
    database: options.database ?? prismaAdapter(prisma, { provider: "postgresql" }),
    advanced: options.advanced,
    emailAndPassword: {
      enabled: true,
      disableSignUp,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: emailDelivery.sendResetPassword,
    },
    emailVerification: {
      sendOnSignUp: !disableSignUp && options.emailDelivery !== undefined,
      sendOnSignIn: false,
      expiresIn: 60 * 60,
      sendVerificationEmail: emailDelivery.sendVerificationEmail,
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 3600, max: 5 },
        "/request-password-reset": { window: 3600, max: 3 },
        "/send-verification-email": { window: 3600, max: 3 },
      },
    },
    plugins: [expo()],
  });
}

export const auth = createAuth();
