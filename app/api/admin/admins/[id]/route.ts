import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'
import * as bcrypt from 'bcrypt'

// GET /api/admin/admins/:id - Get admin by ID
export async function GET(
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

    // Only SUPER_ADMIN can view admin details
    if (auth.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Only SUPER_ADMIN can view admin details' },
        { status: 403 }
      )
    }

    const { id } = params

    const admin = await prisma.admin.findUnique({
      where: { id },
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

    if (!admin) {
      return NextResponse.json(
        { success: false, message: 'Admin not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: admin,
    })
  } catch (error: any) {
    console.error('❌ Get admin error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch admin',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}

// PUT /api/admin/admins/:id - Update admin
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

    // Only SUPER_ADMIN can update admin
    if (auth.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Only SUPER_ADMIN can update admins' },
        { status: 403 }
      )
    }

    const { id } = params
    const body = await request.json()
    const { username, email, role, isActive } = body

    console.log('✏️ Updating admin:', { id, username, email, role, isActive })

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

    // If username is being changed, check if new username is available
    if (username && username !== existing.username) {
      const usernameExists = await prisma.admin.findUnique({
        where: { username },
      })

      if (usernameExists) {
        return NextResponse.json(
          { success: false, message: 'Username already exists' },
          { status: 400 }
        )
      }
    }

    // Update admin
    const updatedAdmin = await prisma.admin.update({
      where: { id },
      data: {
        ...(username && { username }),
        ...(email !== undefined && { email: email || null }),
        ...(role && { role }),
        ...(isActive !== undefined && { isActive }),
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

    console.log('✅ Admin updated:', updatedAdmin.username)

    return NextResponse.json({
      success: true,
      message: 'Admin updated successfully',
      data: updatedAdmin,
    })
  } catch (error: any) {
    console.error('❌ Update admin error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to update admin',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/admins/:id - Delete admin
export async function DELETE(
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

    // Only SUPER_ADMIN can delete admin
    if (auth.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Only SUPER_ADMIN can delete admins' },
        { status: 403 }
      )
    }

    const { id } = params

    console.log('🗑️ Deleting admin:', id)

    // Prevent deleting yourself
    if (id === auth.user.id) {
      return NextResponse.json(
        { success: false, message: 'Cannot delete your own account' },
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

    // Delete admin
    await prisma.admin.delete({
      where: { id },
    })

    console.log('✅ Admin deleted:', existing.username)

    return NextResponse.json({
      success: true,
      message: 'Admin deleted successfully',
    })
  } catch (error: any) {
    console.error('❌ Delete admin error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to delete admin',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}
