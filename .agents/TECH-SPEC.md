# Tech Spec — Maintenance Daily Report

## Bagian 1: Tech Stack & Arsitektur

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| State | Server Components + React Query (client) |
| Backend | Next.js API Routes |
| Database | MySQL |
| ORM | Prisma |
| Auth | JWT (NIP + password → token) |
| PWA | @serwist/next |
| Hosting | Server sendiri (VPS) — PM2 + Nginx reverse proxy |

### Arsitektur
```
Browser (HP/Desktop)
    ↓
Nginx (reverse proxy)
    ↓
Next.js (Node.js — PM2)
    ↓
Prisma ORM
    ↓
MySQL
```

### Struktur Folder
```
src/
├── app/
│   ├── (auth)/          → login page
│   ├── (dashboard)/     → dashboard (protected)
│   │   ├── reports/     → CRUD laporan
│   │   ├── assets/      → cari riwayat aset
│   │   ├── shift/       → monitoring shift
│   │   ├── manhour/     → man hour & persentase
│   │   └── users/       → manajemen akun (admin)
│   ├── api/
│   │   ├── auth/        → login API
│   │   ├── reports/     → CRUD laporan
│   │   ├── assets/      → pencarian aset
│   │   ├── shift/       → data shift
│   │   ├── manhour/     → kalkulasi man hour
│   │   └── users/       → CRUD user (admin)
│   ├── layout.tsx
│   └── page.tsx
├── components/          → reusable UI components
├── lib/
│   ├── prisma.ts        → Prisma client
│   ├── auth.ts          → JWT helpers
│   └── utils.ts         → helpers
├── middleware.ts        → auth middleware (route protection)
├── prisma/
│   └── schema.prisma    → database schema
└── public/
    ├── manifest.json    → PWA manifest
    └── sw.js            → service worker
```

---

## Bagian 2: Database Design

### Entity Overview

| Entity | Key Fields | Relasi |
|--------|-----------|--------|
| User | id, nip, nama, role, group, area, password | → Report (1:N via PIC) |
| Report | id, date, kategori, no_ejo_wo, asset_number, deskripsi, status_akhir | → Action (1:N), → ReportPIC (1:N) |
| Action | id, report_id, jam_mulai, jam_selesai, deskripsi | ← Report (N:1) |
| ReportPIC | id, report_id, user_id | ← Report, ← User |

### Detail Fields (Prisma Schema)

```prisma
model User {
  id        Int      @id @default(autoincrement())
  nip       String   @unique
  nama      String
  role      String   // "admin" | "teknisi"
  group     String?
  area      String?
  password  String   // bcrypt hash
  createdAt DateTime @default(now())

  reportPICs ReportPIC[]
}

model Report {
  id           Int      @id @default(autoincrement())
  date         DateTime
  kategori     String   // EJO/WO, Preventive, Added Schedule, Improvement, Administration, Request
  noEjoWo      String?
  assetNumber  String
  deskripsi    String
  statusAkhir  String
  createdAt    DateTime @default(now())
  createdBy    Int
  creator      User     @relation(fields: [createdBy], references: [id])

  actions    Action[]
  reportPICs ReportPIC[]
}

model Action {
  id          Int      @id @default(autoincrement())
  reportId    Int
  jamMulai    DateTime
  jamSelesai  DateTime
  deskripsi   String
  report      Report   @relation(fields: [reportId], references: [id], onDelete: Cascade)
}

model ReportPIC {
  id       Int @id @default(autoincrement())
  reportId Int
  userId   Int
  report   Report @relation(fields: [reportId], references: [id], onDelete: Cascade)
  user     User   @relation(fields: [userId], references: [id])

  @@unique([reportId, userId])
}
```

### Index Strategy
- `Report.assetNumber` — untuk pencarian riwayat aset
- `Report.date` — untuk filter tanggal/shift
- `Action.jamMulai`, `Action.jamSelesai` — untuk kalkulasi man hour
- `User.nip` — unique index (already)

---

## Bagian 3: Interface Design (API Routes)

