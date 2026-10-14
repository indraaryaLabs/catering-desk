import type { ItemPesanan, KategoriMenu, MenuItem, Pesanan, StatusPesanan } from '../types';
import { selisihHari } from './tanggal';

export type { Prioritas } from '../types';

/* ========================== Matematika order ========================= */

export function totalItem(item: Pick<ItemPesanan, 'jumlahPorsi' | 'hargaPerPorsi'>): number {
  return item.jumlahPorsi * item.hargaPerPorsi;
}

/** Total order = Σ (jumlah porsi × harga per porsi). */
export function totalPesanan(p: Pick<Pesanan, 'items'>): number {
  return p.items.reduce((n, item) => n + totalItem(item), 0);
}

export function totalPorsi(p: Pick<Pesanan, 'items'>): number {
  return p.items.reduce((n, item) => n + item.jumlahPorsi, 0);
}

export function sisaBayar(p: Pick<Pesanan, 'items' | 'dp'>): number {
  return Math.max(0, totalPesanan(p) - p.dp);
}

export type StatusPembayaran = 'belum' | 'sebagian' | 'lunas';

export function statusPembayaran(dp: number, total: number): StatusPembayaran {
  if (total <= 0) return 'lunas';
  if (dp <= 0) return 'belum';
  if (dp >= total) return 'lunas';
  return 'sebagian';
}

export function statusPembayaranPesanan(p: Pick<Pesanan, 'items' | 'dp'>): StatusPembayaran {
  return statusPembayaran(p.dp, totalPesanan(p));
}

export function persenDP(p: Pick<Pesanan, 'items' | 'dp'>): number {
  const total = totalPesanan(p);
  return total <= 0 ? 0 : Math.round((p.dp / total) * 100);
}

export const LABEL_PEMBAYARAN: Record<StatusPembayaran, string> = {
  belum: 'Belum bayar',
  sebagian: 'DP sebagian',
  lunas: 'Lunas',
};

/* ============================ Status & alur ========================== */

export function pesananAktif(p: Pesanan): boolean {
  return p.status !== 'dibatalkan';
}

export function finalStatus(s: StatusPesanan): boolean {
  return s === 'selesai';
}

export function setelahPesanan(p: Pesanan): boolean {
  return p.status === 'selesai';
}

export interface AksiStatus {
  status: StatusPesanan;
  label: string;
  nada: 'utama' | 'bahaya';
}

export function aksiStatus(s: StatusPesanan): AksiStatus[] {
  switch (s) {
    case 'inquiry':
      return [
        { status: 'dikonfirmasi', label: 'Konfirmasi', nada: 'utama' },
        { status: 'dibatalkan', label: 'Batalkan', nada: 'bahaya' },
      ];
    case 'dikonfirmasi':
      return [
        { status: 'persiapan', label: 'Mulai Persiapan', nada: 'utama' },
        { status: 'dibatalkan', label: 'Batalkan', nada: 'bahaya' },
      ];
    case 'persiapan':
      return [
        { status: 'siap', label: 'Tandai Siap', nada: 'utama' },
        { status: 'dibatalkan', label: 'Batalkan', nada: 'bahaya' },
      ];
    case 'siap':
      return [
        { status: 'selesai', label: 'Selesaikan', nada: 'utama' },
        { status: 'dibatalkan', label: 'Batalkan', nada: 'bahaya' },
      ];
    case 'selesai':
      return [];
    case 'dibatalkan':
      return [{ status: 'inquiry', label: 'Aktifkan Kembali', nada: 'utama' }];
    default:
      return [];
  }
}

export function transisiDiizinkan(dari: StatusPesanan, ke: StatusPesanan): boolean {
  return aksiStatus(dari).some((a) => a.status === ke);
}

export function aksiUtama(s: StatusPesanan): AksiStatus | undefined {
  return aksiStatus(s).find((a) => a.nada === 'utama');
}

export const URUTAN_ALUR: StatusPesanan[] = [
  'inquiry',
  'dikonfirmasi',
  'persiapan',
  'siap',
  'selesai',
  'dibatalkan',
];

/** Urutan status di alur; dibatalkan diposisikan paling akhir. */
export function urutanStatus(s: StatusPesanan): number {
  const i = URUTAN_ALUR.indexOf(s);
  return i < 0 ? 99 : i;
}

/* ================================ HPP ================================ */

export function hppPerPorsi(menu: Pick<MenuItem, 'bahan'>): number {
  return menu.bahan.reduce((n, b) => n + b.jumlah * b.hargaSatuan, 0);
}

export function labaPerPorsi(menu: Pick<MenuItem, 'hargaPerPorsi' | 'bahan'>): number {
  return menu.hargaPerPorsi - hppPerPorsi(menu);
}

/**
 * Margin dalam persen. Menu tanpa resep mengembalikan 0 karena HPP-nya
 * memang belum diketahui - bukan karena margin-nya benar-benar seratus.
 */
export function marginPersen(menu: Pick<MenuItem, 'hargaPerPorsi' | 'bahan'>): number {
  if (menu.hargaPerPorsi <= 0) return 0;
  if (menu.bahan.length === 0) return 0;
  return Math.round((labaPerPorsi(menu) / menu.hargaPerPorsi) * 100);
}

export function adaResep(menu: Pick<MenuItem, 'bahan'>): boolean {
  return menu.bahan.length > 0;
}

export function menuMasihDigunakan(daftar: Pesanan[], menuId: string): number {
  return daftar.filter(
    (p) => p.items.some((i) => i.menuId === menuId) && !isBatal(p.status),
  ).length;
}

