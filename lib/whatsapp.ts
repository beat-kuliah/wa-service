/**
 * WhatsApp Service Manager
 * 
 * Manages WhatsApp connection state and provides methods for status, QR code, and reconnect.
 * Integrated with Baileys for real WhatsApp functionality.
 */

import makeWASocket, {
  ConnectionState,
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  fetchLatestBaileysVersion,
  proto,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import * as QRCode from 'qrcode'
import pino from 'pino'
import path from 'path'
import { existsSync, mkdirSync } from 'fs'

export interface WhatsAppState {
  connected: boolean
  state: 'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'CONNECTED' | 'PAIRING'
  hasQR: boolean
  qrCode?: string
  qrExpiresAt?: Date
}

// Global state (in production, use Redis or database for persistence)
let whatsappState: WhatsAppState = {
  connected: false,
  state: 'DISCONNECTED',
  hasQR: false,
}

// QR code storage (in production, use cache like Redis)
let currentQRCode: string | null = null
let qrExpiresAt: Date | null = null

// WhatsApp socket instance
let socket: WASocket | null = null
let isInitializing = false
let initializationPromise: Promise<void> | null = null
let qrCodePromise: Promise<string> | null = null
let qrCodeResolver: ((qr: string) => void) | null = null
let reconnectTimer: NodeJS.Timeout | null = null
let reconnectAttempts = 0
let isCleaningUp = false
const MAX_RECONNECT_ATTEMPTS = 10
const INITIAL_RECONNECT_DELAY = 5000 // 5 seconds

// Auth state directory
const AUTH_DIR = path.join(process.cwd(), '.baileys_auth')

/**
 * Force sync state with actual socket connection
 * This is a more aggressive sync that directly checks socket state
 */
function forceSyncState(): void {
  if (socket) {
    try {
      // Check multiple ways to determine if socket is connected
      const hasUser = !!(socket as any).user
      const hasUserId = !!(socket as any).user?.id
      
      // Socket is connected if it has user property
      const isActuallyConnected = hasUser || hasUserId
      
      // If socket is actually connected but state says otherwise, force update
      if (isActuallyConnected) {
        if (!whatsappState.connected || whatsappState.state !== 'CONNECTED') {
          console.log('🔄 Force sync: Socket is connected (hasUser:', hasUser, ', hasUserId:', hasUserId, '), forcing state update to CONNECTED')
          whatsappState.connected = true
          whatsappState.state = 'CONNECTED'
          whatsappState.hasQR = false
          currentQRCode = null
          qrExpiresAt = null
          qrCodePromise = null
          qrCodeResolver = null
          if (reconnectTimer) {
            clearTimeout(reconnectTimer)
            reconnectTimer = null
          }
          reconnectAttempts = 0
        }
      } else {
        // Socket exists but not connected
        if (whatsappState.connected && whatsappState.state === 'CONNECTED') {
          console.log('🔄 Force sync: Socket exists but not connected, updating state')
          whatsappState.connected = false
          whatsappState.state = 'DISCONNECTED'
        }
      }
    } catch (error) {
      // Log error for debugging
      console.warn('⚠️ Error in forceSyncState:', error)
    }
  } else {
    // No socket, ensure state reflects this
    if (whatsappState.connected) {
      console.log('🔄 Force sync: No socket, updating state to DISCONNECTED')
      whatsappState.connected = false
      whatsappState.state = 'DISCONNECTED'
    }
  }
}

/**
 * Get current WhatsApp status
 * 
 * This function checks the actual socket state and syncs it with whatsappState
 * to ensure the returned status is always accurate.
 */
export function getWhatsAppStatus(): WhatsAppState {
  // First, do a force sync to ensure state is accurate
  forceSyncState()
  // Sync state with actual socket connection
  // If socket exists, check its actual connection state
  if (socket) {
    // Check if socket is actually connected by checking its internal state
    // Baileys socket has a 'user' property when connected
    try {
      const isActuallyConnected = !!(socket as any).user
      
      // ALWAYS sync if there's a mismatch - this is critical for state accuracy
      if (isActuallyConnected && !whatsappState.connected) {
        console.log('🔄 Syncing state: Socket is connected but state was disconnected - updating to CONNECTED')
        whatsappState.connected = true
        whatsappState.state = 'CONNECTED'
        whatsappState.hasQR = false
        currentQRCode = null
        qrExpiresAt = null
        qrCodePromise = null
        qrCodeResolver = null
        // Cancel any pending reconnect timer
        if (reconnectTimer) {
          clearTimeout(reconnectTimer)
          reconnectTimer = null
          console.log('🛑 Cancelled reconnect timer - socket is connected')
        }
        // Reset reconnect attempts
        reconnectAttempts = 0
      }
      // If socket is not connected but state says connected, sync it
      else if (!isActuallyConnected && whatsappState.connected && whatsappState.state === 'CONNECTED') {
        console.log('🔄 Syncing state: Socket is disconnected but state was connected - updating to DISCONNECTED')
        whatsappState.connected = false
        if (whatsappState.state === 'CONNECTED') {
          whatsappState.state = 'DISCONNECTED'
        }
      }
      // If socket is connected and state is CONNECTING, update to CONNECTED
      else if (isActuallyConnected && whatsappState.state === 'CONNECTING') {
        console.log('🔄 Syncing state: Socket is connected but state was CONNECTING - updating to CONNECTED')
        whatsappState.connected = true
        whatsappState.state = 'CONNECTED'
        whatsappState.hasQR = false
        currentQRCode = null
        qrExpiresAt = null
        qrCodePromise = null
        qrCodeResolver = null
        if (reconnectTimer) {
          clearTimeout(reconnectTimer)
          reconnectTimer = null
        }
        reconnectAttempts = 0
      }
    } catch (error) {
      // If we can't check socket state, trust the whatsappState
      // But if socket exists and we can't check, it might be in a bad state
      // Only log warning if state says connected (might be stale)
      if (whatsappState.connected) {
        console.warn('⚠️ Could not check socket state but state says connected:', error)
      }
    }
  } else {
    // No socket exists, ensure state reflects this
    if (whatsappState.connected) {
      console.log('🔄 Syncing state: No socket but state says connected - updating to DISCONNECTED')
      whatsappState.connected = false
      if (whatsappState.state === 'CONNECTED') {
        whatsappState.state = 'DISCONNECTED'
      }
    }
    // Also cancel reconnect timer if no socket exists
    if (reconnectTimer) {
      console.log('🛑 No socket exists but reconnect timer is active, cancelling...')
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }
  
  // Check if QR code is expired
  if (qrExpiresAt && new Date() > qrExpiresAt) {
    currentQRCode = null
    qrExpiresAt = null
    whatsappState.hasQR = false
    if (whatsappState.state === 'QR_READY') {
      whatsappState.state = 'DISCONNECTED'
    }
  }

  // Return state (qrExpiresAt is not included as it's only used internally)
  return {
    connected: whatsappState.connected,
    state: whatsappState.state,
    hasQR: whatsappState.hasQR,
    qrCode: currentQRCode || undefined,
  }
}

/**
 * Set WhatsApp state
 */
export function setWhatsAppState(state: Partial<WhatsAppState>): void {
  whatsappState = {
    ...whatsappState,
    ...state,
  }
}

/**
 * Cleanup socket and remove event listeners
 */
async function cleanupSocket(): Promise<void> {
  if (isCleaningUp) {
    console.log('⏸️ Cleanup already in progress, skipping...')
    return
  }
  
  if (!socket) {
    return
  }
  
  isCleaningUp = true
  const socketToCleanup = socket
  
  try {
    console.log('🧹 Cleaning up socket...')
    
    // Cancel any pending reconnect timer FIRST
    if (reconnectTimer) {
      console.log('🛑 Cancelling reconnect timer during cleanup')
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    
    // Remove all event listeners first to prevent new events during cleanup
    try {
      socketToCleanup.ev.removeAllListeners('connection.update')
      socketToCleanup.ev.removeAllListeners('creds.update')
      console.log('✅ Event listeners removed')
    } catch (error) {
      console.warn('⚠️ Warning while removing event listeners:', error)
    }
    
    // Wait a bit to ensure no pending events
    await new Promise(resolve => setTimeout(resolve, 100))
    
    try {
      // Try to logout gracefully
      await socketToCleanup.logout()
      console.log('✅ Logged out successfully')
    } catch (error) {
      // Ignore logout errors (socket might already be closed)
      console.log('⚠️ Logout error (ignored):', error)
    }
    
    try {
      // End the socket connection
      socketToCleanup.end(undefined)
      console.log('✅ Socket ended')
    } catch (error) {
      // Ignore end errors
      console.log('⚠️ End error (ignored):', error)
    }
    
    // Clear socket reference
    socket = null
    console.log('✅ Socket cleanup completed')
  } catch (error) {
    console.error('❌ Error during socket cleanup:', error)
    // Still clear socket reference even on error
    socket = null
  } finally {
    isCleaningUp = false
  }
}

/**
 * Handle connection updates from Baileys
 */
function handleConnectionUpdate(update: Partial<ConnectionState>) {
  const { connection, lastDisconnect, qr } = update

  if (qr) {
    console.log('📱 QR Code received from WhatsApp')
    
    // Resolve QR code promise if waiting (do this FIRST)
    if (qrCodeResolver) {
      console.log('✅ Resolving QR code promise')
      qrCodeResolver(qr)
      qrCodeResolver = null
      // Don't clear qrCodePromise here - it might still be awaited
    }
    
    // Generate QR code image
    QRCode.toDataURL(qr, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 300,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
      .then((qrCodeDataURL) => {
        currentQRCode = qrCodeDataURL
        qrExpiresAt = new Date(Date.now() + 60 * 1000) // 60 seconds
        whatsappState.hasQR = true
        whatsappState.state = 'QR_READY'
        console.log('✅ QR Code stored and ready')
      })
      .catch((error) => {
        console.error('❌ Error generating QR code image:', error)
      })
  }

  if (connection === 'close') {
    const disconnectReason = (lastDisconnect?.error as Boom)?.output?.statusCode
    const isLoggedOut = disconnectReason === DisconnectReason.loggedOut
    const isConflict = disconnectReason === 440 // Conflict - multiple connections with same credentials
    const isConnectionClosed = disconnectReason === DisconnectReason.connectionClosed
    
    // Don't auto-reconnect if:
    // 1. Logged out (need manual reconnect)
    // 2. Conflict (440) - means another session is active, don't reconnect automatically
    // 3. Max reconnect attempts reached
    const shouldReconnect = !isLoggedOut && !isConflict && reconnectAttempts < MAX_RECONNECT_ATTEMPTS
    
    console.log('❌ Connection closed:', {
      reason: lastDisconnect?.error,
      disconnectReason,
      isLoggedOut,
      isConflict,
      isConnectionClosed,
      shouldReconnect,
      reconnectAttempts,
    })

    // Cancel any existing reconnect timer first
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
      console.log('🛑 Cancelled existing reconnect timer')
    }

    whatsappState.connected = false
    whatsappState.state = 'DISCONNECTED'
    whatsappState.hasQR = false
    currentQRCode = null
    qrExpiresAt = null
    // Clear QR code promise and resolver to prevent memory leaks
    qrCodePromise = null
    qrCodeResolver = null

    // Cleanup socket
    cleanupSocket().catch((error) => {
      console.error('❌ Error during socket cleanup:', error)
    })

    // Only auto-reconnect if conditions are met
    if (shouldReconnect) {
      // Calculate exponential backoff delay
      const delay = Math.min(
        INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttempts),
        60000 // Max 60 seconds
      )
      
      reconnectAttempts++
      console.log(`🔄 Will attempt to reconnect in ${delay / 1000} seconds... (Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`)
      whatsappState.state = 'CONNECTING'
      
      // Auto-reconnect with exponential backoff
      reconnectTimer = setTimeout(async () => {
        // Double check: if already connected, don't reconnect
        const currentStatus = getWhatsAppStatus()
        if (currentStatus.connected || socket) {
          console.log('⏸️ Already connected or socket exists, cancelling reconnect')
          reconnectTimer = null
          reconnectAttempts = 0
          return
        }
        
        console.log('🔄 Attempting auto-reconnect...')
        try {
          await initializeWhatsApp()
          // Reset reconnect attempts on successful initialization
          reconnectAttempts = 0
        } catch (error) {
          console.error('❌ Auto-reconnect failed:', error)
          // If max attempts reached, stop trying
          if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.error('❌ Max reconnect attempts reached. Please reconnect manually.')
            reconnectAttempts = 0
          }
        } finally {
          reconnectTimer = null
        }
      }, delay)
    } else {
      if (isLoggedOut) {
        console.log('⚠️ Logged out. Please reconnect manually via web admin.')
      } else if (isConflict) {
        console.log('⚠️ Connection conflict detected (440). Another session may be active. Please reconnect manually.')
      } else {
        console.log('⚠️ Max reconnect attempts reached. Please reconnect manually.')
      }
      reconnectAttempts = 0
    }
  } else if (connection === 'open') {
    console.log('✅ WhatsApp connected!')
    
    // Cancel any pending reconnect timer FIRST
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
      console.log('🛑 Cancelled reconnect timer on successful connection')
    }
    
    // Reset reconnect attempts on successful connection
    reconnectAttempts = 0
    
    // Update state
    whatsappState.connected = true
    whatsappState.state = 'CONNECTED'
    whatsappState.hasQR = false
    currentQRCode = null
    qrExpiresAt = null
    qrCodePromise = null
    qrCodeResolver = null
    
    console.log('✅ State updated to CONNECTED')
  } else if (connection === 'connecting') {
    console.log('🔄 Connecting to WhatsApp...')
    whatsappState.state = 'CONNECTING'
  }
}

