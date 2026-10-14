# Catering Desk

Aplikasi manajemen order catering yang berjalan **sepenuhnya di dalam peramban**.
Tanpa server, tanpa akun, tanpa kunci API, tanpa langganan. Semua data tinggal
di peramban perangkat ini dan tidak pernah meninggalkan komputer atau HP Anda.

---

## Apa yang membuatnya berbeda

Kebanyakan aplikasi catering memaksa pengguna kuat, mahal, dan selalu daring.
Catering Desk dibuat untuk kebalikannya: **satu berkas, bisa dibuka dari mana
saja, tetap bekerja penuh tanpa internet**.

| Keunggulan | Keterangan |
| --- | --- |
| **Tanpa biaya** | Tidak ada langganan, seatlis, atau API berbayar. |
| **Tanpa server** | Data di `localStorage`. Tidak ada yang terkirim ke mana pun. |
| **Otomasi lokal** | Aturan berjalan di perangkat, sinkron, dan bisa diaudit. |
| **Bisa dibawa** | Ekspor JSON untuk pindah perangkat, impor untuk memulihkan. |
| **Bahasa Indonesia** | Seluruh antarmuka, format angka, tanggal, dan mata uang lokal. |

---

## Referensi yang diadaptasi

Pola di bawah diambil dari produk catering dan POS yang sudah mapan. Yang
di Pinjam adalah **ide dan alur kerja**, bukan tampilan, merek, atau kode.

### Catering global

| Produk | Pola yang di Pinjam |
| --- | --- |
| **CaterZen** | Alur order bertahap dari inquiry ke selesai, penanda persiapan. |
| **Caterease** | Katalog paket dengan komponen yang dapat ditambah atau dikurangi. |
| **Better Cater** | Pemisahan catatan dapur dan catatan pengiriman. |
| **GoPrep** | Persiapan hari-H dan tiket dapur per pesanan. |
| **Univents** | Pemisahan tabel pesanan dengan tabel prepare per tanggal. |
| **ezCater / HoneyCart** | Inventaris bahan dan penghitungan kebutuhan belanja otomatis. |

### UMKM Indonesia

| Produk | Pola yang di Pinjam |
| --- | --- |
| **Moka POS** | Denah meja dan status pesanan yang terlihat sekilas. |
| **majoo** | Modul inventaris dan biaya bahan per porsi. |
| **Kasir Pintar / Qasir** | Bahasa Indonesia dan format rupiah yang familier. |
| **iReap / PosSaku** | Ekspor CSV dan laporan penjualan sederhana. |
| **OwnCloud / Google Sheets** | Impor-ekspor data sebagai alat migrasi. |

### Bahasa desain 2026

| Produk | Pola yang di Pinjam |
| --- | --- |
| **Linear** | Palet perintah, pintasan keyboard, dan undo/redo. |
| **Vercel / Stripe** | Tipografi netral, tata letak berlapis, warna copper dan amber. |
| **Attio** | Mode gelap sebagai fitur utama, bukan tambalan. |
| **Ramp / Mercury** | Angka besar, hierarki informasi yang jujur. |

---

## Arsitektur

