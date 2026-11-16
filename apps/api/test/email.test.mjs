import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import test from "node:test";
import { memoryAdapter } from "@better-auth/memory-adapter";
import { createEmailVerificationToken } from "better-auth/api";

import { createAuth } from "../src/lib/auth.ts";
import {
  createResendTransport,
  createVerificationEmail,
  createVerificationEmailSender,
  EmailDeliveryError,
} from "../src/lib/email.ts";

const baseURL = "http://localhost:3000";
const secret = "test-only-secret-with-more-than-32-bytes-0123456789";
const testFrom = "MIND + <no-reply@example.test>";
let testIPCounter = 10;

function nextTestIP() {
  testIPCounter += 1;
  return `198.51.100.${testIPCounter}`;
}

function makeAuth(sendVerificationEmail) {
  return createAuth({
    database: memoryAdapter({ user: [], session: [], account: [], verification: [] }),
    secret,
    baseURL,
    trustedOrigins: [baseURL, "mindplus://"],
    disableSignUp: false,
    advanced: { ipAddress: { ipAddressHeaders: ["x-forwarded-for"] } },
    emailDelivery: {
      sendVerificationEmail,
      sendResetPassword: async () => {},
    },
  });
}

function signupRequest(email, ip = nextTestIP()) {
  return new Request(`${baseURL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: baseURL,
      "x-forwarded-for": ip,
    },
    body: JSON.stringify({ name: "Test User", email, password: "Synthetic-password-123!" }),
  });
}

function resendRequest(email, ip = nextTestIP()) {
  return new Request(`${baseURL}/api/auth/send-verification-email`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: baseURL,
      "x-forwarded-for": ip,
    },
    body: JSON.stringify({ email, callbackURL: "/verification-complete" }),
  });
}

function signinRequest(email, ip = nextTestIP()) {
  return new Request(`${baseURL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: baseURL,
      "x-forwarded-for": ip,
    },
    body: JSON.stringify({ email, password: "Synthetic-password-123!" }),
  });
}

function linkFromEmail(message) {
  const match = message.text.match(/https?:\/\/[^\s]+/);
  assert.ok(match, "verification link should be present in the text alternative");
  return new URL(match[0]);
}