/**
 * Generate QR code from WhatsApp client
 * 
 * Returns the current QR code if available, or waits for a new one to be generated.
 */
export async function generateQRCode(): Promise<{ qrCode: string; expiresIn: number }> {
  const expiresIn = 60 // seconds
  const expirationTime = new Date(Date.now() + expiresIn * 1000)
  
  // Check if connected FIRST - before doing anything that might trigger reinitialize
  // Also sync state to ensure we have latest status
  const currentStatus = getWhatsAppStatus()
  if (currentStatus.connected) {
    throw new Error('WhatsApp is already connected. No QR code needed.')
  }
  
  // If QR code already exists and not expired, return it
  if (currentQRCode && qrExpiresAt && new Date() < qrExpiresAt) {
    console.log('✅ Returning existing valid QR code')
    return {
      qrCode: currentQRCode,
      expiresIn: Math.max(0, Math.floor((qrExpiresAt.getTime() - Date.now()) / 1000)),
    }
  }
  
  // Ensure socket is initialized - wait for initialization if in progress
  // Only initialize if not connected (checked above)
  if (!socket) {
    console.log('📱 Socket not found, initializing...')
    if (initializationPromise) {
      // Wait for ongoing initialization to complete
      console.log('⏳ Waiting for existing initialization...')
      try {
        await initializationPromise
      } catch (error) {
        console.error('❌ Initialization promise rejected:', error)
        // Try to initialize again
        await initializeWhatsApp()
      }
    } else {
      await initializeWhatsApp()
    }
    
    // Wait a bit for socket to be created and event listeners attached
    let waitCount = 0
    while (!socket && waitCount < 20) {
      await new Promise(resolve => setTimeout(resolve, 100))
      waitCount++
    }
  }
  
  // If socket is still not available after waiting, something went wrong
  if (!socket) {
    throw new Error('Failed to initialize WhatsApp client. Please try again.')
  }
  
  // Ensure QR code promise exists (it should be created during initialization)
  // If not, create it now (might have been missed)
  if (!qrCodePromise && !whatsappState.connected) {
    console.log('📱 Creating QR code promise...')
    qrCodePromise = new Promise<string>((resolve) => {
      qrCodeResolver = resolve
    })
  }
  
  // Double check connection status after initialization (might have connected during init)
  const updatedStatus = getWhatsAppStatus()
  if (updatedStatus.connected) {
    throw new Error('WhatsApp is already connected. No QR code needed.')
  }
  
  // If socket is connecting or waiting for QR, wait for it
  if (whatsappState.state === 'CONNECTING' || whatsappState.state === 'QR_READY') {
    // If we have a stored QR code that's not expired, return it
    if (currentQRCode && qrExpiresAt && new Date() < qrExpiresAt) {
      return {
        qrCode: currentQRCode,
        expiresIn: Math.max(0, Math.floor((qrExpiresAt.getTime() - Date.now()) / 1000)),
      }
    }
    
    // If we have a stored QR code even if expired, return it
    if (currentQRCode) {
      return {
        qrCode: currentQRCode,
        expiresIn: 0, // Expired but still return it
      }
    }
    
    // Wait for QR code promise if available
    if (qrCodePromise) {
      try {
        console.log('⏳ Waiting for QR code from WhatsApp...')
        const qrString = await Promise.race([
          qrCodePromise,
          new Promise<string>((_, reject) => 
            setTimeout(() => reject(new Error('QR code timeout')), 30000)
          )
        ])
        
        const qrCodeDataURL = await QRCode.toDataURL(qrString, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 300,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        })
        
        currentQRCode = qrCodeDataURL
        qrExpiresAt = expirationTime
        
        return {
          qrCode: qrCodeDataURL,
          expiresIn,
        }
      } catch (error) {
        console.error('❌ Error waiting for QR code:', error)
        // Continue to check if QR code was generated via event handler
      }
    }
    
    // If still connecting, wait a bit for QR code to be generated via event handler
    if (whatsappState.state === 'CONNECTING') {
      console.log('⏳ Waiting for QR code generation...')
      // Wait up to 10 seconds for QR code
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        if (currentQRCode) {
          return {
            qrCode: currentQRCode,
            expiresIn: qrExpiresAt 
              ? Math.max(0, Math.floor((qrExpiresAt.getTime() - Date.now()) / 1000))
              : 60,
          }
        }
        
        // Check if state changed
        if (whatsappState.state === 'QR_READY' && currentQRCode) {
          return {
            qrCode: currentQRCode,
            expiresIn: qrExpiresAt 
              ? Math.max(0, Math.floor((qrExpiresAt.getTime() - Date.now()) / 1000))
              : 60,
          }
        }
        
        // If connected, no QR needed
        const finalStatus = getWhatsAppStatus()
        if (finalStatus.connected) {
          throw new Error('WhatsApp is already connected. No QR code needed.')
        }
        
        // Check if QR code was generated during wait
        if (currentQRCode) {
          return {
            qrCode: currentQRCode,
            expiresIn: qrExpiresAt 
              ? Math.max(0, Math.floor((qrExpiresAt.getTime() - Date.now()) / 1000))
              : 60,
          }
        }
      }
    }
  }
  
  // Final check - if we still don't have QR code, check if connected
  const finalStatus = getWhatsAppStatus()
  if (finalStatus.connected) {
    throw new Error('WhatsApp is already connected. No QR code needed.')
  }
  
  // If we have a QR code (even if expired), return it
  if (currentQRCode) {
    console.log('⚠️ Returning expired QR code as fallback')
    return {
      qrCode: currentQRCode,
      expiresIn: 0,
    }
  }
  
  // Last resort: check if socket is ready and wait a bit more
  if (socket && whatsappState.state === 'CONNECTING') {
    console.log('⏳ Socket is connecting, waiting a bit more...')
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    const lastStatus = getWhatsAppStatus()
    if (lastStatus.connected) {
      throw new Error('WhatsApp is already connected. No QR code needed.')
    }
    
    if (currentQRCode) {
      return {
        qrCode: currentQRCode,
        expiresIn: qrExpiresAt 
          ? Math.max(0, Math.floor((qrExpiresAt.getTime() - Date.now()) / 1000))
          : 60,
      }
    }
  }
  
  throw new Error('WhatsApp client is not ready or QR code generation failed. Please try again in a moment.')
}