export function menuDipakaiDiPesanan(daftar: Pesanan[]): Map<string, number> {
  const hitung = new Map<string, number>();
  for (const p of daftar) {
    if (isBatal(p.status)) continue;
    const sudah = new Set(p.items.map((i) => i.menuId));
    for (const menuId of sudah) hitung.set(menuId, (hitung.get(menuId) ?? 0) + 1);
  }
  return hitung;
}

function isBatal(s: StatusPesanan): boolean {
  return s === 'dibatalkan';
}

/* ======================= Aggregasi produksi ========================= */

export interface BarisProduksi {
  menuId: string;
  namaMenu: string;
  kategori: KategoriMenu;
  hargaPerPorsi: number;
  totalPorsi: number;
  jumlahPesanan: number;
  kodePesanan: string[];
  waktuMasak: number;
}

export interface RingkasanProduksi {
  tanggal: string;
  totalPesananAktif: number;
  totalPesananDibatalkan: number;
  totalPorsi: number;
  totalNilai: number;
  baris: BarisProduksi[];
  kodePesanan: string[];
  menitKerja: number;
}

/**
 * Agregasi porsi per menu untuk satu tanggal acara.
 * Pesanan batal tidak dihitung sama sekali.
 */
export function ringkasanProduksi(
  daftar: Pesanan[],
  tanggal: string,
  menuWaktu: Map<string, number> = new Map(),
): RingkasanProduksi {
  const padaTanggal = daftar.filter((p) => p.tanggalAcara === tanggal);
  const aktif = padaTanggal.filter(pesananAktif).sort((a, b) => a.jamAcara.localeCompare(b.jamAcara));

  const perMenu = new Map<string, BarisProduksi>();
  let totalPorsi = 0;
  let totalNilai = 0;
  let menitKerja = 0;

  for (const p of aktif) {
    for (const item of p.items) {
      const kunci = item.menuId || item.namaMenu;
      const baris =
        perMenu.get(kunci) ??
        {
          menuId: item.menuId,
          namaMenu: item.namaMenu,
          kategori: item.kategori,
          hargaPerPorsi: item.hargaPerPorsi,
          totalPorsi: 0,
          jumlahPesanan: 0,
          kodePesanan: [],
          waktuMasak: menuWaktu.get(item.menuId) ?? 30,
        };
      baris.totalPorsi += item.jumlahPorsi;
      baris.jumlahPesanan += 1;
      baris.kodePesanan.push(p.kode);
      totalPorsi += item.jumlahPorsi;
      totalNilai += totalItem(item);
      menitKerja += item.jumlahPorsi * baris.waktuMasak;
      perMenu.set(kunci, baris);
    }
  }

  const baris = [...perMenu.values()].sort(
    (a, b) => b.totalPorsi - a.totalPorsi || a.namaMenu.localeCompare(b.namaMenu, 'id'),
  );

  return {
    tanggal,
    totalPesananAktif: aktif.length,
    totalPesananDibatalkan: padaTanggal.length - aktif.length,
    totalPorsi,
    baris,
    kodePesanan: aktif.map((p) => p.kode),
    totalNilai,
    menitKerja: Math.round(menitKerja),
  };
}

export function tanggalBerproduksi(daftar: Pesanan[]): string[] {
  const set = new Set(daftar.filter(pesananAktif).map((p) => p.tanggalAcara));
  return [...set].sort();
}

/* =========================== Kebutuhan bahan ========================= */

export interface KebutuhanBahan {
  nama: string;
  satuan: string;
  jumlah: number;
  biaya: number;
  dariMenu: string[];
}

/**
 * Menggabungkan kebutuhan bahan seluruh pesanan aktif pada satu tanggal,
 * sehingga bisa dijadikan daftar belanja untuk pasar.
 */
export function daftarBelanja(
  daftar: Pesanan[],
  tanggal: string,
  menus: MenuItem[],
): KebutuhanBahan[] {
  const index = new Map(menus.map((m) => [m.id, m]));
  const total = new Map<string, KebutuhanBahan>();

  for (const p of daftar) {
    if (p.tanggalAcara !== tanggal || !pesananAktif(p)) continue;
    for (const item of p.items) {
      const menu = index.get(item.menuId);
      if (menu === undefined) continue;
      for (const bahan of menu.bahan) {
        const kunci = `${bahan.nama.toLowerCase()}::${bahan.satuan.toLowerCase()}`;
        const baris =
          total.get(kunci) ??
          { nama: bahan.nama, satuan: bahan.satuan, jumlah: 0, biaya: 0, dariMenu: [] };
        baris.jumlah += bahan.jumlah * item.jumlahPorsi;
        baris.biaya += bahan.jumlah * bahan.hargaSatuan * item.jumlahPorsi;
        if (!baris.dariMenu.includes(menu.nama)) baris.dariMenu.push(menu.nama);
        total.set(kunci, baris);
      }
    }
  }

  return [...total.values()].sort((a, b) => b.biaya - a.biaya || a.nama.localeCompare(b.nama, 'id'));
}

/* ============================= Beban beban ========================== */

export type TingkatBeban = 'ringan' | 'sedang' | 'berat' | 'penuh';

export function tingkatBeban(porsi: number, ambang: number): TingkatBeban {
  if (porsi <= 0) return 'ringan';
  const r = porsi / Math.max(1, ambang);
  if (r < 0.4) return 'ringan';
  if (r < 0.8) return 'sedang';
  if (r < 1.2) return 'berat';
  return 'penuh';
}

export const LABEL_BEBAN: Record<TingkatBeban, string> = {
  ringan: 'Ringan',
  sedang: 'Sedang',
  berat: 'Berat',
  penuh: 'Penuh',
};

export function hariMenujuAcara(p: Pesanan, acuan: string): number {
  return selisihHari(acuan, p.tanggalAcara);
}