# αlfa Backend Server

Backend API untuk αlfa Secure Personal Vault.

## Fitur

- ✅ **Contact Form API** - Endpoint untuk mengirim pesan kontak dengan validasi
- ✅ **Vault API** - Manajemen item vault (secure storage)
- ✅ **Authentication API** - WebAuthn/passkey authentication flow
- ✅ **Rate Limiting** - Proteksi terhadap abuse (10 requests/menit per IP)
- ✅ **Honeypot Protection** - Bot detection di frontend dan backend
- ✅ **CORS Enabled** - Konfigurasi aman untuk localhost development

## Instalasi

```bash
cd backend
npm install
```

## Menjalankan Server

### Development Mode (auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

Server akan berjalan di `http://localhost:3000`

## API Endpoints

### Health Check
```
GET /api/health
```

### Contact Form
```
POST /api/contact
Body: { "name": "...", "email": "...", "subject": "...", "message": "..." }
```

### Vault
```
GET  /api/vault              - List semua vault items
POST /api/vault              - Buat vault item baru
Body: { "name": "...", "type": "...", "data": "..." }
```

### Authentication
```
POST /api/auth/initiate      - Mulai sesi autentikasi
POST /api/auth/verify        - Verifikasi credential
```

### Admin (tanpa auth - tambahkan middleware di production)
```
GET    /api/admin/contacts   - List semua kontak
DELETE /api/admin/contacts/:id - Hapus kontak
```

## Struktur Project

```
backend/
├── server.js          # Main server file
├── .env               # Environment variables
├── package.json       # Dependencies
└── node_modules/      # Installed packages
```

## Environment Variables

Edit file `.env`:

```env
PORT=3000
NODE_ENV=development
```

## Keamanan (Production Checklist)

- [ ] Ganti in-memory storage dengan database (PostgreSQL/MongoDB)
- [ ] Tambahkan JWT authentication untuk admin endpoints
- [ ] Enkripsi data vault sebelum disimpan
- [ ] Gunakan HTTPS
- [ ] Implementasi proper WebAuthn dengan navigator.credentials
- [ ] Tambahkan logging dan monitoring
- [ ] Setup database backup

## Testing

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
  -d '{"name":"Secret","type":"password","data":"encrypted"}'

# Get vault items
curl http://localhost:3000/api/vault
```

## License

ISC
