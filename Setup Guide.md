# � Setup Guide - 360 Degree Employee Appraisal System

Panduan lengkap setup aplikasi penilaian karyawan 360 derajat.

---

## �📋 LANGKAH 1: Membuat Google Spreadsheet

### 1. Buka Google Sheets
- Kunjungi: https://sheets.google.com
- Klik tombol **+ Blank** untuk membuat spreadsheet baru

### 2. Buat 3 Sheet (Tab) dengan format berikut:

---

### **Sheet 1: KARYAWAN**

Nama sheet harus persis: `KARYAWAN`

| Email | Nama Karyawan | Jabatan | Departemen | Password |
|-------|---------------|---------|------------|----------|
| alice@company.com | Alice Smith | Manager | HR | alice123 |
| bob@company.com | Bob Jones | Staff | IT | bob456 |
| charlie@company.com | Charlie Brown | Staff | Finance | charlie789 |

**⚠️ PENTING:**
- Kolom **Password** (kolom E) adalah **WAJIB**
- Password ini digunakan karyawan untuk login
- Password bisa berupa angka, huruf, atau kombinasi
- Admin bisa mengubah password melalui Admin Panel

**Contoh data untuk testing:**
```
alice@company.com    Alice Smith      Manager    HR         alice123
bob@company.com      Bob Jones        Staff      IT         bob456
charlie@company.com  Charlie Brown    Staff      Finance    charlie789
```

---

### **Sheet 2: ASSIGNMENT_360**

Nama sheet harus persis: `ASSIGNMENT_360`

| Email Penilai | Email Yang Dinilai |
|---------------|--------------------|
| alice@company.com | bob@company.com |
| alice@company.com | charlie@company.com |
| bob@company.com | alice@company.com |

**Penjelasan:**
- Alice akan menilai Bob dan Charlie
- Bob akan menilai Alice
- Setelah karyawan menilai, nama yang dinilai akan **otomatis hilang** dari daftar mereka

---

### **Sheet 3: HASIL_PENILAIAN**

Nama sheet harus persis: `HASIL_PENILAIAN`

| Timestamp | Email Penilai | Nama Penilai | Email Yang Dinilai | Nama Yang Dinilai | Nilai | Komentar |
|-----------|---------------|--------------|--------------------|-------------------|-------|----------|

**Catatan:** 
- Sheet ini hanya perlu **header saja**
- Data akan diisi **otomatis** oleh aplikasi
- Admin bisa **menghapus** hasil penilaian jika ada kesalahan

---

## 🔑 LANGKAH 2: Mendapatkan Spreadsheet ID

1. Setelah membuat spreadsheet di atas, lihat **URL** di browser Anda

2. URL akan terlihat seperti ini:
   ```
   https://docs.google.com/spreadsheets/d/1AbC123XyZ456-MnOpQrStUvWxYz/edit#gid=0
   ```

3. **Copy bagian ID** yang ada di antara `/d/` dan `/edit`:
   ```
   1AbC123XyZ456-MnOpQrStUvWxYz
   ```
   ☝️ Ini adalah **Spreadsheet ID** Anda

4. **Paste ID tersebut** ke file `.env` di folder `d:\App\HR App\.env`:
   ```env
   PORT=3000
   SPREADSHEET_ID=1AbC123XyZ456-MnOpQrStUvWxYz
   SESSION_SECRET=simple_secret_key_change_me
   ADMIN_EMAILS=hrd@company.com,admin@company.com
   ADMIN_PASSWORD=admin123
   ```

---

## 🔐 LANGKAH 3: Setup Google Cloud & Service Account

Ini adalah bagian yang paling penting!

### A. Membuat Google Cloud Project

1. **Kunjungi Google Cloud Console:**
   - https://console.cloud.google.com/

2. **Buat Project Baru:**
   - Klik dropdown project di atas
   - Klik **"New Project"**
   - Nama project: `HR-360-Appraisal`
   - Klik **"Create"**

---

### B. Enable Google Sheets API

1. Di Google Cloud Console, pastikan project Anda sudah dipilih
2. Buka menu **"APIs & Services"** > **"Library"**
3. Cari: `Google Sheets API`
4. Klik hasil pencarian, lalu klik **"Enable"**

---

### C. Membuat Service Account

1. Buka **"APIs & Services"** > **"Credentials"**
2. Klik **"Create Credentials"** > pilih **"Service Account"**
3. Isi form:
   - **Service account name:** `hr-360-service`
   - **Service account ID:** (akan terisi otomatis)
   - Klik **"Create and Continue"**
4. **Role:** Pilih `Basic` > `Editor` (atau bisa skip step ini)
5. Klik **"Done"**

---

### D. Download JSON Key

1. Masih di halaman **Credentials**, scroll ke bawah ke bagian **"Service Accounts"**
2. Klik **email service account** yang baru dibuat
3. Pilih tab **"Keys"**
4. Klik **"Add Key"** > **"Create new key"**
5. Pilih format **JSON**
6. Klik **"Create"**
7. File JSON akan **otomatis terdownload**

---

### E. Rename dan Pindahkan File

