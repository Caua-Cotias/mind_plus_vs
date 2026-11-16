import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { createServer } from "node:net";
import { dirname, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { healthCheckSchema } from "@mind-plus/contracts";
import "../src/lib/load-env.ts";
import { assertNeonDevelopmentTarget } from "./neon-development-safety.mjs";

const enabled = process.env.MIND_PLUS_RUN_NEON_AUTH_HTTP_INTEGRATION === "1";
const apiDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const nextCliPath = require.resolve("next/dist/bin/next");

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

async function reserveLoopbackPort() {
  const server = createServer();
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  requireCondition(address && typeof address === "object", "Could not reserve an isolated API port.");
  await new Promise((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
  return address.port;
}

async function startBuiltApiServer(baseURL) {
  const port = new URL(baseURL).port;
  const existingOrigins = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
    .split(",").map((origin) => origin.trim()).filter(Boolean);
  const trustedOrigins = [...new Set([...existingOrigins, baseURL])].join(",");
  const child = spawn(process.execPath, [nextCliPath, "start", "--hostname", "127.0.0.1", "--port", port], {
    cwd: apiDirectory,
    env: { ...process.env, NODE_ENV: "production", BETTER_AUTH_URL: baseURL, BETTER_AUTH_TRUSTED_ORIGINS: trustedOrigins },
    stdio: "ignore",
    windowsHide: true,
  });
  let spawnFailed = false;
  child.once("error", () => { spawnFailed = true; });
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (spawnFailed || child.pid === undefined || child.exitCode !== null) {
      throw new Error("HTTP integration server exited before becoming ready; build the API and check local configuration.");
    }
    try {
      const response = await fetch(`${baseURL}/api/health`, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) return child;
    } catch {
      // Next.js may refuse connections while starting.
    }
    await delay(250);
  }
  child.kill();
  throw new Error("HTTP integration server did not become ready within 60 seconds.");
}

async function stopServer(child) {
  if (!child || child.exitCode !== null) return;
  const exitPromise = new Promise((resolveExit) => child.once("exit", resolveExit));
  child.kill();
  await Promise.race([exitPromise, delay(5_000)]);
}

function authPost(baseURL, path, body = {}, origin = baseURL) {
  return fetch(`${baseURL}/api/auth${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(body),
    redirect: "manual",
  });
}

test("HTTP API keeps login available and rejects archived email-dependent flows without Neon writes", {
  skip: !enabled,
  timeout: 180_000,
}, async () => {
  await assertNeonDevelopmentTarget();
  requireCondition(process.env.BETTER_AUTH_SECRET, "HTTP integration test stopped: auth secret is unavailable.");
  requireCondition(process.env.NODE_ENV !== "production" && process.env.VERCEL_ENV !== "production",
    "HTTP integration test stopped: it cannot run in a production deployment.");

  const testEmail = `mindplus-disabled-${randomUUID()}@example.test`;
  const baseURL = `http://127.0.0.1:${await reserveLoopbackPort()}`;
  const { prisma } = await import("@mind-plus/database");
  let server;

  try {
    assert.equal(await prisma.user.findUnique({ where: { email: testEmail }, select: { id: true } }), null);
    server = await startBuiltApiServer(baseURL);

    const healthResponse = await fetch(`${baseURL}/api/health`);
    assert.equal(healthResponse.status, 200);
    assert.equal(healthCheckSchema.parse(await healthResponse.json()).status, "ok");

    const allowedPreflight = await fetch(`${baseURL}/api/auth/sign-in/email`, {
      method: "OPTIONS",
      headers: { origin: baseURL, "access-control-request-method": "POST", "access-control-request-headers": "content-type" },
    });
    assert.equal(allowedPreflight.status, 204);
    assert.equal(allowedPreflight.headers.get("access-control-allow-origin"), baseURL);
    assert.equal(allowedPreflight.headers.get("access-control-allow-credentials"), "true");

    const rejectedPreflight = await fetch(`${baseURL}/api/auth/sign-in/email`, {
      method: "OPTIONS",
      headers: { origin: "https://untrusted.example", "access-control-request-method": "POST" },
    });
    assert.equal(rejectedPreflight.status, 403);

    const anonymousSession = await fetch(`${baseURL}/api/auth/get-session`);
    assert.equal(anonymousSession.status, 200);
    assert.equal(await anonymousSession.json(), null);

    const signup = await authPost(baseURL, "/sign-up/email", {
      name: "MIND+ suspended registration test",
      email: testEmail,
      password: "Synthetic-only-password-123!",
    });
    assert.ok(signup.status >= 400 && signup.status < 500);
    assert.equal(await prisma.user.findUnique({ where: { email: testEmail }, select: { id: true } }), null);

    for (const path of ["/send-verification-email", "/request-password-reset", "/reset-password"]) {
      const response = await authPost(baseURL, path, { email: testEmail });
      assert.equal(response.status, 410);
      assert.equal((await response.json()).code, "EMAIL_FLOWS_ARCHIVED");
    }

    assert.equal(await prisma.user.findUnique({ where: { email: testEmail }, select: { id: true } }), null);
  } finally {
    await stopServer(server);
    await prisma.$disconnect();
  }
});
