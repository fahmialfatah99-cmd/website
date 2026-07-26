# αlfa Backend Server

> **Secure Personal Vault API dengan Enkripsi AES-256-GCM**  
> Copyright © 2024 Fahmi Alfatah. All Rights Reserved.

Backend API untuk αlfa Secure Personal Vault dengan fitur keamanan tingkat lanjut.

## ✨ Fitur Utama

- ✅ **Contact Form API** - Endpoint untuk mengirim pesan kontak dengan validasi lengkap
- ✅ **Vault API** - Manajemen item vault dengan enkripsi AES-256-GCM
- ✅ **Authentication API** - WebAuthn/passkey authentication flow
- ✅ **Rate Limiting** - Proteksi terhadap abuse (10 requests/menit per IP)
- ✅ **Security Headers** - Helmet.js untuk security headers optimal
- ✅ **XSS Protection** - Sanitasi input dari serangan XSS
- ✅ **HPP Protection** - Pencegahan HTTP Parameter Pollution
- ✅ **CORS Enabled** - Konfigurasi aman untuk localhost development
- ✅ **Enkripsi Data** - Semua data sensitif dienkripsi sebelum disimpan

## 📦 Instalasi

```bash
cd backend
npm install
```

### Prerequisites

- Node.js >= 18.x
- npm atau bun package manager

## 🚀 Menjalankan Server

### Development Mode (auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

Server akan berjalan di `http://localhost:3000`

## 📡 API Endpoints

### Health Check
```http
GET /api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.45
}
```

### Contact Form
```http
POST /api/contact
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "subject": "Pertanyaan",
  "message": "Halo, saya ingin bertanya..."
}
```

Response:
```json
{
  "success": true,
  "message": "Message encrypted and sent successfully",
  "ticketId": "abc12345"
}
```

### Vault API

#### List semua vault items
```http
GET /api/vault
```

#### Buat vault item baru (data akan dienkripsi otomatis)
```http
POST /api/vault
Content-Type: application/json

{
  "name": "Password Email",
  "type": "password",
  "data": {
    "username": "user@email.com",
    "password": "secret123"
  }
}
```

#### Ambil vault item spesifik (dengan dekripsi otomatis)
```http
GET /api/vault/:id
```

#### Hapus vault item
```http
DELETE /api/vault/:id
```

### Authentication API

#### Mulai sesi autentikasi
```http
POST /api/auth/initiate
```

#### Verifikasi credential WebAuthn
```http
POST /api/auth/verify
Content-Type: application/json

{
  "sessionId": "uuid-session-id",
  "credential": { ... }
}
```

### Admin Endpoints

> ⚠️ **Note**: Admin endpoints memerlukan ADMIN_TOKEN yang dikonfigurasi di environment variables.

#### List semua kontak
```http
GET /api/admin/contacts
Authorization: Bearer <ADMIN_TOKEN>
```

#### Hapus kontak
```http
DELETE /api/admin/contacts/:id
Authorization: Bearer <ADMIN_TOKEN>
```

## 🏗️ Struktur Project

```
backend/
├── server.js          # Main server file
├── .env               # Environment variables (buat file ini)
├── .env.example       # Template environment variables
├── package.json       # Dependencies
├── README.md          # Dokumentasi
└── node_modules/      # Installed packages
```

## 🔐 Environment Variables

Buat file `.env` di folder `backend/`:

```env
PORT=3000
NODE_ENV=development
ENCRYPTION_KEY=<32-character-hex-key-optional>
ADMIN_TOKEN=<your-secret-admin-token>
```

### Generate ENCRYPTION_KEY (opsional)

Jika tidak disediakan, server akan generate key otomatis setiap restart:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🧪 Testing

Test dengan curl:

```bash
# Health check
curl http://localhost:3000/api/health

# Send contact message
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","message":"Hello"}'

# Create vault item
curl -X POST http://localhost:3000/api/vault \
  -H "Content-Type: application/json" \
  -d '{"name":"Secret","type":"password","data":{"user":"admin","pass":"123"}}'

# Get vault items
curl http://localhost:3000/api/vault

# Get specific vault item (will decrypt data)
curl http://localhost:3000/api/vault/<item-id>

# Delete vault item
curl -X DELETE http://localhost:3000/api/vault/<item-id>
```

## 🛡️ Keamanan (Production Checklist)

Untuk deployment production, pastikan:

- [ ] Ganti in-memory storage dengan database (PostgreSQL/MongoDB)
- [ ] Gunakan HTTPS dengan SSL certificate valid
- [ ] Set `NODE_ENV=production`
- [ ] Generate dan simpan `ENCRYPTION_KEY` di environment variable
- [ ] Set `ADMIN_TOKEN` yang kuat dan unik
- [ ] Implementasi proper WebAuthn dengan navigator.credentials
- [ ] Tambahkan logging dan monitoring (Winston, Sentry, dll)
- [ ] Setup database backup reguler
- [ ] Konfigurasi firewall dan rate limiting yang lebih ketat
- [ ] Scan dependencies untuk vulnerabilities (`npm audit`)

## 📝 Error Handling

API menggunakan standar HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

## 📄 License

ISC

---

**Copyright © 2024 Fahmi Alfatah. All Rights Reserved.**

Dibuat dengan ❤️ untuk keamanan data Anda.
