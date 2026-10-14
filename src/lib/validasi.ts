import type {
  AturanOtomasi,
  BackupData,
  Bahan,
  ItemPesanan,
  KategoriMenu,
  Kondisi,
  MenuItem,
  Pesanan,
  StatusPesanan,
  Tindakan,
  Tugas,
} from '../types';
import { KATEGORI_MENU, PREFSI_BAWAAN, ULUTAN_STATUS } from '../types';

export type HasilValidasi<T> = { ok: true; data: T } | { ok: false; pesan: string };

const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;
const POLA_JAM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const MAKS_KESALAHAN = 6;

const pemicuValid = new Set(['pesanan-ditambahkan', 'status-berubah', 'pesanan-diubah', 'harian']);
const bidangValid = new Set([
  'status',
  'dpPersen',
  'porsi',
  'hariMenujuAcara',
  'jenisAcara',
  'kategoriMenu',
  'nilaiPesanan',
]);
const operatorValid = new Set([
  'samaDengan',
  'tidakSamaDengan',
  'lebihDari',
  'kurangDari',
  'memuat',
]);
const tindakanValid = new Set([
  'naikkan-status',
  'buat-tugas',
  'tandai-prioritas',
  'siapkan-draf-pesan',
]);
const prioritasValid = new Set(['rendah', 'sedang', 'tinggi']);

