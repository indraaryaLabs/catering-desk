/**
 * Model domain Catering Desk v2.
 *
 * Prinsip:
 * - Uang selalu bilangan bulat rupiah (tanpa pecahan).
 * - Harga per porsi pada item pesanan adalah *snapshot* saat pesanan dibuat,
 *   sehingga perubahan harga katalog tidak pernah mengubah riwayat.
 * - Tidak ada `any`; data dari luar (berkas impor) diperlakukan tidak tepercaya.
 */

export const VERSI_SKEMA = 2;
export const KUNCI_STORAGE = 'catering-desk/v2';

/* ============================== Katalog ============================== */

export type KategoriMenu = 'makanan' | 'snack' | 'minuman' | 'dessert' | 'paket';

export const KATEGORI_MENU: KategoriMenu[] = ['paket', 'makanan', 'snack', 'minuman', 'dessert'];

export const LABEL_KATEGORI: Record<KategoriMenu, string> = {
  paket: 'Paket',
  makanan: 'Makanan Berat',
  snack: 'Snack',
  minuman: 'Minuman',
  dessert: 'Dessert',
};

/**
 * Komponen bahan. `jumlah` adalah kebutuhan **per porsi** dalam `satuan`,
 * `hargaSatuan` adalah rupiah per satuan. Dari sini dihitung HPP dan daftar belanja.
 */
export interface Bahan {
  id: string;
  nama: string;
  jumlah: number;
  satuan: string;
  hargaSatuan: number;
}

export interface MenuItem {
  id: string;
  nama: string;
  kategori: KategoriMenu;
  hargaPerPorsi: number;
  /** Menit, dipakai untuk menyusun rencana waktu produksi. */
  waktuMasak: number;
  tersedia: boolean;
  deskripsi: string;
  bahan: Bahan[];
}

/* ============================== Pesanan ============================= */

export type StatusPesanan =
  | 'inquiry'
  | 'dikonfirmasi'
  | 'persiapan'
  | 'siap'
  | 'selesai'
  | 'dibatalkan';

export const STATUS_PESANAN: StatusPesanan[] = [
  'inquiry',
  'dikonfirmasi',
  'persiapan',
  'siap',
  'selesai',
  'dibatalkan',
];

/** Urutan tahap di dalam alur; pesanan batal diletakkan di posisi paling akhir. */
export const ULUTAN_STATUS: StatusPesanan[] = [
  'inquiry',
  'dikonfirmasi',
  'persiapan',
  'siap',
  'selesai',
  'dibatalkan',
];

export const LABEL_STATUS: Record<StatusPesanan, string> = {
  inquiry: 'Inquiry',
  dikonfirmasi: 'Dikonfirmasi',
  persiapan: 'Persiapan',
  siap: 'Siap Dikirim',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
};

export const DESKRIPSI_STATUS: Record<StatusPesanan, string> = {
  inquiry: 'Masih ditanyakan pelanggan, menunggu konfirmasi.',
  dikonfirmasi: 'Sudah disepakati, menunggu masuk tahap persiapan.',
  persiapan: 'Menu sedang disiapkan dapur.',
  siap: 'Pesanan siap diantar atau diambil pelanggan.',
  selesai: 'Acara selesai, tagihan ditutup.',
  dibatalkan: 'Dibatalkan dan tidak dihitung di produksi.',
};

export interface ItemPesanan {
  id: string;
  menuId: string;
  namaMenu: string;
  kategori: KategoriMenu;
  hargaPerPorsi: number;
  jumlahPorsi: number;
}

export type SumberPesanan = 'manual' | 'ulangan' | 'impor' | 'contoh';

export interface Pesanan {
  id: string;
  kode: string;
  namaPelanggan: string;
  kontak: string;
  jenisAcara: string;
  /** `YYYY-MM-DD` */
  tanggalAcara: string;
  /** `HH:MM` 24 jam */
  jamAcara: string;
  alamat: string;
  items: ItemPesanan[];
  catatan: string;
  catatanAntar: string;
  /** Nama pengantar/mitra yang ditugaskan. Kosong bila ambil sendiri. */
  pengantar: string;
  dp: number;
  status: StatusPesanan;
  sumber: SumberPesanan;
  dibuatPada: string;
  diperbaruiPada: string;
}

/* ============================== Tugas =============================== */

export type Prioritas = 'rendah' | 'sedang' | 'tinggi';

