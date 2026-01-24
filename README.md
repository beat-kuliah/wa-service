# WA Service Dashboard

Dashboard modern untuk WhatsApp Service menggunakan Next.js dan Tailwind CSS.

## 🚀 Fitur

- ✅ **Dashboard Overview** - Statistik lengkap messages, chats, dan WhatsApp status
- ✅ **Messages Management** - Lihat dan filter semua pesan yang dikirim
- ✅ **Chats Management** - Kelola chat masuk dari WhatsApp
- ✅ **Templates Management** - CRUD template pesan dengan variable support
- ✅ **API Tokens Management** - Kelola API tokens untuk akses service
- ✅ **WhatsApp Connection** - Monitor status koneksi dan scan QR code
- ✅ **Authentication** - Login system dengan JWT token
- ✅ **Real-time Updates** - Auto refresh data setiap beberapa detik

## 📋 Prerequisites

- Node.js >= 18.x
- npm atau yarn
- WA Service API running (default: http://localhost:3000)

## 🛠️ Installation

1. Install dependencies:
```bash
npm install
```

2. Setup environment variables:
Buat file `.env.local` di root folder:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_API_KEY=your-api-key-here
```

3. Run development server:
```bash
npm run dev
```

Dashboard akan berjalan di `http://localhost:3001` (atau port yang tersedia)

## 📁 Project Structure

```
wa-service-new/
├── app/
│   ├── api-tokens/      # API Tokens management page
│   ├── chats/           # Chats management page
│   ├── login/           # Login page
│   ├── messages/        # Messages management page
│   ├── templates/       # Templates management page
│   ├── whatsapp/        # WhatsApp connection page
│   ├── globals.css      # Global styles
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Dashboard home page
├── components/
│   ├── AuthGuard.tsx    # Authentication guard
│   ├── Sidebar.tsx      # Navigation sidebar
│   └── StatsCard.tsx     # Statistics card component
├── lib/
│   └── api.ts           # API client dan types
└── package.json
```

## 🔐 Authentication

Dashboard menggunakan JWT token authentication. Setelah login, token akan disimpan di localStorage dan digunakan untuk semua API requests.

### Login
1. Buka `/login`
2. Masukkan username dan password admin
3. Token akan otomatis disimpan dan redirect ke dashboard

### Logout
Klik tombol "Logout" di sidebar untuk menghapus token dan redirect ke login page.

## 📱 Pages

### Dashboard (`/`)
- Overview statistics (messages, chats, WhatsApp status)
- Message status distribution chart
- Real-time updates setiap 30 detik

### Messages (`/messages`)
- Daftar semua pesan yang dikirim
- Filter berdasarkan status (Pending, Queued, Sent, Failed)
- Detail message (phone number, status, retry count)

### Chats (`/chats`)
- Daftar chat masuk dari WhatsApp
- Filter berdasarkan read/unread status
- Tampilkan triggered chats

### Templates (`/templates`)
- CRUD template pesan
- Support variable dengan format `{{variableName}}`
- Preview template dengan variables

### API Tokens (`/api-tokens`)
- Daftar semua API tokens
- Create, revoke, dan delete tokens
- Monitor token usage dan expiration

### WhatsApp (`/whatsapp`)
- Status koneksi WhatsApp (Connected/Disconnected)
- QR Code untuk koneksi baru
- Reconnect functionality
- Real-time status updates setiap 5 detik

## 🔌 API Integration

Dashboard terhubung ke WA Service API melalui:
- Base URL: `NEXT_PUBLIC_API_URL` (default: http://localhost:3000/api)
- Authentication: JWT Bearer token (untuk admin endpoints)
- API Key: `NEXT_PUBLIC_API_KEY` (untuk WhatsApp endpoints)

### API Endpoints Used

- `POST /admin/login` - Admin login
- `GET /admin/dashboard` - Dashboard statistics
- `GET /admin/messages` - Get all messages (may need to be created in wa-service)
- `GET /messages/status/:id` - Get message details
- `GET /templates` - Get all templates
- `POST /templates` - Create template
- `PUT /templates/:id` - Update template
- `DELETE /templates/:id` - Delete template
- `GET /admin/chats` - Get all chats
- `GET /admin/api-tokens` - Get all API tokens
- `POST /admin/api-tokens` - Create API token
- `POST /admin/api-tokens/:id/revoke` - Revoke token
- `DELETE /admin/api-tokens/:id` - Delete token
- `GET /api/whatsapp/status` - Get WhatsApp status (direct implementation)
- `GET /api/whatsapp/qr` - Get QR code (direct implementation)
- `POST /api/whatsapp/reconnect` - Reconnect WhatsApp (direct implementation)

**Note**: Endpoint WhatsApp sekarang diimplementasikan langsung di service ini (bukan proxy). 
Lihat `WHATSAPP_INTEGRATION.md` untuk panduan integrasi dengan library WhatsApp yang sebenarnya.

## 🎨 Styling

Dashboard menggunakan Tailwind CSS untuk styling dengan:
- Modern, clean design
- Responsive layout
- Dark sidebar dengan light content area
- Color-coded status indicators
- Smooth transitions dan hover effects

## 🚀 Build untuk Production

```bash
npm run build
npm start
```

## 📝 Notes

1. **CORS**: Pastikan WA Service API mengizinkan request dari dashboard domain
2. **API URL**: Sesuaikan `NEXT_PUBLIC_API_URL` jika WA Service berjalan di port/domain berbeda
3. **API Key**: Untuk fitur WhatsApp (QR code, reconnect), pastikan `NEXT_PUBLIC_API_KEY` sudah di-set
4. **Token Storage**: Token disimpan di localStorage, pastikan menggunakan HTTPS di production

## 🐛 Troubleshooting

### Cannot connect to API
- Pastikan WA Service API sudah running
- Check `NEXT_PUBLIC_API_URL` di `.env.local`
- Check browser console untuk error details

### Login failed
- Pastikan username dan password admin benar
- Check WA Service API logs untuk error details
- Pastikan endpoint `/admin/login` tersedia

### QR Code tidak muncul
- Pastikan `NEXT_PUBLIC_API_KEY` sudah di-set
- Check WhatsApp connection status
- Pastikan endpoint `/whatsapp/qr` mengembalikan QR code

## 📄 License

ISC

---

**Made with ❤️ using Next.js & Tailwind CSS**
