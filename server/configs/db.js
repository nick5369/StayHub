// configs/db.js
//
// Prisma Client singleton — replaces the old Mongoose connectDB() function.
//
// Prisma opens the connection pool lazily on the first query, so no explicit
// "connect" call is needed. In development, Next.js / nodemon hot-reloads
// can create multiple PrismaClient instances and exhaust DB connections;
// the global singleton pattern below prevents that.

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
});

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

export default prisma;