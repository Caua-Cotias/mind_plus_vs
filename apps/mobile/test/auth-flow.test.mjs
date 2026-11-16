import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  AuthFlowError,
  authAvailability,
  createAuthFlow,
  validateLogin,
  validateRegistration,
} from "../src/lib/auth-flow.ts";

test("registration and verification resend are unavailable in the mobile app", () => {
  assert.equal(authAvailability.registration, false);
  assert.equal(authAvailability.verificationResend, false);
});

test("public navigation hides registration and verification resend routes", async () => {
  const source = (relativePath) => readFile(new URL(relativePath, import.meta.url), "utf8");
  const [welcome, login, signUp, verificationPending] = await Promise.all([
    source("../src/app/(public)/welcome.tsx"),
    source("../src/app/(public)/login.tsx"),
    source("../src/app/(public)/sign-up.tsx"),
    source("../src/app/(public)/verification-pending.tsx"),
  ]);

  assert.doesNotMatch(welcome, /router\.push\(["']\/sign-up/);
  assert.doesNotMatch(login, /router\.push\(["']\/sign-up/);
  assert.match(signUp, /authAvailability\.registration/);
  assert.match(signUp, /Cadastro indisponível/);
  assert.doesNotMatch(verificationPending, /requestVerification|Reenviar e-mail/i);
});

function createGateway(overrides = {}) {
  return {
    signIn: async () => ({ data: { user: { id: "synthetic-user" } } }),
    signUp: async () => ({ data: { user: { id: "synthetic-user", emailVerified: false } } }),
    sendVerificationEmail: async () => ({ data: { status: true } }),
    getSession: async () => ({ data: { user: { id: "synthetic-user" }, session: { id: "synthetic-session" } } }),
    signOut: async () => ({ data: { success: true } }),
    ...overrides,
  };
}

test("login form validation rejects invalid email and missing password", () => {
  assert.equal(validateLogin({ email: "bad", password: "x" }), "Informe um e-mail válido.");
  assert.equal(validateLogin({ email: "user@example.com", password: "" }), "Informe sua senha.");
  assert.equal(validateLogin({ email: "user@example.com", password: "secret" }), null);
});

test("registration validation requires a name, valid email, and 8-character password", () => {
  assert.equal(validateRegistration({ name: " ", email: "user@example.com", password: "password" }), "Informe seu nome.");
  assert.equal(validateRegistration({ name: "User", email: "bad", password: "password" }), "Informe um e-mail válido.");
  assert.equal(validateRegistration({ name: "User", email: "user@example.com", password: "short" }), "A senha deve ter pelo menos 8 caracteres.");
  assert.equal(validateRegistration({ name: " User ", email: "user@example.com", password: "password" }), null);
});

test("successful login normalizes the email and returns the mocked session user", async () => {
  let received;
  const flow = createAuthFlow(createGateway({ signIn: async (input) => {
    received = input;
    return { data: { user: { id: "user-1" } } };
  } }));

  const result = await flow.login({ email: "  User@Example.com ", password: "password" });

  assert.deepEqual(received, { email: "user@example.com", password: "password" });
  assert.deepEqual(result, { user: { id: "user-1" } });
});

test("login rejects invalid credentials without exposing backend detail", async () => {
  const flow = createAuthFlow(createGateway({
    signIn: async () => ({ error: { code: "INVALID_EMAIL_OR_PASSWORD", message: "internal detail" } }),
  }));

  await assert.rejects(flow.login({ email: "user@example.com", password: "incorrect" }), (error) => {
    assert.ok(error instanceof AuthFlowError);
    assert.equal(error.code, "AUTH_ERROR");
    assert.equal(error.message.includes("internal detail"), false);
    return true;
  });
});

test("session restoration returns an authenticated session and treats an expired session as absent", async () => {
  const authenticated = createAuthFlow(createGateway());
  const expired = createAuthFlow(createGateway({ getSession: async () => ({ data: null }) }));

  assert.deepEqual(await authenticated.restoreSession(), {
    user: { id: "synthetic-user" },
    session: { id: "synthetic-session" },
  });
  assert.equal(await expired.restoreSession(), null);
});

test("session restoration reports connection failures", async () => {
  const flow = createAuthFlow(createGateway({ getSession: async () => { throw new Error("fetch failed"); } }));

  await assert.rejects(flow.restoreSession(), (error) => {
    assert.equal(error.code, "CONNECTION_ERROR");
    return true;
  });
});

test("registration resolves only to the pending-verification state", async () => {
  let registered;
  const flow = createAuthFlow(createGateway({ signUp: async (input) => {
    registered = input;
    return { data: { user: { id: "user-1", emailVerified: false } } };
  } }));

  assert.equal(await flow.register({ name: " Test User ", email: "Test@Example.com", password: "password" }), "verification-pending");
  assert.deepEqual(registered, { name: "Test User", email: "test@example.com", password: "password" });
});

test("an unverified account is directed to the pending-verification state", async () => {
  const flow = createAuthFlow(createGateway({
    signIn: async () => ({ error: { code: "EMAIL_NOT_VERIFIED" } }),
  }));

  await assert.rejects(flow.login({ email: "user@example.com", password: "password" }), (error) => {
    assert.equal(error.code, "EMAIL_NOT_VERIFIED");
    return true;
  });
});

test("verification resend uses a normalized email and fixed API callback", async () => {
  let request;
  const flow = createAuthFlow(createGateway({
    sendVerificationEmail: async (email, callbackURL) => {
      request = { email, callbackURL };
      return { data: { status: true } };
    },
  }));

  await flow.requestVerification(" User@Example.com ");
  assert.deepEqual(request, {
    email: "user@example.com",
    callbackURL: "/verification-complete",
  });
});

test("verification resend reports provider failures and rate limits without raw server details", async () => {
  const unavailable = createAuthFlow(createGateway({
    sendVerificationEmail: async () => ({ error: { status: 503, message: "provider key must not leak" } }),
  }));
  await assert.rejects(unavailable.requestVerification("user@example.com"), (error) => {
    assert.equal(error.code, "EMAIL_SERVICE_UNAVAILABLE");
    assert.equal(error.message.includes("provider key"), false);
    return true;
  });

  const rateLimited = createAuthFlow(createGateway({
    sendVerificationEmail: async () => ({ error: { status: 429, code: "TOO_MANY_REQUESTS" } }),
  }));
  await assert.rejects(rateLimited.requestVerification("user@example.com"), { code: "RATE_LIMITED" });
});

test("logout delegates to Better Auth and reports an unsuccessful response", async () => {
  let called = false;
  const flow = createAuthFlow(createGateway({ signOut: async () => {
    called = true;
    return { data: { success: true } };
  } }));
  await flow.logout();
  assert.equal(called, true);

  const failingFlow = createAuthFlow(createGateway({ signOut: async () => ({ error: { message: "failure" } }) }));
  await assert.rejects(failingFlow.logout(), { code: "AUTH_ERROR" });
});
