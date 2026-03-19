import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { env } from "@/lib/env.server"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