/**
 * Reconnect WhatsApp
 * 
 * Disconnects current session and generates a new QR code.
 */
export async function reconnectWhatsApp(): Promise<{ qrCode: string; expiresIn: number }> {
  console.log('🔄 Reconnecting WhatsApp...')
  
  // Cancel any pending reconnect timer FIRST
  if (reconnectTimer) {
    console.log('🛑 Cancelling pending reconnect timer')
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  
  // Cancel any ongoing initialization
  if (isInitializing && initializationPromise) {
    console.log('⏸️ Cancelling ongoing initialization...')
    // Wait for it to finish or timeout
    try {
      await Promise.race([
        initializationPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
      ])
    } catch (error) {
      console.log('⚠️ Initialization cancelled or timed out')
    }
  }
  
  // Close and destroy existing socket FIRST
  await cleanupSocket()
  
  // Wait a bit after cleanup to ensure socket is fully closed
  await new Promise(resolve => setTimeout(resolve, 1500))
  
  // Clear current state
  whatsappState.connected = false
  whatsappState.state = 'DISCONNECTED'
  whatsappState.hasQR = false
  currentQRCode = null
  qrExpiresAt = null
  qrCodePromise = null
  qrCodeResolver = null
  initializationPromise = null
  isInitializing = false
  
  // Reset reconnect attempts for manual reconnect
  reconnectAttempts = 0
  
  // Reinitialize socket
  await initializeWhatsApp()
  
  // Wait a bit for socket to be ready and event listeners attached
  await new Promise(resolve => setTimeout(resolve, 1500))
  
  // Generate new QR code
  const result = await generateQRCode()
  
  console.log('✅ WhatsApp reconnection initiated')
  
  return result
}

/**
 * Initialize WhatsApp client (to be called on server startup)
 * 
 * Sets up WhatsApp socket with event listeners for QR code, ready, and disconnected events.
 */
export async function initializeWhatsApp(): Promise<void> {
  // Only initialize on server side
  if (typeof window !== 'undefined') {
    console.warn('⚠️ WhatsApp client can only be initialized on server side')
    return
  }
  
  // STRICT CHECK: If socket exists and is connected, don't reinitialize
  if (socket) {
    try {
      const isActuallyConnected = !!(socket as any).user
      if (isActuallyConnected || whatsappState.connected) {
        console.log('⏸️ WhatsApp client already connected - skipping initialization')
        // Cancel any pending reconnect timer
        if (reconnectTimer) {
          clearTimeout(reconnectTimer)
          reconnectTimer = null
        }
        return
      }
    } catch (error) {
      // If we can't check, assume not connected and continue
      console.log('⚠️ Could not verify socket connection, proceeding with check...')
    }
  }
  
  // If already initializing, return the existing promise
  if (isInitializing && initializationPromise) {
    console.log('⏸️ WhatsApp client already initializing, waiting for existing initialization...')
    return initializationPromise
  }
  
  // If cleanup is in progress, wait for it to finish
  if (isCleaningUp) {
    console.log('⏸️ Cleanup in progress, waiting...')
    let waitCount = 0
    while (isCleaningUp && waitCount < 50) {
      await new Promise(resolve => setTimeout(resolve, 100))
      waitCount++
    }
  }
  
  // Cancel any pending reconnect timer before initializing
  if (reconnectTimer) {
    console.log('🛑 Cancelling reconnect timer before initialization')
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  
  // If socket exists but not connected, cleanup first
  if (socket && !whatsappState.connected) {
    // If socket is connecting or in QR_READY state, don't cleanup - let it continue
    if (whatsappState.state === 'CONNECTING' || whatsappState.state === 'QR_READY' || whatsappState.state === 'PAIRING') {
      console.log(`⏸️ Socket exists in state: ${whatsappState.state}, not reinitializing`)
      return
    }
    
    // Only cleanup if socket is in DISCONNECTED state
    if (whatsappState.state === 'DISCONNECTED') {
      console.log('🧹 Cleaning up existing disconnected socket before reinitializing...')
      await cleanupSocket()
      // Wait a bit after cleanup to ensure socket is fully closed
      await new Promise(resolve => setTimeout(resolve, 500))
    } else {
      // Socket exists but in unknown state - don't reinitialize
      console.log(`⏸️ Socket exists in state: ${whatsappState.state}, not reinitializing`)
      return
    }
  }
  
  // Double check: if socket still exists after cleanup, don't initialize
  if (socket) {
    console.log('⏸️ Socket still exists after cleanup check, skipping initialization')
    return
  }
  
  isInitializing = true
  console.log('🚀 Initializing WhatsApp service with Baileys...')
  
  // Create and store the initialization promise
  initializationPromise = (async () => {
    try {
      // Ensure auth directory exists
      if (!existsSync(AUTH_DIR)) {
        mkdirSync(AUTH_DIR, { recursive: true })
      }
      
      // Load auth state
      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
      
      // Fetch latest version
      const { version } = await fetchLatestBaileysVersion()
      console.log(`📱 Using WhatsApp version: ${version.join('.')}`)
      
      // Create promise for QR code BEFORE creating socket
      // This ensures the promise exists when QR code event fires
      qrCodePromise = new Promise<string>((resolve) => {
        qrCodeResolver = resolve
      })
      
      // Create socket
      socket = makeWASocket({
        version,
        logger: pino({ level: 'silent' }), // Set to 'info' for debugging
        printQRInTerminal: false,
        auth: state,
        browser: ['WA Service', 'Chrome', '1.0.0'],
        getMessage: async (key) => {
          // Return empty message for now
          return {
            conversation: '',
          }
        },
      })
      
      // IMPORTANT: Attach event listeners IMMEDIATELY after socket creation
      // This ensures we catch QR code events that might fire immediately
      socket.ev.on('connection.update', handleConnectionUpdate)
      
      // Save credentials when they update
      socket.ev.on('creds.update', saveCreds)
      
      // Set initial state
      whatsappState.state = 'CONNECTING'
      
      console.log('✅ WhatsApp service initialized with Baileys')
      
      // Wait a bit to allow initial connection events to fire
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // IMPORTANT: After initialization, sync state with actual socket state
      // This ensures that if WhatsApp connected immediately (saved credentials),
      // the state will be correct
      // We check multiple times with delays because connection might happen asynchronously
      if (socket) {
        for (let i = 0; i < 5; i++) {
          try {
            const isActuallyConnected = !!(socket as any).user
            if (isActuallyConnected && !whatsappState.connected) {
              console.log('🔄 Post-init sync: Socket is connected, updating state')
              whatsappState.connected = true
              whatsappState.state = 'CONNECTED'
              whatsappState.hasQR = false
              currentQRCode = null
              qrExpiresAt = null
              qrCodePromise = null
              qrCodeResolver = null
              if (reconnectTimer) {
                clearTimeout(reconnectTimer)
                reconnectTimer = null
              }
              reconnectAttempts = 0
              break // Found connection, no need to check again
            } else if (isActuallyConnected) {
              // Already synced, break
              break
            }
          } catch (error) {
            console.warn('⚠️ Could not check socket state after init (attempt ' + (i + 1) + '):', error)
          }
          
          // Wait a bit before next check (only if not connected yet)
          if (!whatsappState.connected && i < 4) {
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }
      }
    } catch (error) {
      console.error('❌ Error initializing WhatsApp:', error)
      whatsappState.state = 'DISCONNECTED'
      socket = null
      qrCodePromise = null
      qrCodeResolver = null
      throw error
    } finally {
      isInitializing = false
    }
  })()
  
  return initializationPromise
}

/**
 * Get WhatsApp socket instance (for sending messages, etc.)
 */
export function getWhatsAppSocket(): WASocket | null {
  return socket
}

/**
 * Wait for initialization to complete if it's in progress
 * This is useful for API endpoints that need to ensure initialization is done
 */
export async function waitForInitialization(): Promise<void> {
  // If already initialized and connected, no need to wait
  if (socket) {
    try {
      const isActuallyConnected = !!(socket as any).user
      if (isActuallyConnected) {
        return // Already initialized and connected
      }
    } catch (error) {
      // Ignore errors
    }
  }
  
  // If initialization is in progress, wait for it
  if (isInitializing && initializationPromise) {
    console.log('⏳ Waiting for initialization to complete...')
    try {
      await initializationPromise
      // Wait a bit more for connection events to fire
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.warn('⚠️ Initialization promise rejected:', error)
    }
  }
  
  // If no socket exists, try to initialize
  if (!socket) {
    console.log('📱 No socket found, initializing...')
    try {
      await initializeWhatsApp()
      // Wait a bit for socket to be created and connection events to fire
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.warn('⚠️ Error during initialization:', error)
    }
  }
}
