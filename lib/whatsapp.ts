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

// Auth state directory
const AUTH_DIR = path.join(process.cwd(), '.baileys_auth')

/**
 * Get current WhatsApp status
 */
export function getWhatsAppStatus(): WhatsAppState {
  // Check if QR code is expired
  if (qrExpiresAt && new Date() > qrExpiresAt) {
    currentQRCode = null
    qrExpiresAt = null
    whatsappState.hasQR = false
    if (whatsappState.state === 'QR_READY') {
      whatsappState.state = 'DISCONNECTED'
    }
  }

  return {
    ...whatsappState,
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
 * Handle connection updates from Baileys
 */
function handleConnectionUpdate(update: Partial<ConnectionState>) {
  const { connection, lastDisconnect, qr } = update

  if (qr) {
    console.log('📱 QR Code received from WhatsApp')
    // Resolve QR code promise if waiting
    if (qrCodeResolver) {
      qrCodeResolver(qr)
      qrCodeResolver = null
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
    const shouldReconnect = !isLoggedOut
    
    console.log('❌ Connection closed:', {
      reason: lastDisconnect?.error,
      disconnectReason,
      isLoggedOut,
      shouldReconnect,
    })

    whatsappState.connected = false
    whatsappState.state = 'DISCONNECTED'
    whatsappState.hasQR = false
    currentQRCode = null
    qrExpiresAt = null

    if (shouldReconnect) {
      console.log('🔄 Will attempt to reconnect in 5 seconds...')
      whatsappState.state = 'CONNECTING'
      // Auto-reconnect after 5 seconds
      reconnectTimer = setTimeout(() => {
        console.log('🔄 Attempting auto-reconnect...')
        initializeWhatsApp().catch((error) => {
          console.error('❌ Auto-reconnect failed:', error)
        })
      }, 5000) // 5 seconds
    } else {
      console.log('⚠️ Logged out. Please reconnect manually via web admin.')
    }
  } else if (connection === 'open') {
    console.log('✅ WhatsApp connected!')
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
  
  // If QR code already exists and not expired, return it
  if (currentQRCode && qrExpiresAt && new Date() < qrExpiresAt) {
    return {
      qrCode: currentQRCode,
      expiresIn: Math.max(0, Math.floor((qrExpiresAt.getTime() - Date.now()) / 1000)),
    }
  }
  
  // Ensure socket is initialized - wait for initialization if in progress
  if (!socket) {
    if (initializationPromise) {
      // Wait for ongoing initialization to complete
      await initializationPromise
    } else {
      await initializeWhatsApp()
    }
  }
  
  // If socket is still not available after waiting, something went wrong
  if (!socket) {
    throw new Error('Failed to initialize WhatsApp client. Please try again.')
  }
  
  // If connected, no QR code available
  if (whatsappState.connected) {
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
        if (whatsappState.connected) {
          throw new Error('WhatsApp is already connected. No QR code needed.')
        }
      }
    }
  }
  
  throw new Error('WhatsApp client not ready. Please try again in a moment.')
}

/**
 * Reconnect WhatsApp
 * 
 * Disconnects current session and generates a new QR code.
 */
export async function reconnectWhatsApp(): Promise<{ qrCode: string; expiresIn: number }> {
  console.log('🔄 Reconnecting WhatsApp...')
  
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
  
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  
  // Close and destroy existing socket
  if (socket) {
    try {
      await socket.logout()
    } catch (error) {
      console.warn('Warning during logout:', error)
    }
    try {
      socket.end(undefined)
    } catch (error) {
      console.warn('Warning during end:', error)
    }
    socket = null
  }
  
  // Note: To force a new QR code, we can delete the auth directory
  // For now, we'll just reinitialize which will generate a new QR if needed
  
  // Reinitialize socket
  await initializeWhatsApp()
  
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
  
  // If socket exists and is connected, don't reinitialize
  if (socket && whatsappState.connected) {
    console.log('⏸️ WhatsApp client already connected')
    return
  }
  
  // If already initializing, return the existing promise
  if (isInitializing && initializationPromise) {
    console.log('⏸️ WhatsApp client already initializing, waiting...')
    return initializationPromise
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
      
      // Handle connection updates
      socket.ev.on('connection.update', handleConnectionUpdate)
      
      // Save credentials when they update
      socket.ev.on('creds.update', saveCreds)
      
      // Create promise for QR code
      qrCodePromise = new Promise<string>((resolve) => {
        qrCodeResolver = resolve
      })
      
      // Set initial state
      whatsappState.state = 'CONNECTING'
      
      console.log('✅ WhatsApp service initialized with Baileys')
    } catch (error) {
      console.error('❌ Error initializing WhatsApp:', error)
      whatsappState.state = 'DISCONNECTED'
      socket = null
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
