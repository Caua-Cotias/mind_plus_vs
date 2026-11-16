import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import "../src/lib/load-env.ts";
import { assertNeonDevelopmentTarget } from "./neon-development-safety.mjs";

const enabled = process.env.MIND_PLUS_RUN_NEON_AUTH_INTEGRATION === "1";

test("Better Auth rejects registration without writing to Neon development", {
  skip: !enabled,
}, async () => {
  await assertNeonDevelopmentTarget();

  const baseURL = process.env.BETTER_AUTH_URL;
  assert.ok(baseURL, "Integration test stopped: BETTER_AUTH_URL is missing.");
  const testEmail = `mindplus-disabled-${randomUUID()}@example.test`;
  const { prisma } = await import("@mind-plus/database");

  try {
    const { createAuth } = await import("../src/lib/auth.ts");
    const auth = createAuth();
    const before = await prisma.user.findUnique({ where: { email: testEmail }, select: { id: true } });
    assert.equal(before, null);

    const response = await auth.handler(new Request(`${baseURL}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: new URL(baseURL).origin },
      body: JSON.stringify({
        name: "MIND+ suspended registration test",
        email: testEmail,
        password: "Synthetic-only-password-123!",
      }),
    }));

    assert.ok(response.status >= 400 && response.status < 500);
    const after = await prisma.user.findUnique({ where: { email: testEmail }, select: { id: true } });
    assert.equal(after, null);
  } finally {
    await prisma.$disconnect();
  }
});