| Method | Path | Deskripsi | Auth |
|--------|------|-----------|------|
| POST | `/api/auth/login` | Login (NIP + password) → JWT | No |
| POST | `/api/auth/logout` | Hapus session | Yes |
| GET | `/api/reports` | List laporan (filter: tanggal, shift, user) | Yes |
| POST | `/api/reports` | Buat laporan baru | Yes |
| GET | `/api/reports/[id]` | Detail laporan + actions + PICs | Yes |
| PUT | `/api/reports/[id]` | Edit laporan | Yes |
| DELETE | `/api/reports/[id]` | Hapus laporan | Yes |
| GET | `/api/assets/search` | Cari riwayat aset (q, assetNumber) | Yes |
| GET | `/api/shift` | Ringkasan per shift (total, selesai, belum) | Yes |
| GET | `/api/manhour` | Man hour & persentase per pekerja/periode | Yes |
| GET | `/api/reports/export` | Ekspor Excel/CSV | Yes |
| GET | `/api/users` | List user (admin only) | Yes |
| POST | `/api/users` | Tambah user (admin only) | Yes |
| PUT | `/api/users/[id]` | Edit user (admin only) | Yes |
| DELETE | `/api/users/[id]` | Hapus user (admin only) | Yes |

---

## Bagian 4: Alur Logika & Business Rules

### Alur Login
1. User input NIP + password
2. Backend verifikasi NIP di DB, cocokkan bcrypt hash
3. Jika valid → generate JWT token (payload: userId, role)
4. Token disimpan di cookie/httpOnly
5. Middleware Next.js cek token di setiap route protected

### Alur Buat Laporan
1. User buka form → isi tanggal, kategori, no EJO/WO, asset number, deskripsi
2. Tambah action perbaikan (jam mulai, jam selesai, deskripsi) — bisa multiple
3. Pilih PIC (multiple user)
4. Pilih status akhir
5. Submit → validasi data → simpan ke DB (transaction: Report + Action + ReportPIC)
6. Setelah submit → muncul tombol **Copy to Clipboard**
7. Format copy:
   ```
   12345 ABC-001 Perbaiki bearing rusak Selesai
   > Bongkar bearing (08:00 - 09:30)
   > Pasang bearing baru (09:30 - 11:00)
   ```

### Alur Hitung Man Hour
1. Filter periode (tanggal mulai - selesai) dan/atau pekerja
2. Query semua Action milik laporan yang PIC-nya user tersebut
3. Hitung `SUM(jamSelesai - jamMulai)` per user
4. Persentase = `(total jam kerja / jam kerja standar shift) × 100`

### Alur Dashboard Shift
1. Filter tanggal/shift
2. Hitung COUNT report → total
3. Hitung COUNT report WHERE status = "Selesai" → selesai
4. Hitung COUNT report WHERE status ≠ "Selesai" → belum selesai

### Business Rules
- Password minimal 6 karakter
- 1 laporan minimal 1 action & minimal 1 PIC
- Format copy WhatsApp sesuai aturan FR-04
- Role: admin bisa semua, teknisi hanya laporan sendiri
- Ekspor data: filter periode wajib

---

## Bagian 5: Keamanan, Performa & Deployment

### Keamanan
- Password di-hash bcrypt
- JWT token expiry 24 jam
- Middleware Next.js proteksi route
- Role-based access (admin vs teknisi)
- Validasi input di server-side

### Performa
- Prisma connection pooling
- Index pada kolom yang sering difilter
- PWA service worker untuk cache static assets
- Nginx sebagai reverse proxy + static file serving

### Deployment (Server Sendiri / VPS)
- Build: `npm run build`
- Process manager: PM2 (`pm2 start npm --name "daily-report" -- start`)
- Reverse proxy: Nginx (forward ke localhost:3000)
- Auto-start: PM2 startup
- Domain: config Nginx + SSL Let's Encrypt
- MySQL: install & setup, export env `DATABASE_URL`

### Development Setup
```bash
git clone <repo>
cd daily-report
npm install
cp .env.example .env   # isi DATABASE_URL, JWT_SECRET
npx prisma migrate dev
npm run dev
```
