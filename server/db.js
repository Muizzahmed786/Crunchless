import { PrismaClient } from "@prisma/client";

// Global singleton pattern to prevent multiple connections in dev HMR
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export async function checkDatabaseConnection() {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    return { connected: true };
  } catch (error) {
    return { connected: false, error: error.message };
  }
}

