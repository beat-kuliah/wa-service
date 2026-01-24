import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'
import * as bcrypt from 'bcrypt'

// GET /api/admin/admins - Get all admins
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await verifyAuth(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only SUPER_ADMIN can view all admins
    if (auth.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Only SUPER_ADMIN can view all admins' },
        { status: 403 }
      )
    }

    console.log('📋 Admins list requested by:', auth.user.username)

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

    console.log(`✅ Retrieved ${admins.length} admins`)

    return NextResponse.json({
      success: true,
      data: admins,
    })
  } catch (error: any) {
    console.error('❌ Get admins error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch admins',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}

// POST /api/admin/admins - Create new admin
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await verifyAuth(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only SUPER_ADMIN can create admin
    if (auth.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Only SUPER_ADMIN can create admins' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { username, password, email, role } = body

    console.log('➕ Creating admin:', { username, email, role })

    // Validate input
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

    // Check if username already exists
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

    console.log('✅ Admin created:', newAdmin.username)

    return NextResponse.json({
      success: true,
      message: 'Admin created successfully',
      data: newAdmin,
    })
  } catch (error: any) {
    console.error('❌ Create admin error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to create admin',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}
