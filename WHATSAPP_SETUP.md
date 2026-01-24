# WhatsApp Endpoints Setup Guide

## Masalah: Same Service Detection

Jika Anda melihat error:
```
⚠️ Same service detected (same origin), cannot fetch QR from ourselves to prevent loop
   Current origin: http://localhost:3000
   Target origin: http://localhost:3000
```

Ini berarti dashboard dan backend WhatsApp service berjalan di **port yang sama**, sehingga endpoint proxy tidak bisa memanggil external service.

## Solusi

### Opsi 1: Jalankan Dashboard di Port Berbeda (Recommended)

Dashboard seharusnya berjalan di port yang berbeda dari backend WhatsApp service:

1. **Backend WhatsApp Service**: `http://localhost:3000`
2. **Dashboard**: `http://localhost:3001` (atau port lain)

Cara setup:
```bash
# Dashboard akan otomatis menggunakan port yang tersedia
npm run dev
# Biasanya akan berjalan di http://localhost:3001
```

Atau set port secara eksplisit di `package.json`:
```json
{
  "scripts": {
    "dev": "next dev -p 3001"
  }
}
```

### Opsi 2: Konfigurasi WHATSAPP_SERVICE_URL

Jika dashboard dan backend harus di port yang sama, set `WHATSAPP_SERVICE_URL` ke service yang berbeda:

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000/api
WHATSAPP_SERVICE_URL=http://localhost:3002  # WhatsApp service di port berbeda
```

### Opsi 3: Implementasi Endpoint WhatsApp Langsung

Jika backend WhatsApp service tidak tersedia sebagai service terpisah, Anda bisa mengimplementasikan endpoint WhatsApp langsung di dashboard ini:

1. Buat endpoint `/api/whatsapp/qr` yang tidak proxy (implementasi langsung)
2. Buat endpoint `/api/whatsapp/status` yang tidak proxy
3. Buat endpoint `/api/whatsapp/reconnect` yang tidak proxy

Lihat `WHATSAPP_ENDPOINTS.md` untuk contoh implementasi.

## Konfigurasi yang Benar

### Scenario 1: Dashboard dan Backend Terpisah (Recommended)

```env
# Dashboard (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3000/api
WHATSAPP_SERVICE_URL=http://localhost:3000  # Backend WhatsApp service
```

- Dashboard: `http://localhost:3001`
- Backend: `http://localhost:3000`
- ✅ Bekerja dengan baik

### Scenario 2: Semua di Port Sama (Tidak Recommended)

Jika semua harus di port yang sama, endpoint WhatsApp harus diimplementasikan langsung (bukan proxy):

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000/api
# Jangan set WHATSAPP_SERVICE_URL, atau set ke URL yang berbeda
```

Lalu implementasikan endpoint WhatsApp langsung di `app/api/whatsapp/`.

## Troubleshooting

### Error: "Same service detected"

**Penyebab**: Dashboard dan backend WhatsApp service di port yang sama.

**Solusi**:
1. Pastikan dashboard berjalan di port berbeda (default: 3001)
2. Atau set `WHATSAPP_SERVICE_URL` ke service yang berbeda
3. Atau implementasikan endpoint WhatsApp langsung

### Error: "Cannot connect to backend"

**Penyebab**: Backend WhatsApp service tidak tersedia atau tidak berjalan.

**Solusi**:
1. Pastikan backend WhatsApp service berjalan
2. Check `WHATSAPP_SERVICE_URL` di `.env.local`
3. Pastikan endpoint `/whatsapp/status`, `/whatsapp/qr`, `/whatsapp/reconnect` ada di backend

### Error: 404 Not Found

**Penyebab**: Endpoint WhatsApp tidak ada di backend.

**Solusi**:
1. Implementasikan endpoint di backend WhatsApp service
2. Lihat `WHATSAPP_ENDPOINTS.md` untuk contoh implementasi
3. Atau implementasikan endpoint langsung di dashboard

## Catatan

Endpoint WhatsApp di dashboard (`/api/whatsapp/*`) adalah **proxy endpoints** yang memanggil backend WhatsApp service. Mereka tidak mengimplementasikan logika WhatsApp secara langsung.

Jika backend WhatsApp service tidak tersedia sebagai service terpisah, Anda perlu:
1. Mengimplementasikan endpoint WhatsApp langsung di dashboard, atau
2. Mengkonfigurasi `WHATSAPP_SERVICE_URL` ke service yang berbeda
