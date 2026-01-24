import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { generateQRCode, getWhatsAppStatus, getWhatsAppSocket } from '@/lib/whatsapp'
// Note: WhatsApp initialization is handled by instrumentation.ts on server startup
// generateQRCode will handle initialization if needed

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

    // Check current status (this will sync state with actual socket)
    const status = getWhatsAppStatus()
    const socket = getWhatsAppSocket()
    
    console.log('📊 Current WhatsApp status:', {
      connected: status.connected,
      state: status.state,
      hasQR: status.hasQR,
      hasSocket: !!socket,
    })
    
    // If WhatsApp is already connected, return error (don't try to generate QR)
    if (status.connected) {
      console.log('⚠️ WhatsApp is already connected. QR code not needed.')
      return NextResponse.json(
        {
          success: false,
          message: 'WhatsApp is already connected. No QR code needed.',
        },
        { status: 400 }
      )
    }
    
    // If QR code already exists and not expired, return it
    if (status.qrCode && status.hasQR) {
      console.log('✅ Returning existing QR code')
      console.log('   QR code length:', status.qrCode.length)
      console.log('   QR code format:', status.qrCode.substring(0, 30))
      return NextResponse.json({
        success: true,
        data: {
          qrCode: status.qrCode,
          expiresIn: 60, // Default expiration
        },
      })
    }

    // Generate new QR code
    console.log('🔄 Generating new QR code...')
    let qrData
    try {
      qrData = await generateQRCode()
    } catch (error: any) {
      console.error('❌ Error generating QR code:', error)
      
      // If error is "already connected", check status again and return appropriate response
      const errorMessage = error?.message || String(error)
      if (errorMessage.includes('already connected') || errorMessage.includes('No QR code needed')) {
        const updatedStatus = getWhatsAppStatus()
        if (updatedStatus.connected) {
          console.log('⚠️ WhatsApp connected during QR generation. Returning error.')
          return NextResponse.json(
            {
              success: false,
              message: 'WhatsApp is already connected. No QR code needed.',
            },
            { status: 400 }
          )
        }
      }
      
      // If error is timeout, return helpful message
      if (errorMessage.includes('timeout') || errorMessage.includes('QR code timeout')) {
        console.log('⏱️ QR code generation timeout')
        return NextResponse.json(
          {
            success: false,
            message: 'QR code generation timeout. Please try again.',
          },
          { status: 408 }
        )
      }
      
      // If error is "not ready", return helpful message
      if (errorMessage.includes('not ready') || errorMessage.includes('Failed to initialize')) {
        console.log('⚠️ WhatsApp client not ready')
        return NextResponse.json(
          {
            success: false,
            message: 'WhatsApp client is not ready. Please wait a moment and try again.',
          },
          { status: 503 }
        )
      }
      
      // Re-throw other errors to be caught by outer catch
      throw error
    }
    
    if (!qrData || !qrData.qrCode) {
      throw new Error('QR code generation returned empty result')
    }
    
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
    const errorMessage = error?.message || String(error) || 'Unknown error'
    
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to get QR code',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    )
  }
}
