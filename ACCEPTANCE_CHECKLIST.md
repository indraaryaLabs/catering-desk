# Catering Desk — Checklist Penerimaan v2

Status per 14 Oktober 2026. Setiap butir di bawah **sudah diverifikasi** dengan
perintah yang tercantum. Hasil terakhir:

| Pemeriksaan | Perintah | Hasil |
| --- | --- | --- |
| Kompilasi | `npm run typecheck` | Lulus, tanpa galat |
| Lint | `npm run lint` | Lulus, 0 galat, 0 peringatan |
| Uji unit | `npm run test` | 187 pengujian, 7 berkas, semuanya lulus |
| Build | `npm run build` | Lulus, `dist/` terbentuk |
| Uji peramban 1 | `node smoke.js` | 31 pemeriksaan lulus, 0 gagal |
| Uji peramban 2 | `node smoke2.js` | 23 pemeriksaan lulus, 0 gagal |

Uji peramban dijalankan dari luar proyek agar Playwright tidak menjadi
dependensi aplikasi.

---

## 1. Fungsi inti

- [x] **Hitungan total benar.** Total order, jumlah porsi, sisa bayar, dan persen
      DP diuji terhadap kasus yang diketahui, termasuk harga nol dan pesanan tanpa item.
      `tests/pesanan.test.ts`
- [x] **Alur status ditegakkan.** Lompatan tahap ditolak, pembatalan diizinkan
      dari tahap aktif, `selesai` tidak punya aksi lanjut.
      `tests/pesanan.test.ts`
- [x] **Agregasi produksi mengabaikan pesanan batal.** Dihitung per tanggal dan
      dapat dijelaskan kembali ke pesanan asal.
      `tests/pesanan.test.ts`
- [x] **HPP dan margin dihitung dari resep.** Kebutuhan bahan boleh desimal
      (0,22 kg) dan tidak lagi ditolak validasi.
      `tests/pesanan.test.ts`, `tests/validasi.test.ts`
- [x] **Margin menu tanpa resep mengembalikan 0, bukan 100.** Menu tanpa resep
      berarti HPP belum diketahui, bukan berarti margin-nya benar-benar seratus.
      `tests/pesanan.test.ts`
- [x] **Profil pelanggan tidak pernah melenceng.** Dihitung dari riwayat
      pesanan, bukan disimpan sebagai entitas terpisah.
- [x] **Urutan bawaan menyaring dengan benar.** Pesanan batal didorong ke bawah
      pada tampilan bawaan, tetapi urutan yang dipilih pengguna dipakai apa
      adanya tanpa syarat tambahan. `tests/filter.test.ts`

## 2. Otomasi

- [x] **Aturan dievaluasi lokal dan sinkron.** Tidak ada jaringan, worker, atau
      biaya. `tests/otomasi.test.ts`
- [x] **Pencegahan loop bekerja.** Aturan yang akan menghasilkan status yang
      sama dilewati dan alasannya tercatat.
      `tests/otomasi.test.ts`
- [x] **Tugas harian tidak dibuat ganda.** Tugas untuk pesanan, batas waktu, dan
      sumber yang sama dilewati bila sudah ada.
- [x] **Efek otomasi menyertai satu langkah undo.** Tugas dan penghitung eksekusi
      yang dibuat mesin tidak menjadi langkah undo tersendiri, sehingga satu
      Ctrl+Z membatalkan aksi pengguna beserta seluruh efek sampingnya.
      `tests/riwayat.test.ts`, `smoke.js`

## 3. Undo/redo

- [x] **Undo memulihkan keadaan sebelumnya.** Dibuktikan pada reducer secara
      langsung: jumlah pesanan kembali seperti semula dan pesanan baru hilang.
      `tests/riwayat.test.ts`
- [x] **Redo memulihkan keadaan sesudah perubahan.** Diperbaiki satu cacat:
      redo sebelumnya memulihkan keadaan **sebelum** perubahan.
      `tests/riwayat.test.ts`
- [x] **Aksi baru setelah undo membuang riwayat redo.**
      `tests/riwayat.test.ts`
- [x] **Berfungsi di peramban.** 16 baris menjadi 15 setelah Ctrl+Z, kembali 16
      setelah redo. `smoke.js`

## 4. Data dan impor

- [x] **Impor memperlakukan berkas sebagai tidak dipercaya.** Versi skema lebih
      baru, katalog kosong, kategori tidak dikenal, harga pecahan atau negatif,
      tanggal kalender tidak ada, jam di luar rentang, status tidak dikenal,
      jumlah porsi tidak valid, kode ganda, batas waktu salah, dan pemicu aturan
      tak dikenal semuanya ditolak. `tests/validasi.test.ts`
- [x] **Ekspor CSV aman dari injeksi formula.** Kolom teks yang diawali
      `=`, `+`, `-`, atau `@` dilindungi. `tests/csv.test.ts`
- [x] **Data bertahan setelah muat ulang.** Diverifikasi lewat `smoke.js` dan
      `smoke2.js` pada sesi terpisah.
- [x] **Ekspor CSV dan JSON memicu pengunduhan nyata.**
      `catering-desk-pesanan-14-Okt-2026.csv`, `catering-desk-cadangan-2026-10-14.json`

