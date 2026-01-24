/**
 * WhatsApp Initialization Module
 * 
 * This module initializes the WhatsApp client when imported on the server side.
 * It should be imported in API routes or server-side code to ensure WhatsApp
 * is initialized when the server starts.
 * 
 * Note: Initialization only happens once, even if this module is imported multiple times.
 * The initializeWhatsApp function has built-in guards to prevent duplicate initializations.
 */

import { initializeWhatsApp, getWhatsAppStatus, getWhatsAppSocket } from './whatsapp'

// Track if initialization has been attempted to prevent multiple attempts
// This is module-level, so it persists across imports in the same process
let initializationAttempted = false
let initializationPromise: Promise<void> | null = null

// Only initialize on server side
if (typeof window === 'undefined') {
  // Use a more robust check that prevents re-initialization on module reload
  // Check current status and socket state
  const status = getWhatsAppStatus()
  const socket = getWhatsAppSocket()
  
  // Check if socket is actually connected (not just state)
  let isActuallyConnected = false
  if (socket) {
    try {
      isActuallyConnected = !!(socket as any).user
    } catch (error) {
      // If we can't check, use state
      isActuallyConnected = status.connected
    }
  }
  
  // Only attempt initialization if:
  // 1. Not already attempted in this module load
  // 2. Socket is not already connected (check both state and actual socket)
  // 3. Not already in connecting/QR_READY/PAIRING state (valid states)
  // 4. Socket doesn't exist (not initialized yet)
  const shouldInitialize = 
    !initializationAttempted && 
    !isActuallyConnected && 
    !status.connected &&
    status.state !== 'CONNECTING' &&
    status.state !== 'QR_READY' &&
    status.state !== 'PAIRING' &&
    !socket
  
  if (shouldInitialize) {
    initializationAttempted = true
    console.log('📱 WhatsApp initialization module loaded - starting initialization...')
    
    // Initialize WhatsApp asynchronously (don't block server startup)
    // initializeWhatsApp has built-in guards to prevent multiple initializations:
    // - Checks if socket exists and is connected
    // - Checks if already initializing
    // - Prevents duplicate initialization attempts
    initializationPromise = initializeWhatsApp()
      .then(() => {
        console.log('✅ WhatsApp initialization completed')
        initializationPromise = null
      })
      .catch((error) => {
        console.error('❌ Failed to initialize WhatsApp:', error)
        // Reset flag on error so it can be retried after a delay
        initializationPromise = null
        // Don't reset immediately - wait a bit before allowing retry
        setTimeout(() => {
          initializationAttempted = false
        }, 10000) // Increased to 10 seconds
      })
  } else {
    // Log why initialization is being skipped (for debugging) - only once
    if (!initializationAttempted) {
      if (isActuallyConnected || status.connected) {
        console.log('⏸️ WhatsApp already connected, skipping initialization')
      } else if (status.state === 'CONNECTING' || status.state === 'QR_READY' || status.state === 'PAIRING') {
        console.log(`⏸️ WhatsApp in state: ${status.state}, skipping initialization`)
      } else if (socket) {
        console.log('⏸️ Socket exists but not connected, waiting for state to stabilize...')
      }
    }
  }
}
