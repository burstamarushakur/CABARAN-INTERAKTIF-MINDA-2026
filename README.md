# CABARAN INTERAKTIF MINDA TAHUN 2026 (CIM 2026) - PORTAL KUIZ

Aplikasi ini merupakan **Portal Kuiz Atas Talian Rasmi** berasaskan React, Vite, dan Tailwind CSS untuk mengendalikan peperiksaan Cabaran Interaktif Minda 2026 (CIM 2026).

## Keperluan Sistem

- Node.js & npm (untuk run lokal)
- Projek Supabase (Database, Auth, RPC)
- Akaun Vercel (untuk deployment statik yang pantas)

---

## Kedudukan Sistem & Skop Baru

Selaras dengan penstrukturan semula sistem:
- **Aplikasi ini KHAS untuk menduduki KUIZ sahaja.**
- Segala urusan **pendaftaran murid, muat naik resit yuran pendaftaran, semakan bayaran, kebenaran (approval), dan penjanaan kod akses murid** dilaksanakan sepenuhnya menerusi **Sistem Pendaftaran Berasingan**.
- Kedua-dua aplikasi ini berkongsi **Pangkalan Data Supabase yang sama**.
- Aplikasi Kuiz ini akan membaca kod akses (`access_code`) yang dijana oleh Sistem Pendaftaran, dan merekodkan masa mula, masa akhir, status penyelesaian, serta markah murid terus ke rekod masing-masing secara selamat di pangkalan data.

---

## 1. Cara Setup Supabase

1. Daftar dan log masuk ke [Supabase](https://supabase.com).
2. Buat projek baru.
3. Tunggu sehingga projek siap sedia di-provision.
4. Pergi ke **Project Settings -> API** untuk mendapatkan `URL` dan `anon public key`.

---

## 2. Cara Run SQL Schema (Shared Database)

1. Buka dashboard Supabase.
2. Pergi ke **SQL Editor** -> **New Query**.
3. Buka fail `supabase_schema.sql` di root folder projek ini.
4. Salin semua kod SQL di dalam fail tersebut.
5. Tampal di SQL Editor Supabase dan klik butang **RUN**.
6. Ini akan menghasilkan semula jadual, RLS policies, Functions (RPC) kuiz yang selamat, dan memasukkan semula seed data (50 soalan peperiksaan CIM 2026).

---

## 3. Tetapan Kuiz (Sessi, Masa & Soalan)

Peperiksaan kuiz CIM 2026 dijadualkan mengikut tetapan standard berikut (boleh diubah terus oleh Admin di dashboard):
- **Tarikh Peperiksaan:** 27 Jun 2026 (Sabtu)
- **Masa Mula Jawab:** 8:00 Pagi (Waktu Malaysia / UTC+8)
- **Masa Tamat Jawab:** 6:00 Petang (Waktu Malaysia / UTC+8)
- **Tempoh Menjawab Setiap Calon:** 2 Jam (7200 Saat)

---

## 4. Cara Setup Akun Admin (Portal Pentadbir)

Sistem pemantauan kuiz memerlukan emel yang berdaftar di dalam Supabase Auth dan diberikan penanda peranan 'admin'.

1. Pergi ke tab **Authentication -> Users** di dashboard Supabase anda.
2. Tambahkan pengguna baru dengan mengklik **Add User -> Create User**. Masukkan emel dan kata laluan pentadbir anda.
3. Salin User ID (UUID) yang dijana oleh Supabase.
4. Pergi ke **SQL Editor** -> **New Query** dan jalankan SQL berikut (gantikan ID dan emel dengan data yang disalin):
   ```sql
   INSERT INTO public.admin_users (id, email, role) 
   VALUES ('SALIN-UUID-USER-DI-SINI', 'emel.admin@contoh.com', 'admin');
   ```

---

## 5. Cara Setup Environment Variables (.env)

Buat fail `.env` di root folder projek anda untuk pembangunan lokal, atau masukkan butiran ini ke dalam bahagian rahsia platform pembinaan (AI Studio / Vercel):

```env
VITE_SUPABASE_URL=https://<id-projek-anda>.supabase.co
VITE_SUPABASE_ANON_KEY=ey...
```

---

## 6. Cara Deploy ke Vercel (Produksi)

1. Pergi ke [Vercel](https://vercel.com) dan log masuk menggunakan GitHub anda.
2. Klik **Add New... -> Project**.
3. Import repo GitHub yang mengandungi projek ini.
4. Di bahagian tetapan **Project Configuration**, Vercel akan mengesan framework `Vite` secara automatik.
5. Kembangkan panel **Environment Variables** dan masukkan:
   - `VITE_SUPABASE_URL`: URL API Supabase anda.
   - `VITE_SUPABASE_ANON_KEY`: Kunci anonim awam (public anon key).
6. Klik **Deploy**.

## 7. Prasyarat Bina (Build Requirement)

Aplikasi ini dibina penuh client-side (SPA). Tiada server Node custom diperlukan untuk mematikan risiko serangan pendedahan jawapan betul kuiz. Segala logik pemarkahan soalan sulit dijalankan secara selamat di sebelah server Supabase (melalui RPC functions) demi integriti peperiksaan.