```
src/
├─ types.ts            Skema domain v2 (satu-satunya sumber kebenaran bentuk data)
├─ App.tsx             Perakitan: router, palet perintah, pintasan, dialog global
├─ state/
│  ├─ reducer.ts       Reducer murni beserta riwayat undo/redo
│  └─ toko.tsx         Context React; evaluasi aturan otomasi secara sinkron
├─ lib/
│  ├─ pesanan.ts       Matematika murni: total, HPP, margin, produksi, belanja
│  ├─ analitik.ts      Metrik, tren, corong status, umur piutang
│  ├─ pelanggan.ts     Profil pelanggan turunan dari riwayat pesanan
│  ├─ otomasi.ts       Mesin aturan deklaratif dengan pencegahan loop
│  ├─ pesan.ts         Draf WhatsApp (hanya draf, tidak pernah dikirim)
│  ├─ validasi.ts      Validasi form dan berkas impor yang tidak dipercaya
│  ├─ format.ts        Rupiah dan angka gaya Indonesia
│  ├─ tanggal.ts       Tanggal lokal, label relatif, dan tenggat
│  ├─ filter.ts        Pencarian, filter, dan pengurutan
│  ├─ csv.ts           Ekspor CSV dengan proteksi injeksi formula
│  ├─ seed.ts          Data contoh yang selalu mengikuti tanggal hari ini
│  ├─ storage.ts       Pembacaan dan penulisan localStorage
│  └─ kode.ts          Penomoran pesanan otomatis
├─ components/         Atom antarmuka, dialog, grafik SVG, dan form
├─ pages/              Delapan halaman
└─ styles/global.css   Sistem desain, mode gelap, dan gaya cetak
```

Prinsip yang dipegang:

1. **Logika murni terpisah dari tampilan.** Semua perhitungan ada di `lib/`
   dan dapat diuji tanpa membuka peramban.
2. **Satu sumber kebenaran untuk bentuk data.** `types.ts` mendefinisikan
   skema; validasi impor memeriksa terhadap skema itu.
3. **Tidak ada state tersembunyi.** Satu reducer, satu konteks, satu riwayat.
4. **Otomasi tidak melakukan hal yang tidak diminta.** Setiap aturan memakai
   pemicu dan kondisi yang terlihat, dan setiap eksekusi dicatat.

---

## Model data

### Pesanan

Satu pesanan memuat pelanggan, acara, jadwal, pengantar, baris menu, DP, dan
status. Field `pengantar` sengaja dipisah dari pelanggan karena sering berubah
antar order, bahkan untuk pelanggan yang sama.

```
inquiry → dikonfirmasi → persiapan → siap → selesai
   ↓           ↓            ↓          ↓
            (dibatalkan, dapat diaktifkan kembali)
```

Transisi lompat tahap **ditolak**. Pembatalan diizinkan dari tahap aktif.

### MenuItem dengan resep

`MenuItem` menyimpan `waktuMasak` dan daftar `bahan`. Dari situ aplikasi dapat
menghitung HPP, margin, beban kerja dapur, dan daftar belanja tanpa pengguna
menghitung manual.

### Koleksi turunan

`Tugas`, `AturanOtomasi`, `Aktivitas`, dan `Preferensi` adalah koleksi
pendamping. `ProfilPelanggan` **tidak** disimpan sebagai entitas terpisah, tetapi
dihitung dari riwayat pesanan, sehingga tidak mungkin melenceng dari data asli.

---

## Otomasi tanpa biaya

Aturan berjalan **di dalam perangkat**, secara sinkron, ketika aksi terjadi.
Tidak ada cron, tidak ada worker, tidak ada biaya.

### Pemicu

`pesanan-ditambahkan`, `pesanan-diubah`, `status-berubah`, `harian`

### Kondisi

`status`, `dpPersen`, `porsi`, `hariMenujuAcara`, `jenisAcara`

Operator yang tersedia: `samaDengan`, `tidakSamaDengan`, `lebihDari`,
`kurangDari`, `memuat`

### Tindakan

Naikkan status satu tahap, buat tugas, tandai prioritas, siapkan draf pesan.

### Pencegahan loop

Jika aturan yang dikondisikan pada `status` dijalankan lagi oleh aturan lain
dalam aksi yang sama, eksekusi **dilewati** dan alasannya dicatat. Tanpa ini,
dua aturan bisa saling memicu tanpa henti.

### Aturan bawaan

| Aturan | Pemicu | Tindakan |
| --- | --- | --- |
| Otomatis konfirmasi bila DP sudah masuk | Pesanan ditambahkan | Naikkan status satu tahap |
| Ingat cek bahan H-1 | Harian | Buat tugas stok bahan |
| Konfirmasi tugas untuk inquiry baru | Pesanan ditambahkan | Buat tugas verifikasi |

