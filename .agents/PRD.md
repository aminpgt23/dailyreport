# PRD — Maintenance Daily Report

## Bagian 1: Visi & Tujuan Produk

### Visi Produk
Aplikasi Maintenance Daily Report yang mendokumentasikan seluruh aktivitas perbaikan dan perawatan aset perusahaan secara digital, sehingga setiap log pekerjaan, riwayat kerusakan aset, dan man hour pekerja tercatat rapi, mudah dicari, dan dapat dianalisis untuk meningkatkan efisiensi operasional.

### Tujuan Utama
1. **Digitalisasi daily report** — menggantikan laporan WhatsApp dengan sistem database terpusat.
2. **Dokumentasi riwayat aset** — setiap kerusakan dan perbaikan tercatat dan mudah ditemukan kembali.
3. **Pelacakan man hour** — menghitung total jam kerja dan persentase jam kerja setiap pekerja per shift.
4. **Visibilitas progres shift** — mengetahui jumlah pekerjaan selesai vs belum selesai secara real-time.

### Value Proposition
- Data tersimpan rapi di database — tidak hilang tertimbun chat WhatsApp.
- Pencarian data kerusakan aset cepat — tinggal search, tidak perlu scroll chat berbulan-bulan.
- Man hour otomatis terhitung — memudahkan evaluasi produktivitas pekerja.
- Persentase jam kerja real-time — membantu supervisor mengambil keputusan cepat.

---

## Bagian 2: User Persona

### Persona 1: Hendra — Supervisor Maintenance
- **Usia/Pekerjaan:** 38 tahun, Supervisor Maintenance
- **Level Teknis:** Menengah — bisa pakai smartphone & web
- **Tujuan:** Ingin memantau pekerjaan tim, melihat progres shift, dan mengevaluasi performa pekerja.
- **Pain Points:** Report di WhatsApp campur aduk, susah rekap data harian, tidak bisa lihat siapa yang produktif.
- **Motivasi:** Butuh data akurat untuk laporan ke atasan dan evaluasi tim.

### Persona 2: Dimas — Teknisi Lapangan
- **Usia/Pekerjaan:** 26 tahun, Teknisi Maintenance
- **Level Teknis:** Dasar — terbiasa pakai smartphone
- **Tujuan:** Ingin melapor tugas harian dengan cepat tanpa ribet.
- **Pain Points:** Tiap shift harus ngetik manual di WhatsApp, sering lupa atau kehapus, repot kalau mau cari riwayat perbaikan aset.
- **Motivasi:** Ingin pekerjaan terdokumentasi rapi dan gampang dicari.

---

## Bagian 3: User Stories

### Modul 1: Autentikasi & Manajemen Akun
1. Sebagai pengguna, saya ingin login dengan NIP dan password, agar bisa mengakses aplikasi.
2. Sebagai admin, saya ingin menambah/mengelola akun pekerja (NIP, NAMA, ROLE, GROUP, AREA), agar hanya karyawan aktif yang bisa pakai aplikasi.

### Modul 2: Daily Report
3. Sebagai teknisi, saya ingin membuat laporan harian dengan mengisi form (tanggal, kategori, No EJO/WO, asset number, deskripsi, action perbaikan, PIC, status akhir), agar pekerjaan terdokumentasi.
4. Sebagai teknisi, saya ingin **copy laporan ke clipboard dengan format rapi**, agar bisa paste langsung ke WhatsApp.
5. Sebagai teknisi, saya ingin melihat riwayat laporan saya sendiri, agar mudah mengingat pekerjaan sebelumnya.

### Modul 3: Manajemen Aset
6. Sebagai supervisor, saya ingin mencari data kerusakan aset berdasarkan asset number, agar cepat menemukan riwayat perbaikannya.
7. Sebagai supervisor, saya ingin melihat total kerusakan per aset, agar tahu aset mana yang paling sering bermasalah.

### Modul 4: Monitoring Shift & Produktivitas
8. Sebagai supervisor, saya ingin melihat daftar pekerjaan per shift (selesai/belum selesai), agar tahu progres harian.
9. Sebagai supervisor, saya ingin melihat **total man hour** setiap pekerja, agar bisa evaluasi produktivitas.
10. Sebagai supervisor, saya ingin melihat **persentase jam kerja** setiap pekerja, agar tahu utilisasi tenaga kerja.

### Modul 5: Laporan & Rekapitulasi
11. Sebagai supervisor, saya ingin melihat rekap laporan harian/mingguan/bulanan, agar mudah buat laporan ke atasan.
12. Sebagai supervisor, saya ingin mengekspor data ke Excel/CSV, agar bisa diolah lebih lanjut.

---

## Bagian 4: Functional Requirements

