// src/lib/db.ts
import "server-only";

import { PrismaClient } from "@prisma/client";

declare global {
  var __urdatlas_prisma__: PrismaClient | undefined;
}

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const db = globalThis.__urdatlas_prisma__ ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__urdatlas_prisma__ = db;
}

export default db;