test("verification template escapes user input and contains HTML plus plain text", () => {
  const message = createVerificationEmail({
    user: { name: "<img src=x onerror=alert(1)>", email: "user@example.test" },
    token: "synthetic-token",
    url: "http://localhost:3000/api/auth/verify-email?token=synthetic-token",
  }, "https://api-dev.example.test/api/auth/verify-email?token=synthetic-token");

  assert.equal(message.subject, "Confirme seu e-mail para acessar o MIND +");
  assert.match(message.html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(message.html, /<img src=x/);
  assert.match(message.html, /Verificar meu e-mail/);
  assert.match(message.text, /https:\/\/api-dev\.example\.test/);
});

test("Resend transport sends server-side credentials and ignores provider error bodies", async () => {
  let request;
  const transport = createResendTransport("resend-test-key", async (url, options) => {
    request = { url, options };
    return new Response(null, { status: 202 });
  });
  await transport.send({
    from: testFrom,
    to: "user@example.test",
    subject: "Verify",
    html: "<p>Verify</p>",
    text: "Verify",
  }, "verification-idempotency-key");

  assert.equal(request.url, "https://api.resend.com/emails");
  assert.equal(request.options.headers.Authorization, "Bearer resend-test-key");
  assert.equal(request.options.headers["Idempotency-Key"], "verification-idempotency-key");
  assert.equal(JSON.parse(request.options.body).from, testFrom);

  const failingTransport = createResendTransport("resend-test-key", async () =>
    new Response("provider response includes private recipient data", { status: 500 }));
  await assert.rejects(
    failingTransport.send({
      from: testFrom,
      to: "user@example.test",
      subject: "Verify",
      html: "<p>Verify</p>",
      text: "Verify",
    }, "failure-key"),
    (error) => {
      assert.ok(error instanceof EmailDeliveryError);
      assert.equal(error.message.includes("private recipient data"), false);
      return true;
    },
  );
});

test("verification sender refuses missing configuration and local public-mail URLs", async () => {
  const disabled = createVerificationEmailSender({ baseURL });
  await assert.rejects(disabled({
    user: { name: "Test", email: "user@example.test" },
    token: "synthetic-token",
    url: `${baseURL}/api/auth/verify-email?token=synthetic-token`,
  }), { code: "EMAIL_PROVIDER_NOT_CONFIGURED" });

  const publicTransport = createResendTransport("resend-test-key", async () => new Response(null, { status: 202 }));
  const localBaseSender = createVerificationEmailSender({
    apiKey: "resend-test-key",
    from: testFrom,
    baseURL,
    transport: publicTransport,
  });
  await assert.rejects(localBaseSender({
    user: { name: "Test", email: "user@example.test" },
    token: "synthetic-token",
    url: `${baseURL}/api/auth/verify-email?token=synthetic-token`,
  }), { code: "EMAIL_PROVIDER_NOT_CONFIGURED" });
});

test("Better Auth creates an unverified user, supports resend, verifies a valid token, then permits login", async () => {
  const sent = [];
  const sender = createVerificationEmailSender({
    apiKey: "test-provider-key",
    from: testFrom,
    baseURL,
    transport: {
      async send(message, idempotencyKey) {
        sent.push({ message, idempotencyKey });
      },
    },
  });
  const auth = makeAuth(sender);
  const email = `verify-${randomUUID()}@example.test`;
  const ip = nextTestIP();

  const signupResponse = await auth.handler(signupRequest(email, ip));
  assert.equal(signupResponse.status, 200);
  const signup = await signupResponse.json();
  assert.equal(signup.user.emailVerified, false);
  assert.equal(signupResponse.headers.getSetCookie().length, 0);
  assert.equal(sent.length, 1);

  const beforeVerification = await auth.handler(signinRequest(email, ip));
  assert.equal(beforeVerification.status, 403);

  const resendResponse = await auth.handler(resendRequest(email, ip));
  assert.equal(resendResponse.status, 200);
  assert.equal(sent.length, 2);

  const link = linkFromEmail(sent[1].message);
  assert.equal(link.searchParams.get("callbackURL"), `${baseURL}/verification-complete`);
  assert.equal(link.origin, baseURL);
  for (const delivery of sent) {
    const token = linkFromEmail(delivery.message).searchParams.get("token");
    assert.equal(delivery.idempotencyKey,
      `verification-${createHash("sha256").update(token).digest("hex")}`);
  }
  assert.equal(
    sent[0].idempotencyKey === sent[1].idempotencyKey,
    linkFromEmail(sent[0].message).searchParams.get("token") === link.searchParams.get("token"),
    "the provider idempotency keys should track whether Better Auth reused the active token",
  );

  const verified = await auth.handler(new Request(link, { headers: { "x-forwarded-for": ip } }));
  assert.equal(verified.status, 302);
  assert.equal(verified.headers.get("location"), `${baseURL}/verification-complete`);

  const afterVerification = await auth.handler(signinRequest(email, ip));
  assert.equal(afterVerification.status, 200);
});

test("invalid and expired verification links are rejected and do not verify the account", async () => {
  let capturedMessage;
  const sender = createVerificationEmailSender({
    apiKey: "test-provider-key",
    from: testFrom,
    baseURL,
    transport: { async send(message) { capturedMessage = message; } },
  });
  const auth = makeAuth(sender);
  const email = `expired-${randomUUID()}@example.test`;
  const ip = nextTestIP();
  const signup = await auth.handler(signupRequest(email, ip));
  assert.equal(signup.status, 200);
  const userId = (await signup.json()).user.id;
  const link = linkFromEmail(capturedMessage);

  const invalidLink = new URL(link);
  invalidLink.searchParams.set("token", "invalid-synthetic-token");
  const invalidResponse = await auth.handler(new Request(invalidLink, { headers: { "x-forwarded-for": ip } }));
  assert.equal(invalidResponse.status, 302);
  assert.equal(new URL(invalidResponse.headers.get("location")).searchParams.get("error"), "INVALID_TOKEN");

  const expiredToken = await createEmailVerificationToken(secret, email, undefined, -10, { userId });
  const expiredLink = new URL(link);
  expiredLink.searchParams.set("token", expiredToken);
  const expiredResponse = await auth.handler(new Request(expiredLink, { headers: { "x-forwarded-for": ip } }));
  assert.equal(expiredResponse.status, 302);
  assert.equal(new URL(expiredResponse.headers.get("location")).searchParams.get("error"), "TOKEN_EXPIRED");

  const signIn = await auth.handler(signinRequest(email, ip));
  assert.equal(signIn.status, 403);
});

test("verification resend is rate-limited and provider errors never include secrets", async () => {
  const failingSender = createVerificationEmailSender({
    apiKey: "test-provider-key",
    from: testFrom,
    baseURL,
    transport: {
      async send() {
        throw new Error("provider failure containing synthetic-private-token");
      },
    },
  });
  const auth = makeAuth(failingSender);
  const email = `failure-${randomUUID()}@example.test`;
  const ip = nextTestIP();
  const signupResponse = await auth.handler(signupRequest(email, ip));
  assert.equal(signupResponse.status, 200);

  const failureResponse = await auth.handler(resendRequest(email, ip));
  assert.ok(failureResponse.status >= 500);
  const failureBody = await failureResponse.text();
  assert.doesNotMatch(failureBody, /synthetic-private-token|provider failure/);

  const rateLimitedAuth = makeAuth(async () => {});
  const rateLimitedEmail = `rate-limit-${randomUUID()}@example.test`;
  const rateLimitedIP = nextTestIP();
  const rateLimitedSignup = await rateLimitedAuth.handler(signupRequest(rateLimitedEmail, rateLimitedIP));
  assert.equal(rateLimitedSignup.status, 200);
  const resendStatuses = [];
  for (let index = 0; index < 4; index += 1) {
    const response = await rateLimitedAuth.handler(resendRequest(rateLimitedEmail, rateLimitedIP));
    resendStatuses.push(response.status);
  }
  assert.deepEqual(resendStatuses, [200, 200, 200, 429]);
});

test("provider retries use a token-derived idempotency key without logging the token", async () => {
  let capturedKey;
  let capturedURL;
  const token = "synthetic-verification-token";
  const sender = createVerificationEmailSender({
    apiKey: "test-provider-key",
    from: testFrom,
    baseURL,
    transport: {
      async send(message, idempotencyKey) {
        capturedKey = idempotencyKey;
        capturedURL = linkFromEmail(message);
      },
    },
  });

  await sender({
    user: { name: "Test", email: "user@example.test" },
    token,
    url: `${baseURL}/api/auth/verify-email?token=${token}`,
  });
  assert.equal(capturedKey, `verification-${createHash("sha256").update(token).digest("hex")}`);
  assert.equal(capturedURL.searchParams.get("token"), token);
  assert.equal(capturedURL.searchParams.get("callbackURL"), `${baseURL}/verification-complete`);
});