1. **Rename** file JSON yang baru didownload menjadi: `service_account.json`
2. **Pindahkan** file tersebut ke folder: `d:\App\HR App\`

---

## 📤 LANGKAH 4: Share Spreadsheet dengan Service Account

1. **Buka file** `service_account.json` yang sudah Anda download

2. **Cari bagian** `"client_email"`, akan terlihat seperti:
   ```json
   "client_email": "hr-360-service@hr-360-appraisal.iam.gserviceaccount.com"
   ```

3. **Copy email tersebut**

4. **Buka Google Spreadsheet** yang sudah Anda buat tadi

5. Klik tombol **"Share"** di kanan atas

6. **Paste email service account** tadi

7. Pastikan role-nya adalah **"Editor"**

8. Klik **"Send"**

---

## ⚙️ LANGKAH 5: Konfigurasi Admin

Edit file `.env` di `d:\App\HR App\.env`:

```env
PORT=3000
SPREADSHEET_ID=1AbC123XyZ456-MnOpQrStUvWxYz
SESSION_SECRET=simple_secret_key_change_me
ADMIN_EMAILS=hrd@company.com,admin@company.com
ADMIN_PASSWORD=admin123
```

**Penjelasan:**
- `ADMIN_EMAILS`: Email yang bisa login sebagai admin (pisahkan dengan koma jika lebih dari 1)
- `ADMIN_PASSWORD`: Password untuk login admin (ganti dengan password yang aman)

**⚠️ CATATAN:**
- Email admin **TIDAK PERLU** ada di sheet KARYAWAN
- Admin login menggunakan email + password dari `.env`

---

## ✅ LANGKAH 6: Test Aplikasi

Setelah semua langkah di atas selesai:

### 1. Install Dependencies (jika belum)
```bash
cd "d:\App\HR App"
npm install
```

### 2. Start Server
```bash
npm start
```

### 3. Buka Browser
Akses: **http://localhost:3000**

---

### 4. Test Login Karyawan

**Login sebagai Alice:**
```
Email: alice@company.com
Password: alice123
```

**Setelah login:**
- Anda akan melihat dashboard karyawan
- Dropdown berisi: Bob Jones, Charlie Brown
- Pilih salah satu, isi rating (1-5) dan komentar
- Klik **Submit**

**Cek Hasil:**
- Buka Google Spreadsheet
- Lihat sheet `HASIL_PENILAIAN`
- Data penilaian sudah muncul! 
- Karyawan yang sudah dinilai **otomatis hilang** dari dropdown

---

### 5. Test Login Admin

**Login sebagai Admin:**
```
Email: hrd@company.com
Password: admin123
```

**Setelah login:**
- Anda akan masuk ke **Admin Dashboard**
- Ada 3 tab:
  1. **Kelola Karyawan** - Tambah/edit/hapus karyawan (termasuk password)
  2. **Kelola Assignment** - Atur siapa menilai siapa
  3. **Hasil Penilaian** - Lihat dan hapus hasil penilaian

---

## 🆘 Troubleshooting

### ❌ Error: "service_account.json not found"
**Solusi:**
- Pastikan file `service_account.json` ada di folder `d:\App\HR App\`
- Cek nama file (harus persis `service_account.json`)

---

### ❌ Error: "SPREADSHEET_ID not set"
**Solusi:**
- Buka file `.env`
- Pastikan `SPREADSHEET_ID` sudah diisi dengan ID yang benar
- Restart server setelah edit `.env`

---

### ❌ Error: "Permission denied" atau "The caller does not have permission"
**Solusi:**
- Buka `service_account.json`, copy `client_email`
- Buka Google Spreadsheet, klik **Share**
- Pastikan email service account sudah ditambahkan dengan role **Editor**

---

### ❌ Login gagal - "Invalid password"
**Untuk Karyawan:**
- Cek sheet `KARYAWAN`, pastikan email dan password sesuai
- Password case-sensitive (huruf besar/kecil harus sama)

**Untuk Admin:**
- Cek file `.env`, pastikan `ADMIN_EMAILS` dan `ADMIN_PASSWORD` benar
- Restart server setelah edit `.env`

---

### ❌ Dropdown kosong / tidak ada karyawan yang muncul
**Solusi:**
- Cek sheet `ASSIGNMENT_360`, pastikan email penilai dan yang dinilai sudah benar
- Cek sheet `HASIL_PENILAIAN`, mungkin karyawan sudah dinilai semua
- Jika ingin reset, hapus data di `HASIL_PENILAIAN` (kecuali header)

---

### ❌ Nama sheet error
**Solusi:**
- Nama sheet harus **PERSIS** (case-sensitive):
  - `KARYAWAN` ✅
  - `karyawan` ❌
  - `Karyawan` ❌
  - `ASSIGNMENT_360` ✅
  - `HASIL_PENILAIAN` ✅

---

## 📝 Checklist Setup

Gunakan checklist ini untuk memastikan semua sudah benar:

- [ ] Google Spreadsheet sudah dibuat dengan 3 sheet
- [ ] Sheet `KARYAWAN` ada kolom **Password** (kolom E)
- [ ] Spreadsheet ID sudah dicopy dan paste ke `.env`
- [ ] Google Cloud Project sudah dibuat
- [ ] Google Sheets API sudah di-enable
- [ ] Service Account sudah dibuat
- [ ] File `service_account.json` sudah didownload dan dipindahkan ke folder project
- [ ] Spreadsheet sudah di-share ke service account email
- [ ] File `.env` sudah diisi lengkap (SPREADSHEET_ID, ADMIN_EMAILS, ADMIN_PASSWORD)
- [ ] Dependencies sudah di-install (`npm install`)
- [ ] Server bisa jalan (`npm start`)
- [ ] Bisa login sebagai karyawan
- [ ] Bisa login sebagai admin

---

## 🎉 Selesai!

Jika semua checklist sudah ✅, aplikasi siap digunakan!

**Selamat menggunakan sistem penilaian 360 derajat! 🚀**
