# WhatsApp Endpoints - Backend Implementation Guide

## Situasi Saat Ini

Dashboard frontend (`wa-service`) memiliki endpoint proxy untuk WhatsApp:
- `GET /api/whatsapp/status` - Proxy ke backend WhatsApp service
- `GET /api/whatsapp/qr` - Proxy ke backend WhatsApp service  
- `POST /api/whatsapp/reconnect` - Proxy ke backend WhatsApp service

**Endpoint-endpoint ini memanggil backend WhatsApp service yang sebenarnya.**

## Backend WhatsApp Service Endpoints yang Diperlukan

Backend WhatsApp service (yang berjalan di `http://localhost:3000` atau sesuai `NEXT_PUBLIC_API_URL`) harus memiliki endpoint berikut:

### 1. GET /api/whatsapp/status (atau /whatsapp/status)

Mengembalikan status koneksi WhatsApp.

**Response:**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "state": "CONNECTED",
    "hasQR": false
  }
}
```

**States yang mungkin:**
- `CONNECTED` - WhatsApp terhubung
- `DISCONNECTED` - WhatsApp tidak terhubung
- `CONNECTING` - Sedang menghubungkan
- `QR_READY` - QR code siap untuk di-scan

### 2. GET /api/whatsapp/qr (atau /whatsapp/qr)

Mengembalikan QR code untuk koneksi WhatsApp.

**Headers:**
- `X-API-Key`: API key untuk autentikasi (opsional, tergantung backend)

**Response:**
```json
{
  "success": true,
  "data": {
    "qrCode": "data:image/png;base64,iVBORw0KG...",
    "expiresIn": 60
  }
}
```

### 3. POST /api/whatsapp/reconnect (atau /whatsapp/reconnect)

Memulai ulang koneksi WhatsApp dan menghasilkan QR code baru.

**Headers:**
- `X-API-Key`: API key untuk autentikasi (opsional, tergantung backend)

**Response:**
```json
{
  "success": true,
  "message": "WhatsApp reconnection initiated",
  "data": {
    "qrCode": "data:image/png;base64,iVBORw0KG...",
    "expiresIn": 60
  }
}
```

## Implementasi di Backend

Jika backend WhatsApp service Anda menggunakan **Express.js** atau **Next.js**, berikut contoh implementasinya:

### Express.js Example

```javascript
// routes/whatsapp.js
const express = require('express');
const router = express.Router();

// GET /api/whatsapp/status
router.get('/status', async (req, res) => {
  try {
    // Get WhatsApp connection status from your WhatsApp library
    // Contoh: menggunakan whatsapp-web.js atau library lain
    const status = await whatsappClient.getState();
    
    res.json({
      success: true,
      data: {
        connected: status === 'CONNECTED',
        state: status,
        hasQR: status === 'QR_READY' || status === 'PAIRING',
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET /api/whatsapp/qr
router.get('/qr', async (req, res) => {
  try {
    // Verify API key if required
    const apiKey = req.headers['x-api-key'];
    if (process.env.API_KEY && apiKey !== process.env.API_KEY) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API key'
      });
    }

    // Get QR code from WhatsApp client
    const qrCode = await whatsappClient.getQRCode();
    
    res.json({
      success: true,
      data: {
        qrCode: qrCode, // Base64 atau data URL
        expiresIn: 60 // seconds
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/whatsapp/reconnect
router.post('/reconnect', async (req, res) => {
  try {
    // Verify API key if required
    const apiKey = req.headers['x-api-key'];
    if (process.env.API_KEY && apiKey !== process.env.API_KEY) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API key'
      });
    }

    // Reconnect WhatsApp client
    await whatsappClient.logout();
    await whatsappClient.initialize();
    
    // Get new QR code if needed
    const qrCode = await whatsappClient.getQRCode();
    
    res.json({
      success: true,
      message: 'WhatsApp reconnection initiated',
      data: {
        qrCode: qrCode,
        expiresIn: 60
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
```

### Next.js API Route Example

```typescript
// app/api/whatsapp/status/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get WhatsApp status from your WhatsApp client
    const status = await whatsappClient.getState();
    
    return NextResponse.json({
      success: true,
      data: {
        connected: status === 'CONNECTED',
        state: status,
        hasQR: status === 'QR_READY',
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
```

## Troubleshooting

### Error 404
- Pastikan endpoint sudah dibuat di backend WhatsApp service
- Cek path endpoint (mungkin `/whatsapp/reconnect` bukan `/api/whatsapp/reconnect`)
- Pastikan backend service berjalan di URL yang benar

### Error 401
- Pastikan API key sudah di-set di `.env.local` sebagai `NEXT_PUBLIC_API_KEY`
- Pastikan backend service menerima API key di header `X-API-Key`
- Cek apakah backend service memerlukan autentikasi

### Error 503
- Backend WhatsApp service tidak tersedia atau tidak berjalan
- Cek koneksi ke backend service
- Pastikan `NEXT_PUBLIC_API_URL` atau `WHATSAPP_SERVICE_URL` sudah benar

## Development Mode (Tanpa Backend)

Jika backend WhatsApp service belum siap, endpoint proxy akan mengembalikan:
- Status: `DISCONNECTED` dengan state `DISCONNECTED`
- QR: Error 503 dengan pesan bahwa service tidak tersedia
- Reconnect: Error 503 dengan pesan bahwa service tidak tersedia

Ini normal dan tidak akan merusak dashboard. Setelah backend service siap, endpoint akan otomatis terhubung.
