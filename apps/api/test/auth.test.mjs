import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { memoryAdapter } from "@better-auth/memory-adapter";
import { createAuth } from "../src/lib/auth.ts";
import { withArchivedEmailFlows, withAuthCors } from "../src/lib/auth-cors.ts";

const baseURL = "http://localhost:3000";
const trustedOrigins = [baseURL, "http://localhost:3001", "mindplus://"];
const testSecret = "test-only-secret-with-more-than-32-bytes-0123456789";

function createTestAuth(emailDelivery = {}, disableSignUp = true, database = {
  user: [],
  session: [],
  account: [],
  verification: [],
}) {
  return createAuth({
    database: memoryAdapter(database),
    secret: testSecret,
    baseURL,
    trustedOrigins,
    disableSignUp,
    emailDelivery: {
      sendVerificationEmail: async () => {},
      sendResetPassword: async () => {},
      ...emailDelivery,
    },
  });
}

function jsonRequest(path, body, origin = baseURL, cookie) {
  const headers = new Headers({
    "content-type": "application/json",
    origin,
    "x-forwarded-for": "127.0.0.1",
  });

  if (cookie) headers.set("cookie", cookie);

  return new Request(`${baseURL}/api/auth${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

test("previously verified users can log in, restore a session, and log out with sign-up disabled", async () => {
  let verificationLink;
  const database = { user: [], session: [], account: [], verification: [] };
  const signupAuth = createTestAuth({
    sendVerificationEmail: async ({ url }) => {
      verificationLink = url;
    },
  }, false, database);
  const email = `codex-${randomUUID()}@example.test`;

  const signUpResponse = await signupAuth.handler(jsonRequest("/sign-up/email", {
    name: "Test Account",
    email,
    password: "Test-only-password-123!",
  }));
  assert.ok([200, 201].includes(signUpResponse.status));
  assert.ok(verificationLink);

  const verificationResponse = await signupAuth.handler(new Request(verificationLink, {
    headers: { "x-forwarded-for": "127.0.0.1" },
  }));
  assert.ok([200, 302, 303].includes(verificationResponse.status));

  const auth = createTestAuth({}, true, database);
  const signInResponse = await auth.handler(jsonRequest("/sign-in/email", {
    email,
    password: "Test-only-password-123!",
  }));
  assert.equal(signInResponse.status, 200);

  const cookie = signInResponse.headers.getSetCookie()
    .map((value) => value.split(";", 1)[0])
    .join("; ");
  assert.ok(cookie.length > 0);

  const sessionResponse = await auth.handler(new Request(`${baseURL}/api/auth/get-session`, {
    headers: { cookie, "x-forwarded-for": "127.0.0.1" },
  }));
  assert.equal(sessionResponse.status, 200);
  assert.equal((await sessionResponse.json()).user.email, email);

  const signOutResponse = await auth.handler(jsonRequest("/sign-out", {}, baseURL, cookie));
  assert.equal(signOutResponse.status, 200);

  const afterLogoutResponse = await auth.handler(new Request(`${baseURL}/api/auth/get-session`, {
    headers: { cookie, "x-forwarded-for": "127.0.0.1" },
  }));
  assert.equal(await afterLogoutResponse.json(), null);

});

test("API auth initializes without Resend credentials and blocks sign-up before writing a user", async () => {
  const database = { user: [], session: [], account: [], verification: [] };
  const previousResendKey = process.env.RESEND_API_KEY;
  const previousFrom = process.env.MIND_PLUS_EMAIL_FROM;
  delete process.env.RESEND_API_KEY;
  delete process.env.MIND_PLUS_EMAIL_FROM;
  try {
    const auth = createAuth({
      database: memoryAdapter(database),
      secret: testSecret,
      baseURL,
      trustedOrigins,
    });
    const response = await auth.handler(jsonRequest("/sign-up/email", {
      name: "Synthetic Account",
      email: `disabled-${randomUUID()}@example.test`,
      password: "Test-only-password-123!",
    }));

    assert.ok(response.status >= 400 && response.status < 500);
    assert.equal(database.user.length, 0);
    assert.equal(database.account.length, 0);
  } finally {
    if (previousResendKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousResendKey;
    if (previousFrom === undefined) delete process.env.MIND_PLUS_EMAIL_FROM;
    else process.env.MIND_PLUS_EMAIL_FROM = previousFrom;
  }
});

test("production always disables sign-up even if a caller requests the test override", async () => {
  const database = { user: [], session: [], account: [], verification: [] };
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const auth = createAuth({
      database: memoryAdapter(database),
      secret: testSecret,
      baseURL,
      trustedOrigins,
      disableSignUp: false,
    });
    const response = await auth.handler(jsonRequest("/sign-up/email", {
      name: "Synthetic Account",
      email: `production-blocked-${randomUUID()}@example.test`,
      password: "Test-only-password-123!",
    }));
    assert.ok(response.status >= 400 && response.status < 500);
    assert.equal(database.user.length, 0);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

test("invalid registration data is rejected when testing the archived flow in memory", async () => {
  const auth = createTestAuth({}, false);
  const response = await auth.handler(jsonRequest("/sign-up/email", {
    name: "Invalid Account",
    email: "not-an-email",
    password: "short",
  }));

  assert.ok(response.status >= 400);
});

test("verification resend and password recovery endpoints are blocked without invoking Better Auth", async () => {
  let called = false;
  const endpoint = withArchivedEmailFlows(async () => {
    called = true;
    return Response.json({ ok: true });
  });

  for (const [method, path] of [
    ["POST", "/api/auth/send-verification-email"],
    ["POST", "/api/auth/request-password-reset"],
    ["POST", "/api/auth/reset-password"],
  ]) {
    const response = await endpoint(new Request(`${baseURL}${path}`, { method }));
    assert.equal(response.status, 410);
    assert.equal((await response.json()).code, "EMAIL_FLOWS_ARCHIVED");
  }

  assert.equal(called, false);
});

test("auth endpoints reject requests from untrusted origins", async () => {
  const auth = createTestAuth();
  const response = await auth.handler(jsonRequest("/sign-up/email", {
    name: "Untrusted Account",
    email: `blocked-${randomUUID()}@example.test`,
    password: "Test-only-password-123!",
  }, "https://untrusted.example"));

  assert.ok([400, 403].includes(response.status));
});

test("session query returns no session when no cookie is present", async () => {
  const auth = createTestAuth();
  const response = await auth.handler(new Request(`${baseURL}/api/auth/get-session`, {
    headers: { "x-forwarded-for": "127.0.0.1" },
  }));

  assert.equal(response.status, 200);
  assert.equal(await response.json(), null);
});

test("credentialed browser CORS allows configured origins and rejects unconfigured origins", async () => {
  const previousBaseURL = process.env.BETTER_AUTH_URL;
  const previousTrustedOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS;
  process.env.BETTER_AUTH_URL = baseURL;
  process.env.BETTER_AUTH_TRUSTED_ORIGINS = "http://localhost:3001,mindplus://";

  try {
    const handler = withAuthCors(async () => Response.json({ ok: true }));
    const preflight = await handler(new Request(`${baseURL}/api/auth/sign-in/email`, {
      method: "OPTIONS",
      headers: {
        origin: "http://localhost:3001",
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type",
      },
    }));
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get("access-control-allow-origin"), "http://localhost:3001");
    assert.equal(preflight.headers.get("access-control-allow-credentials"), "true");

    const blocked = await handler(new Request(`${baseURL}/api/auth/sign-in/email`, {
      method: "OPTIONS",
      headers: { origin: "https://untrusted.example" },
    }));
    assert.equal(blocked.status, 403);
  } finally {
    if (previousBaseURL === undefined) delete process.env.BETTER_AUTH_URL;
    else process.env.BETTER_AUTH_URL = previousBaseURL;
    if (previousTrustedOrigins === undefined) delete process.env.BETTER_AUTH_TRUSTED_ORIGINS;
    else process.env.BETTER_AUTH_TRUSTED_ORIGINS = previousTrustedOrigins;
  }
});
