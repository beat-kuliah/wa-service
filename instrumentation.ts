/**
 * Next.js Instrumentation Hook
 * 
 * This file is automatically executed when the Next.js server starts.
 * Use this to initialize services that should run on server startup.
 * 
 * Note: This file must be in the root directory and requires Next.js 13.4+
 */

export async function register() {
  // Only run on server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('🚀 Server starting - Initializing WhatsApp service...')
    
    // Initialize WhatsApp service
    try {
      // Dynamic import to ensure proper module loading
      await import('./lib/whatsapp-init')
      console.log('✅ WhatsApp service initialization triggered')
    } catch (error) {
      console.error('❌ Failed to initialize WhatsApp service on server startup:', error)
    }
  }
}
