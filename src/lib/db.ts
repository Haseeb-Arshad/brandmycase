import { PrismaClient } from "@prisma/client";

/**
 * A single PrismaClient per process.
 *
 * Next's dev server hot-reloads modules on every edit; without this cache each
 * reload would open a new connection pool until SQLite runs out of handles.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/** Bid states that count as a live claim on a panel. */
export const LIVE_BID_STATUSES = ["DEPOSIT_PAID", "WON"] as const;

export type BidStatus =
  | "PENDING"
  | "DEPOSIT_PAID"
  | "OUTBID"
  | "WON"
  | "REFUNDED"
  | "REJECTED";
