import { PrismaClient } from '@/generated/prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

// Singleton PrismaClient instance
// This ensures we only have one connection pool across the entire application
let prisma: PrismaClient

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
  // eslint-disable-next-line no-var
  var __pool: Pool | undefined
}

if (process.env.NODE_ENV === 'production') {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  prisma = new PrismaClient({ adapter })
} else {
  // In development, use a global variable to prevent multiple instances
  // during hot reload
  if (!global.__prisma) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL })
    global.__pool = pool
    const adapter = new PrismaPg(pool)
    global.__prisma = new PrismaClient({
      adapter,
      log: ['query', 'error', 'warn'],
    })
  }
  prisma = global.__prisma
}

export { prisma }

