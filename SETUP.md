# Setup Guide - WA Service Dashboard

## Quick Start

1. **Install Dependencies**
   ```bash
   cd wa-service-new
   npm install
   ```

2. **Setup Environment Variables**
   Buat file `.env.local` di root folder (copy dari `.env.local.example`):
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3000/api
   NEXT_PUBLIC_API_KEY=your-api-key-here
   
   # Optional: Database URL (hanya jika ingin menggunakan Prisma untuk development/testing)
   # DATABASE_URL="postgresql://user:password@localhost:5432/wa_service?schema=public"
   ```
   
   **Note:** 
   - `DATABASE_URL` hanya diperlukan jika Anda ingin menjalankan Prisma migrations/push di dashboard ini
   - Jika database ada di backend wa-service, Anda tidak perlu set `DATABASE_URL` di dashboard
   - Untuk generate Prisma client saja, `DATABASE_URL` tidak diperlukan

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Access Dashboard**
   - Buka browser: `http://localhost:3001` (atau port yang ditampilkan)
   - Login dengan credentials admin dari wa-service

## Prerequisites

- WA Service API harus sudah running di `http://localhost:3000` (atau sesuaikan dengan `NEXT_PUBLIC_API_URL`)
- Admin user sudah dibuat di wa-service (gunakan script `create-admin.ts`)

## Database Setup (Optional)

Jika Anda ingin menggunakan Prisma untuk development/testing di dashboard ini:

1. **Setup Database URL** di `.env.local`:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/wa_service?schema=public"
   ```

2. **Generate Prisma Client** (tidak perlu DATABASE_URL):
   ```bash
   npm run prisma:generate
   ```

3. **Run Migration** (perlu DATABASE_URL):
   ```bash
   npm run prisma:migrate
   # atau untuk development langsung push
   npm run prisma:push
   ```

4. **Create Super Admin** (setelah migration):
   ```bash
   npm run prisma:seed
   ```
   
   Lihat `SETUP_ADMIN.md` untuk detail lengkap tentang setup admin pertama.

**Note:** Jika database hanya ada di backend wa-service, Anda tidak perlu setup `DATABASE_URL` di dashboard. Prisma schema di dashboard hanya untuk reference/type checking.

## Optional: Create Admin Messages Endpoint

Jika halaman Messages tidak menampilkan data, Anda perlu membuat endpoint `/api/admin/messages` di wa-service:

```typescript
// wa-service/app/api/admin/messages/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/src/utils/prisma'
import { getAdminFromRequest, createErrorResponse, createUnauthorizedResponse } from '@/src/lib/middleware'

export async function GET(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request)
    if (!admin.valid) {
      return createUnauthorizedResponse(admin.error || 'Unauthorized')
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const status = searchParams.get('status')

    const skip = (page - 1) * limit

    const where: any = {}
    if (status && status !== 'all') {
      where.status = status
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.message.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        messages,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : 'Unknown error',
      500
    )
  }
}
```

## Troubleshooting

### Port Already in Use
Jika port 3000 atau 3001 sudah digunakan:
- Ubah port di `.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:3002/api`
- Atau gunakan port lain untuk dashboard dengan mengubah di `package.json` script

### CORS Errors
Jika mendapat CORS error, pastikan wa-service mengizinkan request dari dashboard domain. Tambahkan di `next.config.js` wa-service:

```javascript
headers: async () => [
  {
    source: '/api/:path*',
    headers: [
      { key: 'Access-Control-Allow-Origin', value: 'http://localhost:3001' },
      { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
      { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-API-Key' },
    ],
  },
],
```

### Authentication Issues
- Pastikan token disimpan dengan benar di localStorage
- Check browser console untuk error details
- Pastikan endpoint `/admin/login` mengembalikan token
