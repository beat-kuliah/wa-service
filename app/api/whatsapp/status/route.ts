import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { getWhatsAppStatus } from '@/lib/whatsapp'
// Initialize WhatsApp when this route is accessed
import '@/lib/whatsapp-init'

// GET /api/whatsapp/status - Get WhatsApp connection status
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

    console.log('📱 WhatsApp status requested by:', auth.user.username)

    // Get status from local WhatsApp service
    const whatsappStatus = getWhatsAppStatus()
    
    // Remove qrCode from response (it's only needed in /qr endpoint)
    const { qrCode, ...statusResponse } = whatsappStatus

    console.log('✅ WhatsApp status retrieved:', statusResponse)

    return NextResponse.json({
      success: true,
      data: statusResponse,
    })
  } catch (error: any) {
    console.error('❌ WhatsApp status error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to get WhatsApp status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}
