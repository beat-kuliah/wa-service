# User Management Guide

## Konsep: Admin-Managed Users (Tanpa Public Registration)

Sistem ini menggunakan pendekatan **admin-managed users** dimana:
- ❌ **TIDAK ada public registration** - user tidak bisa register sendiri
- ✅ **Super Admin membuat user baru** - hanya admin yang berwenang bisa menambahkan user
- ✅ **Kontrol akses lebih ketat** - cocok untuk layanan B2B/internal

## Setup Awal

### 1. Buat Super Admin Pertama

Super admin pertama harus dibuat secara manual melalui:
- Database seed script, atau
- Backend API endpoint khusus untuk setup awal

**Contoh seed script** (untuk backend wa-service):

```typescript
// prisma/seed.ts atau scripts/create-super-admin.ts
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10)
  
  await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      email: 'admin@example.com',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  })
  
  console.log('Super admin created: admin / admin123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

### 2. Backend API Endpoints yang Diperlukan

Dashboard frontend membutuhkan endpoint berikut di backend wa-service:

```
GET    /api/admin/admins          - Get all admins
GET    /api/admin/admins/:id      - Get admin by ID
POST   /api/admin/admins           - Create new admin
PUT    /api/admin/admins/:id       - Update admin
PUT    /api/admin/admins/:id/password - Update password
DELETE /api/admin/admins/:id      - Delete admin
```

**Contoh implementasi** (untuk backend):

```typescript
// app/api/admin/admins/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminFromRequest } from '@/lib/middleware'
import * as bcrypt from 'bcrypt'

// GET /api/admin/admins
export async function GET(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request)
    
    // Hanya SUPER_ADMIN yang bisa melihat semua admins
    if (admin.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      )
    }

    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: admins,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch admins' },
      { status: 500 }
    )
  }
}

// POST /api/admin/admins
export async function POST(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request)
    
    // Hanya SUPER_ADMIN yang bisa create admin
    if (admin.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { username, password, email, role } = body

    // Validate
    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Username and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Check if username exists
    const existing = await prisma.admin.findUnique({
      where: { username },
    })

    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Username already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create admin
    const newAdmin = await prisma.admin.create({
      data: {
        username,
        password: hashedPassword,
        email: email || null,
        role: role || 'ADMIN',
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: newAdmin,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to create admin' },
      { status: 500 }
    )
  }
}
```

## Role & Permissions

### SUPER_ADMIN
- ✅ Bisa melihat semua admins
- ✅ Bisa create, update, delete admin
- ✅ Bisa mengubah role admin lain
- ✅ Full access ke semua fitur

### ADMIN
- ❌ Tidak bisa akses halaman Users Management
- ✅ Bisa akses fitur lain (Messages, Chats, Templates, dll)

## Workflow

1. **Setup Awal**: Buat super admin pertama via seed script
2. **Login**: Super admin login ke dashboard
3. **Add Users**: Super admin buka halaman `/users` dan tambah admin baru
4. **Manage Users**: Super admin bisa edit, deactivate, atau delete user

## Security Best Practices

1. **Password Policy**: Minimum 6 karakter (bisa ditambah validasi lebih ketat)
2. **Role-based Access**: Hanya SUPER_ADMIN yang bisa manage users
3. **Password Hashing**: Gunakan bcrypt dengan salt rounds >= 10
4. **Token Expiration**: Implement JWT token expiration di backend
5. **Rate Limiting**: Tambahkan rate limiting untuk login endpoint

## Migration Database

Setelah update schema Prisma, jalankan migration:

```bash
# Generate Prisma client
npm run prisma:generate

# Create migration
npx prisma migrate dev --name add_admin_role

# Atau push langsung (untuk development)
npm run prisma:push
```

## Notes

- Frontend dashboard sudah siap dengan halaman User Management
- Backend API endpoints perlu diimplementasikan di wa-service
- Pastikan middleware authentication sudah handle role checking
- Super admin pertama harus dibuat manual (tidak bisa via UI)