---

## Yang dikerjakan otomatis (nol biaya)

| Fitur | Cara kerjanya |
| --- | --- |
| **Daftar belanja** | Resep dikali porsi lalu dijumlahkan per tanggal; pesanan batal diabaikan. |
| **Tiket dapur** | Satu tiket per tanggal berisi seluruh porsi aktif. |
| **Umur piutang** | Dikelompokkan: belum jatuh tempo, 1-7 hari, 8-30 hari, lebih dari 30 hari. |
| **Peringatan kapasitas** | Porsi hari ini dibandingkan ambang yang Anda tetapkan sendiri. |
| **Pesan ulang** | Satu klik menyalin menu dan porsi dari order sebelumnya. |
| **Draf WhatsApp** | Lima jenis draf; disalin atau dibuka lewat `wa.me`. **Tidak pernah dikirim sendiri.** |
| **Nomor pesanan** | Otomatis, berurutan per tahun, tidak pernah bentrok. |
| **Harga terkunci** | Harga per porsi tersimpan di baris pesanan saat itu, tidak ikut berubah. |
| **Tugas harian** | Dibuat aturan secara otomatis, lengkap dengan prioritas. |

---

## Halaman

| Halaman | Isi |
| --- | --- |
| **Ringkasan** | Porsi hari ini, beban dapur, run sheet, tugas, dan perlu perhatian. |
| **Pesanan** | Tabel lengkap dengan pencarian, filter, aksi massal, dan pesan ulang. |
| **Pelanggan** | Profil turunan, pola pesan, dan pelanggan yang perlu dijaga. |
| **Menu** | Katalog, resep bahan, HPP, margin, dan status ketersediaan. |
| **Produksi** | Tanggal berproduksi, daftar masak, daftar belanja, dan jadwal masak. |
| **Laporan** | Tren bulanan, corong status, komposisi menu, umur piutang, dan laba kotor. |
| **Otomasi** | Kelola aturan dan baca jejak eksekusi. |
| **Data** | Ekspor, impor, preferensi tampilan, dan reset data contoh. |

---

## Pintasan keyboard

| Pintasan | Aksi |
| --- | --- |
| `Ctrl/⌘ + K` | Buka palet perintah |
| `Ctrl/⌘ + Z` | Batalkan aksi terakhir |
| `Ctrl/⌘ + Shift + Z` | Ulangi aksi yang dibatalkan |
| `?` | Daftar pintasan |
| `Esc` | Tutup dialog atau palet |

---

## Menjalankan

```bash
npm install
npm run dev       # pengembangan
npm run build     # produksi ke dist/
npm run preview   # tinjau hasil build
```

Perintah pemeriksaan:

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run test        # vitest run
```

Hasil build memakai `base: './'`, sehingga folder `dist/` dapat langsung dibuka
dari sistem berkas mana pun tanpa server.

---

## Batasan yang perlu diketahui

- Data **tidak** tersinkron antar perangkat. Backup dilakukan manual lewat
  ekspor JSON.
- Satu peramban untuk satu pengguna. Tidak ada multi-user atau hak akses.
- Integrasi WhatsApp **tidak** ada. Aplikasi hanya menyiapkan draf untuk Anda
  kirim sendiri.
- Tidak ada notifikasi dorong. Pengingat bergantung pada daftar tugas.
- Data contoh dibuat mengikuti tanggal hari ini, sehingga demo selalu terlihat
  hidup. Gunakan **Reset ke data contoh** di sidebar untuk memulihkannya.

Batasan ini disengaja agar aplikasi tetap gratis, privat, dan bisa dibuka
tanpa akun.

---

## Lisensi

Dibuat sebagai portofolio. Bebas dipakai dan dimodifikasi.