function objek(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function teksWajib(v: unknown): v is string {
  return typeof v === 'string' && v.trim() !== '';
}

function bulatPositif(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0;
}

/** Angka tidak bulat (kebutuhan bahan bisa 0,09 kg) namun tetap >= 0. */
function nonNegatif(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0;
}

function tanggalValid(v: unknown): v is string {
  if (typeof v !== 'string' || !POLA_TANGGAL.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const t = new Date(y, m - 1, d);
  return t.getFullYear() === y && t.getMonth() === m - 1 && t.getDate() === d;
}

function jamValid(v: unknown): v is string {
  return typeof v === 'string' && POLA_JAM.test(v);
}

function teks(v: unknown, bawaan = ''): string {
  return typeof v === 'string' ? v : bawaan;
}

/* ==================================================================== */
/* Validasi berkas cadangan / impor (data tidak tepercaya)               */
/* ==================================================================== */

export function validasiBackup(mentah: unknown, batasVersi = 2): HasilValidasi<BackupData> {
  const galat: string[] = [];

  if (!objek(mentah)) {
    return { ok: false, pesan: 'Struktur berkas tidak dikenali (bukan objek JSON).' };
  }
  if (typeof mentah.version !== 'number' || !Number.isFinite(mentah.version)) {
    return { ok: false, pesan: 'Berkas tidak memiliki nomor versi skema yang sah.' };
  }
  if (mentah.version > batasVersi) {
    return {
      ok: false,
      pesan: `Berkas memakai versi skema ${mentah.version}, sedangkan aplikasi ini mendukung maksimal versi ${batasVersi}.`,
    };
  }
  if (!Array.isArray(mentah.menus)) {
    return { ok: false, pesan: 'Bidang "menus" harus berupa daftar (array).' };
  }
  if (!Array.isArray(mentah.pesanan)) {
    return { ok: false, pesan: 'Bidang "pesanan" harus berupa daftar (array).' };
  }

  /* ------------------------------ menu ------------------------------ */
  const menus: MenuItem[] = [];
  (mentah.menus as unknown[]).forEach((item, i) => {
    if (galat.length >= MAKS_KESALAHAN) return;
    if (!objek(item)) return void galat.push(`Menu ke-${i + 1} bukan objek.`);
    if (!teksWajib(item.id) || !teksWajib(item.nama)) {
      return void galat.push(`Menu ke-${i + 1} wajib memiliki id dan nama.`);
    }
    if (!KATEGORI_MENU.includes(item.kategori as KategoriMenu)) {
      return void galat.push(`Menu "${String(item.nama)}" memakai kategori tidak dikenal.`);
    }
    if (!bulatPositif(item.hargaPerPorsi)) {
      return void galat.push(`Menu "${String(item.nama)}" harga per porsi harus bilangan bulat ≥ 0.`);
    }
    if (typeof item.tersedia !== 'boolean') {
      return void galat.push(`Menu "${String(item.nama)}" bidang "tersedia" harus true/false.`);
    }

    const bahan: Bahan[] = [];
    if (Array.isArray(item.bahan)) {
      for (const [pos, sub] of (item.bahan as unknown[]).entries()) {
        if (!objek(sub) || !teksWajib(sub.nama) || !nonNegatif(sub.jumlah) || !bulatPositif(sub.hargaSatuan)) {
          galat.push(`Bahan ke-${pos + 1} pada menu "${String(item.nama)}" tidak sah.`);
          break;
        }
        bahan.push({
          id: teks(sub.id, `${String(item.id)}-b${pos}`),
          nama: sub.nama.trim(),
          jumlah: sub.jumlah,
          satuan: teks(sub.satuan, 'pcs'),
          hargaSatuan: sub.hargaSatuan,
        });
      }
    }
    if (bahan.length === 0 && Array.isArray(item.bahan)) return;

    menus.push({
      id: item.id,
      nama: item.nama.trim(),
      kategori: item.kategori as KategoriMenu,
      hargaPerPorsi: item.hargaPerPorsi,
      waktuMasak: typeof item.waktuMasak === 'number' && Number.isFinite(item.waktuMasak) ? item.waktuMasak : 30,
      tersedia: item.tersedia,
      deskripsi: teks(item.deskripsi),
      bahan,
    });
  });

  /* ----------------------------- pesanan ---------------------------- */
  const pesanan: Pesanan[] = [];
  (mentah.pesanan as unknown[]).forEach((item, i) => {
    if (galat.length >= MAKS_KESALAHAN) return;
    if (!objek(item)) return void galat.push(`Pesanan ke-${i + 1} bukan objek.`);
    if (!teksWajib(item.id) || !teksWajib(item.kode) || !teksWajib(item.namaPelanggan)) {
      return void galat.push(`Pesanan ke-${i + 1} wajib memiliki id, kode, dan nama pelanggan.`);
    }
    if (!tanggalValid(item.tanggalAcara)) {
      return void galat.push(`${item.kode} tanggal acara harus berformat YYYY-MM-DD yang sah.`);
    }
    if (!jamValid(item.jamAcara)) {
      return void galat.push(`${item.kode} jam acara harus berformat HH:MM (24 jam).`);
    }
    if (!ULUTAN_STATUS.includes(item.status as StatusPesanan)) {
      return void galat.push(`${item.kode} memakai status tidak dikenal.`);
    }
    if (!Array.isArray(item.items) || item.items.length === 0) {
      return void galat.push(`${item.kode} harus memiliki minimal satu item menu.`);
    }
    if (!bulatPositif(item.dp)) {
      return void galat.push(`${item.kode} DP harus bilangan bulat ≥ 0.`);
    }

    const items: ItemPesanan[] = [];
    for (const [pos, sub] of (item.items as unknown[]).entries()) {
      if (!objek(sub) || !teksWajib(sub.menuId) || !teksWajib(sub.namaMenu)) {
        galat.push(`${item.kode} item ke-${pos + 1} harus memiliki menuId dan namaMenu.`);
        return;
      }
      if (!KATEGORI_MENU.includes(sub.kategori as KategoriMenu) || !bulatPositif(sub.hargaPerPorsi)) {
        galat.push(`${item.kode} item ke-${pos + 1} memakai kategori atau harga tidak sah.`);
        return;
      }
      if (typeof sub.jumlahPorsi !== 'number' || !Number.isInteger(sub.jumlahPorsi) || sub.jumlahPorsi < 1) {
        galat.push(`${item.kode} item ke-${pos + 1} jumlah porsi harus bilangan bulat ≥ 1.`);
        return;
      }
      items.push({
        id: teks(sub.id, `${item.id}-i${pos}`),
        menuId: sub.menuId,
        namaMenu: sub.namaMenu,
        kategori: sub.kategori as KategoriMenu,
        hargaPerPorsi: sub.hargaPerPorsi,
        jumlahPorsi: sub.jumlahPorsi,
      });
    }

    pesanan.push({
      id: item.id,
      kode: item.kode.trim(),
      namaPelanggan: item.namaPelanggan.trim(),
      kontak: teks(item.kontak),
      jenisAcara: teks(item.jenisAcara),
      tanggalAcara: item.tanggalAcara,
      jamAcara: item.jamAcara,
      alamat: teks(item.alamat),
      items,
      catatan: teks(item.catatan),
      catatanAntar: teks(item.catatanAntar),
      pengantar: teks(item.pengantar),
      dp: item.dp,
      status: item.status as StatusPesanan,
      sumber: (['manual', 'ulangan', 'impor', 'contoh'] as const).includes(item.sumber as never)
        ? (item.sumber as Pesanan['sumber'])
        : 'impor',
      dibuatPada: teks(item.dibuatPada, new Date().toISOString()),
      diperbaruiPada: teks(item.diperbaruiPada, new Date().toISOString()),
    });
  });

  /* ------------------------------ tugas ----------------------------- */
  const tugas: Tugas[] = [];
  if (Array.isArray(mentah.tugas)) {
    (mentah.tugas as unknown[]).forEach((item, i) => {
      if (!objek(item) || !teksWajib(item.id) || !teksWajib(item.judul) || !tanggalValid(item.batasWaktu)) {
        galat.push(`Tugas ke-${i + 1} tidak sah.`);
        return;
      }
      tugas.push({
        id: item.id,
        judul: item.judul,
        detail: teks(item.detail),
        batasWaktu: item.batasWaktu,
        prioritas: prioritasValid.has(String(item.prioritas)) ? (item.prioritas as Tugas['prioritas']) : 'sedang',
        selesai: item.selesai === true,
        sumber: item.sumber === 'otomasi' ? 'otomasi' : 'pengguna',
        dibuatPada: teks(item.dibuatPada, new Date().toISOString()),
        pesananId: typeof item.pesananId === 'string' ? item.pesananId : null,
      });
    });
  }

  /* ------------------------------ aturan ---------------------------- */
  const aturan: AturanOtomasi[] = [];
  if (Array.isArray(mentah.aturan)) {
    (mentah.aturan as unknown[]).forEach((item, i) => {
      if (!objek(item) || !teksWajib(item.id) || !teksWajib(item.nama)) {
        galat.push(`Aturan ke-${i + 1} tidak sah.`);
        return;
      }
      if (!pemicuValid.has(String(item.pemicu))) {
        galat.push(`Aturan "${String(item.nama)}" memakai pemicu tidak dikenal.`);
        return;
      }
      const kondisi: Kondisi[] = Array.isArray(item.kondisi)
        ? (item.kondisi as unknown[])
            .filter(
              (k): k is Kondisi =>
                objek(k) &&
                bidangValid.has(String(k.bidang)) &&
                operatorValid.has(String(k.operator)) &&
                typeof k.nilai === 'string',
            )
            .map((k, pos) => ({ id: k.id ?? `k${pos}`, bidang: k.bidang, operator: k.operator, nilai: k.nilai }))
        : [];
      const tindakan: Tindakan[] = Array.isArray(item.tindakan)
        ? (item.tindakan as unknown[])
            .filter((t): t is Tindakan => objek(t) && tindakanValid.has(String(t.jenis)))
            .map((t, pos) => ({ id: t.id ?? `t${pos}`, jenis: t.jenis, parameter: teks(t.parameter) }))
        : [];
      aturan.push({
        id: item.id,
        nama: item.nama,
        aktif: item.aktif !== false,
        pemicu: item.pemicu as AturanOtomasi['pemicu'],
        kondisi,
        tindakan,
        dibuatPada: teks(item.dibuatPada, new Date().toISOString()),
        eksekusi: typeof item.eksekusi === 'number' ? item.eksekusi : 0,
      });
    });
  }

  const aktivitas: BackupData['aktivitas'] = [];
  if (Array.isArray(mentah.aktivitas)) {
    (mentah.aktivitas as unknown[]).forEach((item, i) => {
      if (!objek(item) || !teksWajib(item.judul)) return;
      aktivitas.push({
        id: teks(item.id, `ak-i${i}`),
        waktu: teks(item.waktu, new Date().toISOString()),
        jenis: (teks(item.jenis, 'sistem') as BackupData['aktivitas'][number]['jenis']),
        judul: item.judul,
        detail: teks(item.detail),
        oleh: (['pengguna', 'otomasi', 'sistem'] as const).includes(item.oleh as never)
          ? (item.oleh as 'pengguna' | 'otomasi' | 'sistem')
          : 'sistem',
      });
    });
  }

  if (menus.length === 0) galat.push('Daftar menu tidak boleh kosong.');
  const kodeUnik = new Set(pesanan.map((p) => p.kode));
  if (kodeUnik.size !== pesanan.length) galat.push('Ada kode pesanan yang ganda.');

  if (galat.length > 0) {
    return {
      ok: false,
      pesan: `Data tidak valid: ${galat.slice(0, MAKS_KESALAHAN).join(' ')}${galat.length > MAKS_KESALAHAN ? ' …' : ''}`,
    };
  }

  return {
    ok: true,
    data: {
      version: batasVersi,
      disimpanPada: teks(mentah.disimpanPada, new Date().toISOString()),
      menus,
      pesanan,
      tugas,
      aturan,
      aktivitas: aktivitas.slice(0, 200),
    },
  };
}

/* ==================================================================== */
/* Validasi formulir                                                     */
/* ==================================================================== */

export type GalatField = Record<string, string>;

export interface DraftItem {
  id: string;
  menuId: string;
  jumlahPorsi: string;
}

export interface DraftPesanan {
  namaPelanggan: string;
  kontak: string;
  jenisAcara: string;
  tanggalAcara: string;
  jamAcara: string;
  alamat: string;
  pengantar: string;
  items: DraftItem[];
  catatan: string;
  catatanAntar: string;
  dp: string;
}

export const MAKS_PORSI = 5_000;

export function validasiJumlahPorsi(v: string): string | null {
  const s = v.trim();
  if (s === '') return 'Jumlah porsi wajib diisi.';
  if (!/^\d+$/.test(s)) return 'Jumlah porsi harus berupa bilangan bulat positif.';
  const n = Number.parseInt(s, 10);
  if (n < 1) return 'Jumlah porsi minimal 1.';
  if (n > MAKS_PORSI) return `Jumlah porsi maksimal ${MAKS_PORSI.toLocaleString('id-ID')}.`;
  return null;
}

export function validasiKontak(v: string): string | null {
  const s = v.trim();
  if (s === '') return null;
  if (!/^[+0-9][0-9\s()-]{6,19}$/.test(s)) {
    return 'Nomor kontak hanya boleh berisi angka, spasi, dan tanda + ( ) — minimal 8 karakter.';
  }
  return null;
}

export function validasiTanggalAcara(v: string): string | null {
  if (v === '') return 'Tanggal acara wajib diisi.';
  return tanggalValid(v) ? null : 'Tanggal acara tidak sah.';
}

export function validasiJamAcara(v: string): string | null {
  if (v === '') return 'Jam acara wajib diisi.';
  return jamValid(v) ? null : 'Jam acara harus berformat HH:MM (24 jam).';
}

export function validasiDP(v: string, total: number): string | null {
  const s = v.trim();
  if (s === '') return null;
  if (!/^\d+$/.test(s)) return 'DP harus berupa bilangan bulat rupiah.';
  if (Number.parseInt(s, 10) > total) {
    return `DP tidak boleh melebihi total order (${total.toLocaleString('id-ID')}).`;
  }
  return null;
}

export function hitungTotalDraft(items: DraftItem[], menus: MenuItem[]): number {
  const harga = new Map(menus.map((m) => [m.id, m.hargaPerPorsi]));
  return items.reduce((total, i) => {
    const porsi = Number.parseInt(i.jumlahPorsi, 10);
    if (!Number.isFinite(porsi) || porsi < 1) return total;
    return total + (harga.get(i.menuId) ?? 0) * porsi;
  }, 0);
}

export function hitungPorsiDraft(items: DraftItem[]): number {
  return items.reduce((total, i) => {
    const porsi = Number.parseInt(i.jumlahPorsi, 10);
    if (!Number.isFinite(porsi) || porsi < 1) return total;
    return total + porsi;
  }, 0);
}

export function validasiDraftPesanan(draft: DraftPesanan, menus: MenuItem[]): GalatField {
  const g: GalatField = {};
  if (draft.namaPelanggan.trim().length < 3) g.namaPelanggan = 'Nama pelanggan minimal 3 karakter.';
  const kontak = validasiKontak(draft.kontak);
  if (kontak !== null) g.kontak = kontak;
  if (draft.jenisAcara.trim() === '') g.jenisAcara = 'Jenis acara wajib diisi.';
  const tgl = validasiTanggalAcara(draft.tanggalAcara);
  if (tgl !== null) g.tanggalAcara = tgl;
  const jam = validasiJamAcara(draft.jamAcara);
  if (jam !== null) g.jamAcara = jam;
  if (draft.alamat.trim().length < 6) g.alamat = 'Alamat singkat minimal 6 karakter.';

  if (draft.items.length === 0) {
    g.items = 'Tambahkan minimal satu menu ke pesanan.';
  } else {
    for (const i of draft.items) {
      if (i.menuId === '') {
        g.items = 'Setiap baris harus memilih salah satu menu.';
        break;
      }
      if (validasiJumlahPorsi(i.jumlahPorsi) !== null) {
        g.items = 'Jumlah porsi setiap baris harus bilangan bulat positif (minimal 1).';
        break;
      }
    }
  }

  const total = hitungTotalDraft(draft.items, menus);
  if (total <= 0 && draft.items.length > 0) {
    g.items = 'Total order belum bisa dihitung; periksa menu dan jumlah porsi.';
  }
  const dp = validasiDP(draft.dp, total);
  if (dp !== null) g.dp = dp;
  return g;
}

/* ------------------------------- menu -------------------------------- */

export interface DraftMenu {
  nama: string;
  kategori: KategoriMenu;
  hargaPerPorsi: string;
  waktuMasak: string;
  deskripsi: string;
  tersedia: boolean;
  bahan: Array<{ id: string; nama: string; jumlah: string; satuan: string; hargaSatuan: string }>;
}

export function draftMenuAwal(m: MenuItem | null): DraftMenu {
  if (m === null) {
    return { nama: '', kategori: 'makanan', hargaPerPorsi: '', waktuMasak: '30', deskripsi: '', tersedia: true, bahan: [] };
  }
  return {
    nama: m.nama,
    kategori: m.kategori,
    hargaPerPorsi: String(m.hargaPerPorsi),
    waktuMasak: String(m.waktuMasak),
    deskripsi: m.deskripsi,
    tersedia: m.tersedia,
    bahan: m.bahan.map((b) => ({
      id: b.id,
      nama: b.nama,
      jumlah: String(b.jumlah),
      satuan: b.satuan,
      hargaSatuan: String(b.hargaSatuan),
    })),
  };
}

export function validasiDraftMenu(draft: DraftMenu): GalatField {
  const g: GalatField = {};
  if (draft.nama.trim().length < 3) g.nama = 'Nama menu minimal 3 karakter.';
  const harga = draft.hargaPerPorsi.trim();
  if (harga === '') g.hargaPerPorsi = 'Harga per porsi wajib diisi.';
  else if (!/^\d+$/.test(harga)) g.hargaPerPorsi = 'Harga harus berupa bilangan bulat rupiah.';
  else if (Number.parseInt(harga, 10) < 1_000) g.hargaPerPorsi = 'Harga per porsi minimal Rp1.000.';

  const waktu = draft.waktuMasak.trim();
  if (waktu === '') g.waktuMasak = 'Waktu masak wajib diisi.';
  else if (!/^\d+$/.test(waktu) || Number.parseInt(waktu, 10) < 1 || Number.parseInt(waktu, 10) > 1_440) {
    g.waktuMasak = 'Waktu masak harus berupa menit antara 1 dan 1.440.';
  }

  for (const [i, b] of draft.bahan.entries()) {
    if (b.nama.trim() === '') {
      g[`bahan-${i}`] = 'Nama bahan wajib diisi.';
      continue;
    }
    const jumlah = b.jumlah.trim();
    const hargaSatuan = b.hargaSatuan.trim();
    if (jumlah === '' || !/^\d*\.?\d+$/.test(jumlah) || Number(jumlah) <= 0) {
      g[`bahan-${i}`] = 'Kebutuhan harus angka lebih besar dari nol (boleh desimal).';
      continue;
    }
    if (hargaSatuan === '' || !/^\d+$/.test(hargaSatuan)) {
      g[`bahan-${i}`] = 'Harga satuan harus bilangan bulat rupiah.';
    }
  }
  return g;
}

export function draftMenuKeMenu(draft: DraftMenu, id: string): MenuItem {
  return {
    id,
    nama: draft.nama.trim(),
    kategori: draft.kategori,
    hargaPerPorsi: Number.parseInt(draft.hargaPerPorsi, 10) || 0,
    waktuMasak: Number.parseInt(draft.waktuMasak, 10) || 30,
    tersedia: draft.tersedia,
    deskripsi: draft.deskripsi.trim(),
    bahan: draft.bahan
      .filter((b) => b.nama.trim() !== '')
      .map((b) => ({
        id: b.id,
        nama: b.nama.trim(),
        jumlah: Number.parseFloat(b.jumlah) || 0,
        satuan: b.satuan.trim() || 'pcs',
        hargaSatuan: Number.parseInt(b.hargaSatuan, 10) || 0,
      })),
  };
}

export const PREFSI = PREFSI_BAWAAN;