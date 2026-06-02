# Panduan Patch & Migrasi SQL Supabase

Folder ini dikhaskan untuk menyimpan fail-fail patch SQL berperingkat bagi mengelakkan kemusnahan data di persekitaran produksi.

## Struktur & Penamaan Fail Patch

1. **Sistematik & Berperingkat**: Setiap migrasi atau patch SQL baharu hendaklah disimpan secara berasingan dan dinamakan mengikut susunan kronologi atau langkah demi langkah.
   * Format penamaan yang disyorkan: `0001_deskripsi_ringkas.sql`, `0002_tambah_kolum_sijil.sql`, dsb.
2. **Huraian Ringkas**: Sertakan ulasan/komen (—) di bahagian atas setiap fail tentang fungsi utama patch berkenaan.

## Peraturan Pengoperasian Pangkalan Data

- **JANGAN GABUNG SEKA LALU**: Elakkan daripada menggabungkan patch SQL lama dengan kod skema penuh secara rawak ke dalam satu fail yang besar.
- **SEMAK SEBELUM RUN**: Jangan jalankan sebarang kod pengubahsuaian RLS (Row Level Security), fungsi pemicu (trigger), atau indeks tanpa membuat semakan teliti atau mencubanya di pangkalan data pembangunan (staging/development) terlebih dahulu.
- **PELINDUNG DATA PENGGUNA**: Utamakan integriti rekod calon kuiz, dan elakkan penggunaan arahan `DROP TABLE` pada jadual sedia ada yang mempunyai rekod aktif calon. Use `ALTER TABLE` atau patch incremental.

## Patch terkini

- `20260530_final_stability_certificate_patch.sql` — patch stabiliti pendaftaran dan sijil. Jalankan fail ini di Supabase SQL Editor selepas kod frontend terbaru digunakan. Patch ini membetulkan semakan duplicate MyKid/MyKad, fungsi release sijil, semak sijil dengan markah peratus, Top 5 awam, dan RPC monitor admin.