## 5. Perilaku merusak

- [x] **Aksi merusak selalu minta konfirmasi.** Hapus pesanan, hapus menu, ubah
      status massal, dan reset data contoh melewati dialog konfirmasi.
- [x] **Tidak ada galat konsol di kedua tema dan tiga lebar layar.**
      `smoke.js`, `smoke2.js`

## 6. Antarmuka

- [x] **Delapan halaman terpasang dan dapat dinavigasi.**
      `smoke.js` — 8 item navigasi
- [x] **Grafik benar-benar SVG, bukan gambar.** Bar, garis, cincin, dan baris
      persentase dirender sebagai elemen SVG.
- [x] **Mode gelap adalah fitur utama, bukan tambalan.** Latar berubah, siklus
      terang-gelap-sistem bekerja, semua token tetap terbaca.
      `smoke.js` — `rgb(11, 10, 9)`
- [x] **Palet perintah berfungsi.** Ctrl+K membuka, mengetik menyaring tujuan,
      Esc menutup. `smoke.js`
- [x] **Tidak meluber horizontal pada 360, 768, dan 1440 px.** Selisih 0 px pada
      ketiga lebar. `smoke.js`
- [x] **Tanpa duplikat `id` pada DOM.** Satu duplikat ditemukan dan diperbaiki:
      filter tanggal di halaman Pesanan memakai `f-tanggal`, sama dengan form
      dialog, sehingga merusak assosiasi `<label for>`.
- [x] **Tombol unlabeled tidak ada.** Semua tombol ikon memiliki `aria-label`.
- [x] **Validasi inline berbahasa Indonesia dan isian tidak hilang saat gagal.**
      `smoke2.js`

## 7. Bahasa dan kebersihan kode

- [x] **Seluruh antarmuka berbahasa Indonesia.** Tidak ada lorem ipsum maupun
      istilah antarmuka berbahasa Inggris.
- [x] **Tidak ada artefak karakter asing.** Pemindai memeriksa huruf Cyrillic,
      CJK, Hangul, dan Kana di seluruh `src/`, `tests/`, dan dokumentasi.
      Hanya dua baris dengan simbol sigma untuk notasi penjumlahan.
- [x] **Tidak ada berkas mati.** `Modal.tsx` dan `Toast.tsx` versi v1 sudah
      tidak dipakai dan telah dihapus; `Dashboard.tsx` dan `Pengaturan.tsx`
      digantikan oleh halaman v2.

---

## 8. Batasan yang tidak diselesaikan

Hal berikut **sengaja tidak** dikerjakan, dan sebaiknya tidak dianggap cacat
karena bertentangan dengan tujuan "gratis, privat, tanpa akun".

- [ ] **Tidak ada sinkronisasi antar perangkat.** Backup manual lewat ekspor
      JSON. Menyinkronkan berarti butuh server atau layanan pihak ketiga, yang
      bertentangan dengan syarat gratis dan tanpa akun.
- [ ] **Tidak ada multi-user atau hak akses.** Satu peramban untuk satu
      pengguna. Model izin akan memerlukan backend dan autentikasi.
- [ ] **WhatsApp tidak terintegrasi.** Aplikasi menyiapkan draf dan tautan
      `wa.me`; pengiriman tetap dilakukan pengguna sendiri agar tidak melanggar
      ketentuan layanan dan tetap tanpa biaya.
- [ ] **Tidak ada notifikasi dorong.** Pengingat berupa daftar tugas di dalam
      aplikasi.
- [ ] **Uji peramban tidak otomatis di CI.** Playwright sengaja tidak dijadikan
      dependensi proyek. Skripnya berada di
      `%LOCALAPPDATA%\Temp\opencode\cd-smoke\` dan dijalankan manual.

---

## 9. Cacat yang ditemukan dan diperbaiki selama verifikasi

| Cacat | Gejala | Perbaikan |
| --- | --- | --- |
| Tirai navigasi menutupi layar lebar | Seluruh UI tidak dapat diklik pada 1440 px | Tirai kini hanya dirender dalam mode laci, dengan penjaga `display: none` di CSS |
| Redo memulihkan keadaan yang salah | Redo tidak mengubah apa pun | `damping` kini menyimpan keadaan **sesudah** perubahan |
| Undo macet setelah otomasi | Ctrl+Z hanya membatalkan penghitung eksekusi | Efek sampingan mesin tidak lagi menjadi langkah undo tersendiri |
| Kebutuhan bahan ditolak | Resep 0,22 kg gagal divalidasi | Pemeriksa baru `nonNegatif` untuk kebutuhan bahan |
| Pengurutan menimpa pilihan pengguna | Urutan "terbesar" diabaikan, diganti urutan status | Prasyarat hanya berlaku pada tampilan bawaan |
| Duplikat `id` di DOM | `<label for>` dan aksesibilitas rusak | Filter tanggal diberi id `saring-tanggal` |
| Kartu kosong di halaman Menu | Kepala kartu tanpa judul tampak aneh | Ditambah judul dan subjudul yang jelas |
| Margin katalog terlalu optimistis | Menu tanpa resep dihitung HPP nol | Rata-rata dihitung hanya dari menu ber resep |