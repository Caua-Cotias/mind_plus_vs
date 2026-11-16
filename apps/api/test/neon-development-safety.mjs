import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const expectedProjectId = "damp-water-72026745";
const expectedBranch = "development";
const rootNeonConfigPath = new URL("../../../.neon", import.meta.url);

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function resolveBranchHost(projectId, pooled) {
  let output;
  try {
    const args = `neon.cmd connection-string ${expectedBranch} --project-id ${projectId}${pooled ? " --pooled" : ""}`;
    output = execFileSync("cmd.exe", ["/d", "/s", "/c", args], {
      encoding: "utf8",
      windowsHide: true,
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    throw new Error("Integration test stopped: unable to verify the Neon development endpoint.");
  }

  const connectionLine = output.split(/\r?\n/).find((line) => /^\s*postgres(?:ql)?:\/\//i.test(line));
  requireCondition(connectionLine, "Integration test stopped: Neon did not return the expected endpoint.");

  try {
    return new URL(connectionLine.trim()).hostname.toLowerCase();
  } catch {
    throw new Error("Integration test stopped: Neon returned an invalid development endpoint.");
  }
}

function connectionHost(value) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export async function assertNeonDevelopmentTarget() {
  requireCondition(process.platform === "win32",
    "Integration test stopped: the Neon safety guard requires the approved Windows CLI context.");
  requireCondition(process.env.NODE_ENV !== "production" && process.env.VERCEL_ENV !== "production",
    "Integration test stopped: database integration tests cannot run in a production deployment.");
  requireCondition(process.env.NEON_BRANCH === expectedBranch,
    "Integration test stopped: NEON_BRANCH is not the approved development branch.");

  let neonConfig;
  try {
    neonConfig = JSON.parse(await readFile(rootNeonConfigPath, "utf8"));
  } catch {
    throw new Error("Integration test stopped: the local Neon project/branch configuration is unavailable.");
  }

  requireCondition(
    neonConfig.projectId === expectedProjectId && neonConfig.branch === expectedBranch,
    "Integration test stopped: the local Neon project/branch pointer is not the approved development target.",
  );

  const directHost = resolveBranchHost(neonConfig.projectId, false);
  const pooledHost = resolveBranchHost(neonConfig.projectId, true);
  requireCondition(
    connectionHost(process.env.DATABASE_URL_UNPOOLED ?? "") === directHost &&
      connectionHost(process.env.DATABASE_URL ?? "") === pooledHost,
    "Integration test stopped: database URLs do not match the Neon development endpoints.",
  );

}
