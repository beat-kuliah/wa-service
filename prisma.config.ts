import { config } from 'dotenv'
import { resolve } from 'path'
import { defineConfig, env } from 'prisma/config'

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') })

// For Prisma generate, DATABASE_URL is optional (uses dummy value if not set)
// For migrations/push, DATABASE_URL must be set in .env.local
// Using env() from prisma/config which reads from process.env
const databaseUrl = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/dummy?schema=public'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: databaseUrl,
  },
})
