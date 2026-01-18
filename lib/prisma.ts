import { PrismaClient } from '@prisma/client'

// Singleton PrismaClient instance
// This ensures we only have one connection pool across the entire application
let prisma: PrismaClient

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
  })
} else {
  // In development, use a global variable to prevent multiple instances
  // during hot reload
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      datasourceUrl: process.env.DATABASE_URL,
      log: ['query', 'error', 'warn'],
    })
  }
  prisma = global.__prisma
}

export { prisma }

