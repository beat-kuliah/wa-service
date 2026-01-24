import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { generateQRCode, getWhatsAppStatus } from '@/lib/whatsapp'
// Initialize WhatsApp when this route is accessed
import '@/lib/whatsapp-init'

// GET /api/whatsapp/qr - Get WhatsApp QR code
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

    console.log('📱 WhatsApp QR code requested by:', auth.user.username)

    // Check current status
    const status = getWhatsAppStatus()
    
    // If QR code already exists and not expired, return it
    if (status.qrCode && status.hasQR) {
      console.log('✅ Returning existing QR code')
      console.log('   QR code length:', status.qrCode.length)
      console.log('   QR code format:', status.qrCode.substring(0, 30))
      return NextResponse.json({
        success: true,
        data: {
          qrCode: status.qrCode,
          expiresIn: status.qrExpiresAt 
            ? Math.max(0, Math.floor((status.qrExpiresAt.getTime() - Date.now()) / 1000))
            : 60,
        },
      })
    }

    // Generate new QR code
    console.log('🔄 Generating new QR code...')
    const qrData = await generateQRCode()
    
    console.log('✅ QR Code generated:', {
      qrCodeLength: qrData.qrCode.length,
      qrCodeFormat: qrData.qrCode.substring(0, 30),
      expiresIn: qrData.expiresIn
    })

    return NextResponse.json({
      success: true,
      data: qrData,
    })
  } catch (error: any) {
    console.error('❌ WhatsApp QR error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to get QR code',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}
