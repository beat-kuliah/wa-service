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

import { initializeWhatsApp, getWhatsAppSocket } from './whatsapp'

// Only initialize on server side
if (typeof window === 'undefined') {
  // Check if socket already exists to prevent unnecessary initialization attempts
  // The initializeWhatsApp function has guards, but this prevents even attempting
  const socket = getWhatsAppSocket()
  
  if (!socket) {
    // Initialize WhatsApp asynchronously (don't block server startup)
    // initializeWhatsApp has guards to prevent multiple initializations
    initializeWhatsApp().catch((error) => {
      console.error('❌ Failed to initialize WhatsApp:', error)
    })
  }
}
