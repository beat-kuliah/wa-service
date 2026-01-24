import { PrismaClient } from '../generated/prisma/client.js'
import * as bcrypt from 'bcrypt'
import { config } from 'dotenv'
import { resolve } from 'path'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') })

// Check if DATABASE_URL is set
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('❌ Error: DATABASE_URL is required in .env.local')
  console.error('Please set DATABASE_URL in your .env.local file')
  process.exit(1)
}

// Prisma v7: Use adapter with connection pool
const pool = new Pool({ connectionString: databaseUrl })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Starting seed...')

  // Default super admin credentials
  const defaultUsername = process.env.SEED_ADMIN_USERNAME || 'admin'
  const defaultPassword = process.env.SEED_ADMIN_PASSWORD || 'admin123'
  const defaultEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com'

  // Hash password
  const hashedPassword = await bcrypt.hash(defaultPassword, 10)

  // Create or update super admin
  const admin = await prisma.admin.upsert({
    where: { username: defaultUsername },
    update: {
      // Only update if password is provided via env
      ...(process.env.SEED_ADMIN_PASSWORD && {
        password: hashedPassword,
      }),
      email: defaultEmail,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
    create: {
      username: defaultUsername,
      password: hashedPassword,
      email: defaultEmail,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  })

  console.log('✅ Super admin created/updated successfully!')
  console.log('📋 Credentials:')
  console.log(`   Username: ${admin.username}`)
  console.log(`   Email: ${admin.email}`)
  console.log(`   Role: ${admin.role}`)
  console.log(`   Password: ${defaultPassword}`)
  console.log('')
  console.log('⚠️  IMPORTANT: Change the default password after first login!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
