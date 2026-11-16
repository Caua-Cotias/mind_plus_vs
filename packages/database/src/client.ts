import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "./generated/prisma/client.js";

declare global {
  var mindPlusPrismaClient: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL must be set before using the database package.");
  }

  const adapter = new PrismaNeon({ connectionString });

  return new PrismaClient({ adapter });
}

export const prisma = globalThis.mindPlusPrismaClient ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.mindPlusPrismaClient = prisma;
}

export { PrismaClient };
