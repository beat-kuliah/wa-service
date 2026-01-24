# Backend API Implementation Guide

Dashboard frontend ini membutuhkan beberapa API endpoints di backend wa-service. Dokumentasi ini berisi contoh implementasi lengkap untuk semua endpoint yang diperlukan.

## Prerequisites

Backend wa-service harus memiliki:
- Prisma setup dengan schema yang sama (termasuk model `Admin` dengan field `role`)
- JWT library untuk token generation (contoh: `jsonwebtoken`)
- bcrypt untuk password hashing
- Middleware untuk authentication

## Required Endpoints

### 1. POST /api/admin/login

Endpoint untuk admin login. Menerima username dan password, mengembalikan JWT token.

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "admin": {
      "id": "uuid",
      "username": "admin",
      "email": "admin@example.com",
      "role": "SUPER_ADMIN"
    }
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

**Contoh Implementasi:**

```typescript
// app/api/admin/login/route.ts (Next.js App Router)
// atau app/api/admin/login.ts (Next.js Pages Router)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma' // atau path ke prisma client Anda
import * as bcrypt from 'bcrypt'
import * as jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Username and password are required' },
        { status: 400 }
      )
    }

    // Find admin by username
    const admin = await prisma.admin.findUnique({
      where: { username },
    })

    if (!admin) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Check if admin is active
    if (!admin.isActive) {
      return NextResponse.json(
        { success: false, message: 'Account is deactivated' },
        { status: 403 }
      )
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password)
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: admin.id,
        username: admin.username,
        role: admin.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          role: admin.role,
        },
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**Untuk Express.js:**

```typescript
// routes/admin/auth.ts
import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import * as bcrypt from 'bcrypt'
import * as jwt from 'jsonwebtoken'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required',
      })
    }

    const admin = await prisma.admin.findUnique({
      where: { username },
    })

    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      })
    }

    const isValidPassword = await bcrypt.compare(password, admin.password)
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      })
    }

    const token = jwt.sign(
      {
        id: admin.id,
        username: admin.username,
        role: admin.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          role: admin.role,
        },
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

export default router
```

## Authentication Middleware

Setelah login, semua request ke admin endpoints harus include JWT token di header `Authorization: Bearer <token>`.

**Contoh Middleware untuk Next.js:**

```typescript
// lib/middleware.ts atau middleware/auth.ts
import { NextRequest } from 'next/server'
import * as jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export interface AdminPayload {
  id: string
  username: string
  role: 'SUPER_ADMIN' | 'ADMIN'
}

export function getAdminFromRequest(request: NextRequest): {
  valid: boolean
  admin?: AdminPayload
  error?: string
} {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { valid: false, error: 'No token provided' }
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, JWT_SECRET) as AdminPayload

    return {
      valid: true,
      admin: decoded,
    }
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid or expired token',
    }
  }
}
```

**Contoh Middleware untuk Express.js:**

```typescript
// middleware/auth.ts
import { Request, Response, NextFunction } from 'express'
import * as jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export interface AdminPayload {
  id: string
  username: string
  role: 'SUPER_ADMIN' | 'ADMIN'
}

declare global {
  namespace Express {
    interface Request {
      admin?: AdminPayload
    }
  }
}

export function authenticateAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, JWT_SECRET) as AdminPayload

    req.admin = decoded
    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    })
  }
}

export function requireSuperAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.admin?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Super admin access required',
    })
  }
  next()
}
```

## Environment Variables

Tambahkan ke `.env` di backend wa-service:

```env
JWT_SECRET=your-very-secure-secret-key-change-this-in-production
JWT_EXPIRES_IN=7d
DATABASE_URL=postgresql://user:password@localhost:5432/wa_service?schema=public
```

## Testing

Setelah implementasi, test dengan:

```bash
# Test login
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "admin": {
      "id": "...",
      "username": "admin",
      "email": "admin@example.com",
      "role": "SUPER_ADMIN"
    }
  }
}
```

## Next Steps

Setelah endpoint login berhasil, implementasikan endpoint lainnya:
- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/admins` - Get all admins (lihat `USER_MANAGEMENT.md`)
- `POST /api/admin/admins` - Create admin
- dll (lihat `USER_MANAGEMENT.md` untuk detail lengkap)

## Troubleshooting

### 404 Error
- Pastikan route file ada di lokasi yang benar
- Check Next.js routing: `app/api/admin/login/route.ts` untuk App Router
- Check Express routing: pastikan route sudah di-register

### 401 Unauthorized
- Check JWT_SECRET sudah di-set
- Pastikan token di-generate dengan secret yang sama
- Check token expiration

### 500 Internal Server Error
- Check database connection
- Check Prisma client sudah di-generate
- Check bcrypt dan jwt packages sudah terinstall
- Check console logs untuk error details
