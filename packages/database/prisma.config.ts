import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "prisma/config";

const packageDirectory = dirname(fileURLToPath(import.meta.url));
const monorepoEnvFile = resolve(packageDirectory, "../../.env.local");

// Load the ignored monorepo-root env file without copying connection strings.
config({ path: monorepoEnvFile });

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // An empty URL makes database operations fail closed when the environment
    // has not supplied the direct connection string, without storing a URL.
    url: process.env.DATABASE_URL_UNPOOLED ?? "",
  },
});