export interface Tugas {
  id: string;
  judul: string;
  detail: string;
  /** `YYYY-MM-DD` */
  batasWaktu: string;
  prioritas: Prioritas;
  selesai: boolean;
  sumber: 'pengguna' | 'otomasi';
  dibuatPada: string;
  /** Id pesanan terkait bila tugas berasal dari otomatisasi. */
  pesananId: string | null;
}

/* ============================ Otomatisasi =========================== */

export type PemicuOtomasi = 'pesanan-ditambahkan' | 'status-berubah' | 'pesanan-diubah' | 'harian';

export const LABEL_PEMICU: Record<PemicuOtomasi, string> = {
  'pesanan-ditambahkan': 'Pesanan baru ditambahkan',
  'status-berubah': 'Status pesanan berubah',
  'pesanan-diubah': 'Data pesanan diperbarui',
  harian: 'Setiap awal hari kerja',
};

export type BidangKondisi =
  | 'status'
  | 'dpPersen'
  | 'porsi'
  | 'hariMenujuAcara'
  | 'jenisAcara'
  | 'kategoriMenu'
  | 'nilaiPesanan';

export const LABEL_BIDANG: Record<BidangKondisi, string> = {
  status: 'Status pesanan',
  dpPersen: 'DP yang sudah dibayar (persen)',
  porsi: 'Jumlah porsi',
  hariMenujuAcara: 'Hari menuju acara',
  jenisAcara: 'Jenis acara',
  kategoriMenu: 'Kategori menu',
  nilaiPesanan: 'Nilai pesanan (rupiah)',
};

export type OperatorKondisi = 'samaDengan' | 'tidakSamaDengan' | 'lebihDari' | 'kurangDari' | 'memuat';

export const LABEL_OPERATOR: Record<OperatorKondisi, string> = {
  samaDengan: 'sama dengan',
  tidakSamaDengan: 'tidak sama dengan',
  lebihDari: 'lebih dari',
  kurangDari: 'kurang dari',
  memuat: 'memuat kata',
};

export interface Kondisi {
  id: string;
  bidang: BidangKondisi;
  operator: OperatorKondisi;
  nilai: string;
}

export type JenisTindakan =
  | 'naikkan-status'
  | 'buat-tugas'
  | 'tandai-prioritas'
  | 'siapkan-draf-pesan';

export const LABEL_TINDAKAN: Record<JenisTindakan, string> = {
  'naikkan-status': 'Naikkan status pesanan satu tahap',
  'buat-tugas': 'Buat tugas untuk tindak lanjut',
  'tandai-prioritas': 'Tandai tugas sebagai prioritas tinggi',
  'siapkan-draf-pesan': 'Siapkan draf pesan untuk pelanggan',
};

export interface Tindakan {
  id: string;
  jenis: JenisTindakan;
  /** Parameter bebas dalam bentuk teks, ditafsirkan per jenis tindakan. */
  parameter: string;
}

export interface AturanOtomasi {
  id: string;
  nama: string;
  aktif: boolean;
  pemicu: PemicuOtomasi;
  kondisi: Kondisi[];
  tindakan: Tindakan[];
  dibuatPada: string;
  /** Berapa kali aturan ini pernah berhasil dieksekusi. */
  eksekusi: number;
}

/* ============================== Jejak =============================== */

export type JenisAktivitas =
  | 'pesanan-dibuat'
  | 'pesanan-diubah'
  | 'pesanan-dihapus'
  | 'status-berubah'
  | 'menu-diubah'
  | 'diimpor'
  | 'atasReset'
  | 'otomasi';

export interface Aktivitas {
  id: string;
  waktu: string;
  jenis: JenisAktivitas;
  judul: string;
  detail: string;
  oleh: 'pengguna' | 'otomasi' | 'sistem';
}

/* ============================== Data =============================== */

export interface BackupData {
  version: number;
  disimpanPada: string;
  menus: MenuItem[];
  pesanan: Pesanan[];
  tugas: Tugas[];
  aturan: AturanOtomasi[];
  aktivitas: Aktivitas[];
}

export interface Preferensi {
  tema: 'terang' | 'gelap' | 'sistem';
  kepadatan: 'nyaman' | 'padat';
  /** Total porsi per hari yang dianggap berat, untuk peringatan kapasitas. */
  ambangBeban: number;
}

export interface DataAplikasi extends BackupData {
  contoh: boolean;
  preferensi: Preferensi;
}

export const PREFSI_BAWAAN: Preferensi = {
  tema: 'sistem',
  kepadatan: 'nyaman',
  ambangBeban: 250,
};