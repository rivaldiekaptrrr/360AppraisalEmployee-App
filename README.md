# Empower360

Empower360 adalah sistem penilaian karyawan 360 derajat berbasis web yang terhubung dengan Google Sheets sebagai database.

---

## 📋 Fitur Utama

### Untuk Karyawan:
- ✅ Login dengan email dan password
- ✅ Melihat daftar karyawan yang harus dinilai (sesuai assignment)
- ✅ Memberikan penilaian (skala 1-5 untuk 10 kriteria dan komentar)
- ✅ Otomatis menyembunyikan karyawan yang sudah dinilai
- ✅ Mendukung fitur Self-Appraisal (Menilai diri sendiri)
- ✅ Tidak bisa menilai karyawan di luar assignment

### Untuk Admin/HRD:
- ✅ Login dengan email dan password admin
- ✅ Kelola data karyawan (tambah, edit, hapus, termasuk password)
- ✅ Kelola assignment penilaian (atur siapa menilai siapa)
- ✅ Lihat semua hasil penilaian
- ✅ Hapus hasil penilaian (jika ada kesalahan)
- ✅ Semua data tersimpan otomatis ke Google Sheets

---

## 🚀 Setup Instructions

### 1️⃣ Google Cloud Setup (WAJIB)

#### A. Buat Google Cloud Project
1. Kunjungi [Google Cloud Console](https://console.cloud.google.com/)
2. Klik **"New Project"**
3. Nama project: `Empower360`
4. Klik **"Create"**

#### B. Enable Google Sheets API
1. Pilih project yang baru dibuat
2. Buka menu **"APIs & Services"** > **"Library"**
3. Cari: `Google Sheets API`
4. Klik **"Enable"**

#### C. Buat Service Account
1. Buka **"APIs & Services"** > **"Credentials"**
2. Klik **"Create Credentials"** > **"Service Account"**
3. Isi:
   - **Service account name:** `empower360-service`
   - Klik **"Create and Continue"**
4. Role: Skip (atau pilih Basic > Editor)
5. Klik **"Done"**

#### D. Download JSON Key
1. Di halaman **Credentials**, scroll ke **"Service Accounts"**
2. Klik email service account yang baru dibuat
3. Pilih tab **"Keys"**
4. Klik **"Add Key"** > **"Create new key"**
5. Pilih format **JSON**
6. Klik **"Create"** (file akan otomatis terdownload)

#### E. Setup File Credentials
1. **Rename** file JSON yang didownload menjadi: `service_account.json`
2. **Pindahkan** file ke root folder aplikasi Anda (sejajar dengan file `server.js`)

---

### 2️⃣ Google Spreadsheet Setup

#### A. Buat Spreadsheet Baru
1. Buka [Google Sheets](https://sheets.google.com)
2. Klik **+ Blank** untuk spreadsheet baru

#### B. Buat 3 Sheet dengan Struktur Berikut:

**Sheet 1: KARYAWAN**
| Email | Nama Karyawan | Jabatan | Departemen | Password |
|-------|---------------|---------|------------|----------|
| alice@company.com | Alice Smith | Manager | HR | alice123 |
| bob@company.com | Bob Jones | Staff | IT | bob456 |
| charlie@company.com | Charlie Brown | Staff | Finance | charlie789 |

**Catatan:**
- Kolom **Password** (kolom E) adalah kode unik untuk login karyawan
- Password bisa angka, huruf, atau kombinasi

---

**Sheet 2: ASSIGNMENT_360**
| Email Penilai | Email Yang Dinilai |
|---------------|--------------------|
| alice@company.com | bob@company.com |
| alice@company.com | charlie@company.com |
| bob@company.com | alice@company.com |

**Penjelasan:**
- Alice akan menilai Bob dan Charlie
- Bob akan menilai Alice

---

**Sheet 3: HASIL_PENILAIAN**
| Timestamp | Email Penilai | Nama Penilai | Email Yang Dinilai | Nama Yang Dinilai | Nilai | Komentar |
|-----------|---------------|--------------|--------------------|-------------------|-------|----------|

**Catatan:**
- Sheet ini hanya perlu header
- Data akan diisi otomatis oleh aplikasi

---

#### C. Share Spreadsheet dengan Service Account
1. Buka file `service_account.json`
2. Cari dan copy `"client_email"`, contoh:
   ```
   "client_email": "empower360-service@empower360.iam.gserviceaccount.com"
   ```
3. Di Google Spreadsheet, klik **"Share"**
4. Paste email service account
5. Set role: **Editor**
6. Klik **"Send"**

#### D. Copy Spreadsheet ID
1. Lihat URL spreadsheet, contoh:
   ```
   https://docs.google.com/spreadsheets/d/1AbC123XyZ456-MnOpQrStUvWxYz/edit
   ```
2. Copy bagian ID (antara `/d/` dan `/edit`):
   ```
   1AbC123XyZ456-MnOpQrStUvWxYz
   ```

---

### 3️⃣ Konfigurasi Aplikasi

#### Edit File `.env`
Buka (atau buat) file `.env` di folder project Anda dan isi:

```env
PORT=3000
SPREADSHEET_ID=1AbC123XyZ456-MnOpQrStUvWxYz
SESSION_SECRET=simple_secret_key_change_me
ADMIN_EMAILS=hrd@company.com,admin@company.com
ADMIN_PASSWORD=admin123
```

**Penjelasan:**
- `SPREADSHEET_ID`: ID spreadsheet yang sudah dicopy
- `ADMIN_EMAILS`: Email admin (pisahkan dengan koma jika lebih dari 1)
- `ADMIN_PASSWORD`: Password untuk login admin

---

### 4️⃣ Install Dependencies & Run

```bash
cd folder-project-anda
npm install
npm start
```

Server akan berjalan di: **http://localhost:3000**

---

## 🧪 Mock Data Mode (Tanpa Setup)

Jika Anda ingin mencoba aplikasi tanpa melakukan setup Google Cloud dan Google Sheets, aplikasi ini mendukung **Mock Data Mode**.

### Cara Menggunakan:
1. Jalankan aplikasi tanpa file `service_account.json` atau tanpa mengisi `SPREADSHEET_ID` di `.env`.
2. Aplikasi akan otomatis mendeteksi konfigurasi yang hilang dan berjalan menggunakan data sementara di memori.

### Data Login Mock:
- **Admin:** `admin@hr.com` / `admin123`
- **Karyawan 1:** `john@hr.com` / `password1` (Dapat menilai Jane)
- **Karyawan 2:** `jane@hr.com` / `password1` (Dapat menilai John)
- **Karyawan 3:** `bob@hr.com` / `password1` (Dapat menilai John)

> [!NOTE]
> Dalam mode ini, semua perubahan data (tambah/edit/hapus) hanya tersimpan selama server berjalan dan akan hilang jika server di-restart.

---

## 🔐 Cara Login

### Login sebagai Karyawan:
```
Email: alice@company.com
Password: alice123
→ Masuk ke Employee Dashboard
```

### Login sebagai Admin/HRD:
```
Email: hrd@company.com
Password: admin123
→ Masuk ke Admin Dashboard
```

---

## 📊 Cara Kerja Sistem

### Alur Karyawan:
1. Login dengan email + password
2. Sistem menampilkan daftar karyawan yang harus dinilai
3. Pilih karyawan → Isi rating (1-5) + komentar
4. Submit → Data tersimpan ke Google Sheets
5. Karyawan yang sudah dinilai **otomatis hilang** dari daftar

### Alur Admin:
1. Login dengan email + password admin
2. **Tab Kelola Karyawan:**
   - Tambah/edit/hapus karyawan
   - Atur password karyawan
3. **Tab Kelola Assignment:**
   - Atur siapa menilai siapa
   - Tambah/hapus assignment
4. **Tab Hasil Penilaian:**
   - Lihat semua hasil penilaian
   - Hapus hasil penilaian (jika ada kesalahan)

---

## 🛡️ Keamanan

- ✅ Password authentication untuk karyawan dan admin
- ✅ Session management
- ✅ Validasi assignment (tidak bisa menilai sembarangan)
- ✅ Dukungan fitur Self-Appraisal secara aman
- ✅ Admin password terpisah dari karyawan

---

## 🔧 Troubleshooting

### Error: "service_account.json not found" atau "SPREADSHEET_ID not set"
- Aplikasi akan tetap berjalan tetapi dalam **Mock Data Mode** (Data sementara).
- Untuk menghubungkan ke Google Sheets, pastikan file `service_account.json` ada dan `SPREADSHEET_ID` di `.env` sudah benar.
- Pastikan Anda me-restart server setelah memperbaiki konfigurasi.

### Error: "Permission denied"
- Pastikan spreadsheet sudah di-share ke service account email

### Karyawan tidak muncul di dropdown
- Cek sheet **ASSIGNMENT_360**, pastikan email penilai dan yang dinilai sudah benar
- Pastikan karyawan belum dinilai (cek sheet **HASIL_PENILAIAN**)

### Login gagal
- Karyawan: Pastikan email dan password sesuai dengan sheet **KARYAWAN**
- Admin: Pastikan email ada di `ADMIN_EMAILS` dan password sesuai `ADMIN_PASSWORD` di `.env`

---

## 📝 Catatan Penting

1. **Nama sheet harus PERSIS** (case-sensitive):
   - `KARYAWAN`
   - `ASSIGNMENT_360`
   - `HASIL_PENILAIAN`

2. **Header kolom harus sesuai** dengan struktur di atas

3. **Email admin tidak perlu** ada di sheet KARYAWAN

4. **Password karyawan** bisa diubah kapan saja oleh admin melalui Admin Panel

5. **Restart server** setelah mengubah file `.env`

---

## 👨‍💻 Tech Stack

- **Backend:** Node.js + Express
- **Database:** Google Sheets (via Google Sheets API)
- **Frontend:** HTML + CSS + Vanilla JavaScript
- **Authentication:** Session-based with password validation

---

## 📞 Support

Jika ada pertanyaan atau kendala, silakan hubungi tim IT/HRD.

---

**Selamat menggunakan! 🎉**
