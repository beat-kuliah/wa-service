import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'

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

    console.log('📊 Dashboard stats requested by:', auth.user.username)

    // Get message statistics
    const [
      pendingMessages,
      queuedMessages,
      sentMessages,
      failedMessages,
      totalChats,
      unreadChats,
    ] = await Promise.all([
      prisma.message.count({ where: { status: 'PENDING' } }),
      prisma.message.count({ where: { status: 'QUEUED' } }),
      prisma.message.count({ where: { status: 'SENT' } }),
      prisma.message.count({ where: { status: 'FAILED' } }),
      prisma.chat.count(),
      prisma.chat.count({ where: { isRead: false } }),
    ])

    // Calculate active chats (chats with messages in last 24 hours)
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)
    
    const activeChats = await prisma.chat.count({
      where: {
        updatedAt: {
          gte: oneDayAgo,
        },
      },
    })

    // For archived chats, we'll use a simple heuristic:
    // Chats that haven't been updated in the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const archivedChats = await prisma.chat.count({
      where: {
        updatedAt: {
          lt: thirtyDaysAgo,
        },
      },
    })

    // WhatsApp status - try to get from WhatsApp service API
    // If the backend has a WhatsApp service running, you can call it here
    // For now, we'll return a default status
    let whatsappStatus = {
      connected: false,
      state: 'DISCONNECTED',
      hasQR: false,
    }

    // Try to get WhatsApp status from backend WhatsApp service
    // This assumes your backend wa-service has a /whatsapp/status endpoint
    // Uncomment and adjust if you have a WhatsApp service API
    /*
    try {
      const whatsappApiUrl = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3000'
      const response = await fetch(`${whatsappApiUrl}/whatsapp/status`, {
        headers: {
          'X-API-Key': process.env.WHATSAPP_API_KEY || '',
        },
      })
      if (response.ok) {
        const data = await response.json()
        whatsappStatus = {
          connected: data.data?.connected || false,
          state: data.data?.state || 'DISCONNECTED',
          hasQR: data.data?.hasQR || false,
        }
      }
    } catch (error) {
      console.warn('Could not fetch WhatsApp status:', error)
      // Keep default status
    }
    */

    const stats = {
      chats: {
        total: totalChats,
        unread: unreadChats,
        active: activeChats,
        archived: archivedChats,
      },
      messages: {
        pending: pendingMessages,
        queued: queuedMessages,
        sent: sentMessages,
        failed: failedMessages,
      },
      whatsapp: whatsappStatus,
    }

    console.log('✅ Dashboard stats retrieved successfully')

    return NextResponse.json({
      success: true,
      data: stats,
    })
  } catch (error: any) {
    console.error('❌ Dashboard error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to load dashboard statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}
