import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'
import * as bcrypt from 'bcrypt'

// PUT /api/admin/admins/:id/password - Update admin password
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const auth = await verifyAuth(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only SUPER_ADMIN can update passwords
    if (auth.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Only SUPER_ADMIN can update passwords' },
        { status: 403 }
      )
    }

    const { id } = params
    const body = await request.json()
    const { password } = body

    console.log('🔐 Updating password for admin:', id)

    // Validate input
    if (!password) {
      return NextResponse.json(
        { success: false, message: 'Password is required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Check if admin exists
    const existing = await prisma.admin.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Admin not found' },
        { status: 404 }
      )
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Update password
    await prisma.admin.update({
      where: { id },
      data: {
        password: hashedPassword,
      },
    })

    console.log('✅ Password updated for admin:', existing.username)

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
    })
  } catch (error: any) {
    console.error('❌ Update password error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to update password',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}
