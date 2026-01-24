import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { getWhatsAppStatus, getWhatsAppSocket, setWhatsAppState, waitForInitialization } from '@/lib/whatsapp'
// Import whatsapp-init to ensure initialization happens
// This is safe because whatsapp-init has guards to prevent duplicate initialization
import '@/lib/whatsapp-init'
// Note: WhatsApp initialization is handled by instrumentation.ts on server startup
// But we import whatsapp-init here to ensure initialization is complete before checking status

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

    // IMPORTANT: Wait for initialization to complete first (like generateQRCode does)
    // This ensures socket is ready and connection events have fired
    await waitForInitialization()
    
    // Now get current status (this will sync state)
    let whatsappStatus = getWhatsAppStatus()
    let socket = getWhatsAppSocket()
    
    console.log('📊 Status after waiting for initialization:', {
      connected: whatsappStatus.connected,
      state: whatsappStatus.state,
      hasSocket: !!socket,
    })
    
    // If socket exists, check connection state multiple times with delays
    // This is critical right after server startup when connection might have just happened
    // We do the same thing that generateQRCode() does - check multiple times
    if (socket) {
      // Check up to 10 times with delays to catch connection that just happened
      // More checks than before to ensure we catch the connection
      for (let i = 0; i < 10; i++) {
        try {
          // Check multiple ways to determine if socket is connected
          const hasUser = !!(socket as any).user
          const hasUserId = !!(socket as any).user?.id
          const isActuallyConnected = hasUser || hasUserId
          
          console.log(`🔍 Connection check ${i + 1}/10:`, {
            hasUser,
            hasUserId,
            isActuallyConnected,
            currentState: whatsappStatus.connected,
            state: whatsappStatus.state,
          })
          
          if (isActuallyConnected) {
            // Socket is connected - ensure state reflects this immediately
            if (!whatsappStatus.connected) {
              console.log(`🔄 Found connection on check ${i + 1}, updating state immediately`)
              setWhatsAppState({
                connected: true,
                state: 'CONNECTED',
                hasQR: false,
              })
              // Get updated status
              whatsappStatus = getWhatsAppStatus()
              console.log(`✅ State updated, new status:`, {
                connected: whatsappStatus.connected,
                state: whatsappStatus.state,
              })
              break // Found connection, no need to check again
            } else {
              // Already connected, break
              console.log(`✅ Already connected, no update needed`)
              break
            }
          }
        } catch (error) {
          console.warn(`⚠️ Could not check socket state on attempt ${i + 1}:`, error)
        }
        
        // Wait a bit before next check (only if not connected yet and not last iteration)
        if (!whatsappStatus.connected && i < 9) {
          await new Promise(resolve => setTimeout(resolve, 300))
          // Re-check status after delay
          whatsappStatus = getWhatsAppStatus()
          // Re-get socket in case it changed
          socket = getWhatsAppSocket()
        }
      }
    } else {
      console.log('⚠️ No socket found after initialization check')
    }
    
    // Final sync to ensure state is accurate
    whatsappStatus = getWhatsAppStatus()
    
    // Remove qrCode from response (it's only needed in /qr endpoint)
    const { qrCode, ...statusResponse } = whatsappStatus

    console.log('✅ WhatsApp status retrieved:', {
      connected: statusResponse.connected,
      state: statusResponse.state,
      hasQR: statusResponse.hasQR,
    })

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
