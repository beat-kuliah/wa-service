# WhatsApp Integration Guide

## Status Saat Ini

Endpoint WhatsApp sudah diimplementasikan langsung di service ini (bukan proxy):
- ✅ `GET /api/whatsapp/status` - Menggunakan local WhatsApp service manager
- ✅ `GET /api/whatsapp/qr` - Menggunakan local WhatsApp service manager
- ✅ `POST /api/whatsapp/reconnect` - Menggunakan local WhatsApp service manager

## Implementasi Saat Ini

Saat ini menggunakan **placeholder implementation** di `lib/whatsapp.ts`. Untuk menggunakan WhatsApp yang sebenarnya, Anda perlu mengintegrasikan library WhatsApp seperti:
- `whatsapp-web.js` (paling populer)
- `baileys` (lebih modern, tanpa browser)
- `whatsapp-api` (alternatif lain)

## Integrasi dengan whatsapp-web.js

### 1. Install Dependencies

```bash
npm install whatsapp-web.js qrcode-terminal
```

### 2. Update `lib/whatsapp.ts`

Ganti implementasi placeholder dengan kode berikut:

```typescript
import { Client, LocalAuth } from 'whatsapp-web.js'
import * as qrcode from 'qrcode'

let whatsappClient: Client | null = null

export async function initializeWhatsApp(): Promise<void> {
  console.log('🚀 Initializing WhatsApp service...')
  
  whatsappClient = new Client({
    authStrategy: new LocalAuth({
      dataPath: './.wwebjs_auth'
    }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  })

  // QR code event
  whatsappClient.on('qr', async (qr) => {
    console.log('📱 QR Code received')
    try {
      // Convert QR to base64 image
      const qrCodeBase64 = await qrcode.toDataURL(qr)
      currentQRCode = qrCodeBase64
      qrExpiresAt = new Date(Date.now() + 60 * 1000) // 60 seconds
      whatsappState.hasQR = true
      whatsappState.state = 'QR_READY'
    } catch (error) {
      console.error('Error generating QR code image:', error)
    }
  })

  // Ready event
  whatsappClient.on('ready', () => {
    console.log('✅ WhatsApp client is ready!')
    whatsappState.connected = true
    whatsappState.state = 'CONNECTED'
    whatsappState.hasQR = false
    currentQRCode = null
    qrExpiresAt = null
  })

  // Disconnected event
  whatsappClient.on('disconnected', (reason) => {
    console.log('❌ WhatsApp client disconnected:', reason)
    whatsappState.connected = false
    whatsappState.state = 'DISCONNECTED'
    whatsappState.hasQR = false
    currentQRCode = null
    qrExpiresAt = null
  })

  // Authentication failure
  whatsappClient.on('auth_failure', (msg) => {
    console.error('❌ Authentication failure:', msg)
    whatsappState.connected = false
    whatsappState.state = 'DISCONNECTED'
  })

  await whatsappClient.initialize()
  console.log('✅ WhatsApp service initialized')
}

export async function generateQRCode(): Promise<{ qrCode: string; expiresIn: number }> {
  if (!whatsappClient) {
    throw new Error('WhatsApp client not initialized')
  }

  // If already has QR, return it
  if (currentQRCode && qrExpiresAt && new Date() < qrExpiresAt) {
    return {
      qrCode: currentQRCode,
      expiresIn: Math.max(0, Math.floor((qrExpiresAt.getTime() - Date.now()) / 1000))
    }
  }

  // Reinitialize to get new QR
  await whatsappClient.logout()
  await whatsappClient.initialize()

  // Wait for QR code (will be set by event listener)
  // In production, you might want to use a promise/event system
  await new Promise(resolve => setTimeout(resolve, 2000))

  if (currentQRCode) {
    return {
      qrCode: currentQRCode,
      expiresIn: 60
    }
  }

  throw new Error('Failed to generate QR code')
}

export async function reconnectWhatsApp(): Promise<{ qrCode: string; expiresIn: number }> {
  console.log('🔄 Reconnecting WhatsApp...')
  
  if (!whatsappClient) {
    throw new Error('WhatsApp client not initialized')
  }

  // Clear current state
  whatsappState.connected = false
  whatsappState.state = 'DISCONNECTED'
  whatsappState.hasQR = false
  currentQRCode = null
  qrExpiresAt = null

  // Logout and reinitialize
  try {
    await whatsappClient.logout()
  } catch (error) {
    console.warn('Error during logout (might not be connected):', error)
  }

  await whatsappClient.initialize()

  // Wait for QR code
  await new Promise(resolve => setTimeout(resolve, 2000))

  if (currentQRCode) {
    return {
      qrCode: currentQRCode,
      expiresIn: 60
    }
  }

  throw new Error('Failed to reconnect and generate QR code')
}
```

### 3. Initialize on Server Startup

Buat file `lib/whatsapp-init.ts`:

```typescript
import { initializeWhatsApp } from './whatsapp'

// Initialize WhatsApp when this module is imported (server-side only)
if (typeof window === 'undefined') {
  initializeWhatsApp().catch(console.error)
}
```

Lalu import di `app/layout.tsx` atau buat file `app/api/whatsapp/init/route.ts` untuk manual initialization.

## Integrasi dengan Baileys

Baileys adalah alternatif yang lebih modern dan tidak memerlukan browser:

```bash
npm install @whiskeysockets/baileys
```

Implementasinya mirip dengan whatsapp-web.js, tapi menggunakan Baileys API.

## State Management

Saat ini menggunakan in-memory state. Untuk production, pertimbangkan:
- **Redis** untuk state persistence dan multi-instance support
- **Database** untuk menyimpan session dan state
- **File system** untuk session storage (seperti LocalAuth di whatsapp-web.js)

## Testing

Setelah integrasi:

1. **Test Status**: `GET /api/whatsapp/status`
2. **Test QR Code**: `GET /api/whatsapp/qr`
3. **Test Reconnect**: `POST /api/whatsapp/reconnect`

## Troubleshooting

### QR Code tidak muncul
- Pastikan WhatsApp client sudah di-initialize
- Check event listener untuk QR code
- Pastikan QR code belum expired

### Client tidak connect
- Check authentication folder permissions
- Pastikan puppeteer dependencies terinstall (untuk whatsapp-web.js)
- Check browser/headless setup

### State tidak persist
- Implement Redis atau database untuk state management
- Save session secara berkala

## Next Steps

1. Install WhatsApp library (whatsapp-web.js atau baileys)
2. Update `lib/whatsapp.ts` dengan implementasi sebenarnya
3. Initialize WhatsApp client saat server startup
4. Test semua endpoint
5. Setup state persistence (Redis/database) untuk production
