import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Configure timeouts & pool settings
  log: ["query", "info", "warn", "error"],
  errorFormat: "pretty",
});
