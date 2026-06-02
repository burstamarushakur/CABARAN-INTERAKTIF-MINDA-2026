# Maklumat Konfigurasi & Persediaan Pangkalan Data (Supabase)

Aplikasi **Cabaran Interaktif Minda Tahun 2026** menggunakan **Supabase** sebagai sistem backend untuk pengesahan data, kuiz, dan integrasi generasi sijil.

## ⚠️ Peringatan Penting (Jangan Run Fail SQL Lama)

1. **JANGAN RUN** fail `LEGACY_DO_NOT_RUN_supabase_schema.sql` (dahulunya `supabase_schema.sql`) terus ke pangkalan data produksi (live production).
2. Pangkalan data production telah dikonfigurasi dan dipatch secara berperingkat terus menggunakan Supabase SQL Editor.
3. Sebarang percubaan menulis ganti struktur pangkalan data menggunakan fail SQL lama dilarang sama sekali kerana boleh mengakibatkan:
   - Kehilangan rekod permohonan dan kemajuan pelajar,
   - Kehilangan markah peperiksaan,
   - Mengganggu fungsi kawalan sijil atau senarai anugerah rasmi.

---

## 🔒 Polisi Keselamatan & Kunci API

- **Kunci Rahsia (Secrets)**: Pastikan anda **TIDAK** sesekali melakukan komit (`git commit`) atau menyimpan `service_role` key, password pangkalan data, atau sebarang API secret di dalam kod sumber (repository).
- Gunakan konfigurasi environment pembolehubah di pelayan hos web rasmi (contohnya di Vercel/Cloud Run).

---

## ⚙️ Pembolehubah Persekitaran (Environment Variables)

Untuk membolehkan frontend beroperasi dan bersambung dengan Supabase, pastikan pembolehubah persekitaran berikut ditakrifkan:

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-public-anon-key
```

---

## 🏆 Ciri Utama & Logik Pangkalan Data

Sistem backend ini disokong oleh beberapa jadual utama dan fungsi khas (RPC) yang dipatch untuk prestasi serta skalabiliti yang stabil:

### 1. Kawalan & Pelepasan Sijil (Certificate Controls)
- Status pelepasan sijil dikawal sepenuhnya oleh jadual `certificate_settings` (sama ada sijil sedia untuk dimuat turun atau masih disekat).
- Peserta yang berjaya tamat kuiz dengan markah lulus boleh memuat turun sijil penyertaan atau sijil pencapaian (sekiranya layak).

### 2. Pengarah Penyampaian Anugerah Top 5 Keseluruhan
- Kedudukan Top 5 rasmi dan dinamik diintegrasi terus menerus dan disimpan secara autoritatif dalam jadual / fungsi berkaitan `achievement_awards` (seperti yang dijana secara kekal semasa fungsi pelepasan sijil dilaksanakan oleh pihak admin).

### 3. Akses Awal Pelajar (Early Access)
- Akses awal ke kuiz sebelum sesi bermula secara umum boleh diberikan kepada calon tertentu melalui pengecualian bendera `allow_early_access` di dalam rekod jadual `students` (contoh: `students.allow_early_access = true`).

### 4. Sistem Pagination Senarai Calon Admin (Skalabiliti 7,000+ Peserta)
- Meja pentadbiran admin tidak lagi menyedut semua rekod sekali gus bagi mengelakkan prestasi lembap atau crash.
- Sistem menggunakan fungsi RPC terpadu:  
  `admin_get_quiz_results_page(input_search, input_access_status, input_completion_status, input_limit, input_offset)`  
  untuk memuatkan data secara berperingkat (50, 100, atau 200 item sepesawat).

### 5. Pengeksportan Data yang Selamat (CSV Export)
- Eksport penuh rekod calon menggunakan RPC teroptimum:  
  `admin_export_quiz_results()`
- Data dibilas secara sistematik bagi mengelakkan serangan Formula Injection (seperti aksara `=`, `+`, `-`, `@` distruktur menjadi teks selamat dengan prefix apostrof `'`).
