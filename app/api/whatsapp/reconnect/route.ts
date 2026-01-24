import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { reconnectWhatsApp } from '@/lib/whatsapp'
// Note: WhatsApp initialization is handled by instrumentation.ts on server startup
// reconnectWhatsApp will handle reinitialization as needed

// POST /api/whatsapp/reconnect - Reconnect WhatsApp
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

    console.log('🔄 WhatsApp reconnect requested by:', auth.user.username)

    // Reconnect WhatsApp and get new QR code
    const qrData = await reconnectWhatsApp()

    console.log('✅ WhatsApp reconnection initiated')

    return NextResponse.json({
      success: true,
      message: 'WhatsApp reconnection initiated',
      data: qrData,
    })
  } catch (error: any) {
    console.error('❌ WhatsApp reconnect error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to reconnect WhatsApp',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}
