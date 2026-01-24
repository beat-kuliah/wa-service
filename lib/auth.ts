import { NextRequest } from 'next/server'
import * as jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export interface AuthUser {
  id: string
  username: string
  role: 'SUPER_ADMIN' | 'ADMIN'
}

export async function verifyAuth(request: NextRequest): Promise<{ user: AuthUser } | null> {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any
      
      // Verify admin still exists and is active
      const admin = await prisma.admin.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          username: true,
          role: true,
          isActive: true,
        },
      })

      if (!admin || !admin.isActive) {
        return null
      }

      return {
        user: {
          id: admin.id,
          username: admin.username,
          role: admin.role,
        },
      }
    } catch (error) {
      // Token invalid or expired
      return null
    }
  } catch (error) {
    return null
  }
}
