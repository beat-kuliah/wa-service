# Setup Super Admin Pertama

## Cara Membuat Super Admin Pertama

Setelah database migration selesai, Anda perlu membuat super admin pertama untuk bisa login ke dashboard.

### Metode 1: Menggunakan Seed Script (Recommended)

1. **Pastikan DATABASE_URL sudah di-set** di `.env.local`:
   ```env
   DATABASE_URL="postgresql://postgres:password@localhost:5432/wa_service?schema=public"
   ```

2. **Jalankan seed script**:
   ```bash
   npm run prisma:seed
   ```

   Script akan membuat super admin dengan default credentials:
   - **Username**: `admin`
   - **Password**: `admin123`
   - **Email**: `admin@example.com`
   - **Role**: `SUPER_ADMIN`

3. **Custom credentials** (optional):
   Anda bisa set custom credentials via environment variables:
   ```bash
   SEED_ADMIN_USERNAME=myadmin \
   SEED_ADMIN_PASSWORD=SecurePass123! \
   SEED_ADMIN_EMAIL=myadmin@example.com \
   npm run prisma:seed
   ```

### Metode 2: Menggunakan Prisma Studio

1. **Buka Prisma Studio**:
   ```bash
   npm run prisma:studio
   ```

2. **Buka browser** ke `http://localhost:5555`

3. **Pilih model `Admin`** dan klik "Add record"

4. **Isi data**:
   - `username`: (contoh: `admin`)
   - `password`: (harus di-hash dengan bcrypt, lihat cara di bawah)
   - `email`: (optional)
   - `role`: Pilih `SUPER_ADMIN`
   - `isActive`: `true`

5. **Untuk hash password**, gunakan Node.js:
   ```bash
   node -e "const bcrypt = require('bcrypt'); bcrypt.hash('yourpassword', 10).then(h => console.log(h))"
   ```

### Metode 3: Menggunakan SQL Langsung

Jika Anda lebih nyaman dengan SQL:

```sql
-- Hash password dulu (gunakan bcrypt, salt rounds 10)
-- Contoh: password "admin123" -> hash akan berbeda setiap kali
-- Gunakan Node.js untuk generate hash:
-- node -e "const bcrypt = require('bcrypt'); bcrypt.hash('admin123', 10).then(h => console.log(h))"

INSERT INTO admins (id, username, password, email, role, "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin',
  '$2b$10$YourHashedPasswordHere', -- Ganti dengan hash yang di-generate
  'admin@example.com',
  'SUPER_ADMIN',
  true,
  NOW(),
  NOW()
);
```

**Cara generate hash password**:
```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('admin123', 10).then(h => console.log(h))"
```

## Setelah Super Admin Dibuat

1. **Login ke dashboard** dengan credentials yang sudah dibuat
2. **Ubah password default** segera setelah login pertama kali
3. **Buka halaman Users** (`/users`) untuk membuat admin tambahan

## Troubleshooting

### Error: "Cannot find module 'bcrypt'"
```bash
npm install bcrypt @types/bcrypt
```

### Error: "Cannot find module 'tsx'"
```bash
npm install --save-dev tsx
```

### Error: "DATABASE_URL is required"
Pastikan `.env.local` sudah di-set dengan benar:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/wa_service?schema=public"
```

### Error: "Can't reach database server"
- Pastikan PostgreSQL server sudah running
- Check koneksi database dengan: `psql -U postgres -d wa_service`
- Pastikan username, password, dan database name benar

## Security Notes

⚠️ **PENTING**: 
- Default password `admin123` sangat tidak aman
- **WAJIB** ubah password setelah login pertama kali
- Jangan commit `.env.local` ke git
- Gunakan password yang kuat (minimal 12 karakter, kombinasi huruf, angka, simbol)

## Next Steps

Setelah super admin dibuat:
1. Login ke dashboard
2. Ubah password default
3. Buat admin tambahan melalui halaman Users Management
4. Setup API endpoints di backend wa-service (lihat `USER_MANAGEMENT.md`)
