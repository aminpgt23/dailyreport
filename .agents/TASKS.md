# Task List — Maintenance Daily Report

## 🏗️ T-01: Setup Project
- Init Next.js 14+ (App Router) + TypeScript + Tailwind
- Struktur folder sesuai Tech Spec
- Setup Prisma + MySQL connection
- Setup env (`DATABASE_URL`, `JWT_SECRET`)
- Setup `@serwist/next` untuk PWA
- **Prioritas:** High | **Estimasi:** 1 hari

## 🗃️ T-02: Database Schema & Migrasi
- Buat model `User`, `Report`, `Action`, `ReportPIC` di Prisma
- Jalankan migrasi
- Buat seeder user admin default (NIP: admin, password: admin123)
- **Prioritas:** High | **Dependensi:** T-01

## 🔐 T-03: Autentikasi (Login/Logout)
- API: `POST /api/auth/login` (validasi NIP + password, generate JWT)
- API: `POST /api/auth/logout`
- Halaman login (`/(auth)/login/page.tsx`)
- `middleware.ts` — proteksi route + redirect if no token
- **Prioritas:** High | **Dependensi:** T-02

## 👥 T-04: Manajemen Akun (Admin)
- API CRUD users (`/api/users`)
- Halaman manage users (`/(dashboard)/users/`)
- Form tambah/edit user (NIP, NAMA, ROLE, GROUP, AREA)
- **Prioritas:** Mid | **Dependensi:** T-03

## 📝 T-05: Form Buat Laporan
- Halaman form (`/(dashboard)/reports/create`)
- Fields: tanggal, kategori (dropdown), No EJO/WO, Asset Number, Deskripsi
- Dynamic actions: tambah/hapus action (jam mulai, jam selesai, deskripsi)
- Multiple PIC picker (dropdown user)
- Status akhir (dropdown)
- API: `POST /api/reports` (transaction: Report + Action + ReportPIC)
- **Prioritas:** High | **Dependensi:** T-03, T-02

## 📋 T-06: List & Detail Laporan
- Halaman list laporan (`/(dashboard)/reports/`) dengan filter tanggal
- Halaman detail laporan (`/(dashboard)/reports/[id]`)
- API: `GET /api/reports`, `GET /api/reports/[id]`
- **Prioritas:** High | **Dependensi:** T-05

## ✂️ T-07: Copy to Clipboard
- Tombol copy di halaman detail laporan & list
- Generate format:
  ```
  No. AssetNumber Deskripsi status
  > action (jamMulai - jamSelesai)
  ```
- **Prioritas:** High | **Dependensi:** T-05

## 📝 T-08: Edit & Hapus Laporan
- API: `PUT /api/reports/[id]`, `DELETE /api/reports/[id]`
- Halaman edit (`/(dashboard)/reports/[id]/edit`)
- Konfirmasi hapus
- **Prioritas:** Mid | **Dependensi:** T-05, T-06

## 🔍 T-09: Pencarian Riwayat Aset
- Halaman pencarian (`/(dashboard)/assets/`)
- Search by Asset Number
- Tampilkan riwayat laporan per aset
- API: `GET /api/assets/search?q=...`
- **Prioritas:** Mid | **Dependensi:** T-06

## 📊 T-10: Dashboard Shift
- Halaman monitoring shift (`/(dashboard)/shift/`)
- Filter tanggal & shift
- Ringkasan: total pekerjaan, selesai, belum selesai
- API: `GET /api/shift`
- **Prioritas:** Mid | **Dependensi:** T-06

## ⏱️ T-11: Man Hour & Persentase
- Halaman (`/(dashboard)/manhour/`)
- Filter periode & pekerja
- Tampilkan total jam kerja per pekerja
- Persentase utilisasi (vs jam kerja standar shift)
- API: `GET /api/manhour`
- **Prioritas:** Mid | **Dependensi:** T-06

## 📤 T-12: Ekspor Excel/CSV
- Tombol export di halaman laporan
- API: `GET /api/reports/export?start=...&end=...`
- Generate file .xlsx (pakai `exceljs` atau `xlsx`)
- **Prioritas:** Low | **Dependensi:** T-06

## 📱 T-13: PWA Setup
- Generate manifest.json
- Buat service worker (cache static + API cache strategy)
- Test install prompt di browser
- **Prioritas:** Low | **Dependensi:** T-01