### Modul 1: Autentikasi
**FR-01: Login Pengguna**
- **Input:** NIP, password
- **Proses:** Verifikasi kredensial, generate session/token
- **Output:** Akses ke dashboard sesuai role
- **Aturan:** Role: Admin & Teknisi; password minimal 6 karakter

**FR-02: Manajemen Akun (Admin)**
- **Input:** NIP, NAMA, ROLE, GROUP, AREA
- **Proses:** CRUD pengguna
- **Output:** Akun aktif/nonaktif
- **Aturan:** Hanya admin yang bisa akses

### Modul 2: Daily Report Form
**FR-03: Buat Laporan Harian**
- **Input:** Tanggal, Kategori Pekerjaan (EJO/WO, Preventive Maintenance, Added Schedule, Improvement, Administration, Request), No EJO/WO, Asset Number, Deskripsi Pekerjaan, Action Perbaikan (multiple — jam mulai, jam selesai, deskripsi action), PIC (multiple user), Status Akhir
- **Proses:** Validasi & simpan ke database
- **Output:** Laporan tersimpan
- **Aturan:** Wajib isi tanggal, kategori, deskripsi, minimal 1 action, minimal 1 PIC

### Modul 3: Copy to Clipboard
**FR-04: Copy Laporan ke WhatsApp**
- **Input:** Satu laporan yang sudah di-submit
- **Proses:** Generate teks format rapi
- **Output:** Teks ter-copy ke clipboard
- **Aturan:** Format:
  `No. AssetNumber Deskripsi pekerjaan status`
  `> action (jam mulai - jam selesai)`

### Modul 4: Pencarian & Riwayat Aset
**FR-05: Cari Riwayat Aset**
- **Input:** Asset Number atau nama aset
- **Proses:** Filter laporan berdasarkan aset
- **Output:** Daftar riwayat perbaikan aset tersebut

### Modul 5: Monitoring Shift
**FR-06: Dashboard Shift**
- **Input:** Filter shift & tanggal
- **Proses:** Hitung total pekerjaan, status selesai/belum
- **Output:** Ringkasan per shift

### Modul 6: Man Hour & Persentase
**FR-07: Hitung Man Hour Pekerja**
- **Input:** Periode (tanggal mulai-akhir) & pekerja
- **Proses:** Akumulasi durasi action per pekerja
- **Output:** Total jam kerja per pekerja

**FR-08: Persentase Jam Kerja**
- **Input:** Shift & tanggal
- **Proses:** Bandingkan jam kerja riil vs jam kerja standar shift
- **Output:** Persentase utilisasi per pekerja

### Modul 7: Ekspor Data
**FR-09: Ekspor ke Excel/CSV**
- **Input:** Filter periode
- **Proses:** Generate file export
- **Output:** File .xlsx/.csv

---

## Bagian 5: Non-Functional Requirements

### Performa
- Waktu muat halaman < 2 detik
- API response < 500ms
- Support 50-100 user concurrent (skala perusahaan)

### Keamanan
- Password di-hash (bcrypt)
- Session/token expiry
- Role-based access control (Admin vs Teknisi)
- Data hanya bisa diakses oleh user yang berwenang

### Skalabilitas
- Database bisa menampung ribuan laporan per bulan
- Siap untuk penambahan pengguna

### Usability
- **Mobile-first** — teknisi banyak pakai smartphone
- Tampilan responsif (mobile, tablet, desktop)
- Bahasa Indonesia
- Mudah digunakan (minimal klik untuk lapor harian)
- Format copy WhatsApp sudah auto-generate
- **PWA** — bisa diinstall langsung dari browser (manifest + service worker)

### Platform
- **Web-based** (bisa diakses via browser HP & desktop)
- Tidak perlu install aplikasi

---

## Bagian 6: Out of Scope & Dependensi

### Out of Scope (V1)
- Notifikasi real-time
- Aplikasi mobile native (Android/iOS) — cukup PWA
- Integrasi dengan SAP/ERP perusahaan
- Manajemen inventori suku cadang
- Multi-bahasa — hanya Bahasa Indonesia

### Dependensi
- **Frontend:** React/Next.js + Tailwind CSS
- **Backend:** Node.js/Express atau Next.js API
- **Database:** PostgreSQL / MySQL / SQLite
- **PWA:** next-pwa atau workbox (manifest + service worker)
- **Hosting:** Vercel / Netlify / server sendiri
- **Autentikasi:** NextAuth / JWT manual

### Asumsi
- Setiap pekerja punya smartphone dengan browser modern
- Koneksi internet stabil saat mengakses
- Admin bertanggung jawab mengelola data pengguna
- Format WhatsApp sudah standar dan bisa di-copy manual
