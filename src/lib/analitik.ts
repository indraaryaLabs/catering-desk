import type { MenuItem, Pesanan, StatusPesanan } from '../types';
import { LABEL_STATUS, ULUTAN_STATUS } from '../types';
import {
  hppPerPorsi,
  pesananAktif,
  statusPembayaranPesanan,
  sisaBayar,
  totalPorsi,
  totalPesanan,
} from './pesanan';
import { bulanISO, dariISO, geserHari, hariIni, keMenit, namaBulan, selisihHari } from './tanggal';

/* =========================== Ringkasan utama ========================= */

export interface Metrik {
  totalPesanan: number;
  pesananAktif: number;
  porsi: number;
  nilai: number;
  dpMasuk: number;
  tertagih: number;
  rataRataPesanan: number;
}

export function metrikUmum(pesanan: Pesanan[], dari?: string, sampai?: string): Metrik {
  const daftar = pesanan.filter((p) => {
    if (!pesananAktif(p)) return false;
    if (dari !== undefined && p.tanggalAcara < dari) return false;
    if (sampai !== undefined && p.tanggalAcara > sampai) return false;
    return true;
  });
  const nilai = daftar.reduce((n, p) => n + totalPesanan(p), 0);
  return {
    totalPesanan: pesanan.length,
    pesananAktif: daftar.length,
    porsi: daftar.reduce((n, p) => n + totalPorsi(p), 0),
    nilai,
    dpMasuk: daftar.reduce((n, p) => n + p.dp, 0),
    tertagih: daftar.reduce((n, p) => n + sisaBayar(p), 0),
    rataRataPesanan: daftar.length === 0 ? 0 : Math.round(nilai / daftar.length),
  };
}

/* ============================ Tren bulanan =========================== */

export interface TitikBulan {
  bulan: string;
  label: string;
  pesanan: number;
  porsi: number;
  nilai: number;
}

export function trenBulanan(pesanan: Pesanan[], jumlahBulan = 6, acuan = hariIni()): TitikBulan[] {
  const kunci = new Set<string>();
  for (let i = jumlahBulan - 1; i >= 0; i -= 1) kunci.add(bulanISO(geserHari(acuan, -i * 30)));
  for (const p of pesanan) kunci.add(bulanISO(p.tanggalAcara));

  return [...kunci]
    .sort()
    .slice(-jumlahBulan)
    .map((b) => {
      const dalamBulan = pesanan.filter((p) => bulanISO(p.tanggalAcara) === b && pesananAktif(p));
      return {
        bulan: b,
        label: namaBulan(`${b}-01`),
        pesanan: dalamBulan.length,
        porsi: dalamBulan.reduce((n, p) => n + totalPorsi(p), 0),
        nilai: dalamBulan.reduce((n, p) => n + totalPesanan(p), 0),
      };
    });
}

/* ============================ Corong status ========================== */

export interface TahapCorong {
  status: StatusPesanan;
  label: string;
  jumlah: number;
  nilai: number;
}

export function corongStatus(pesanan: Pesanan[]): TahapCorong[] {
  return ULUTAN_STATUS.map((status) => {
    const daftar = pesanan.filter((p) => p.status === status);
    return {
      status,
      label: LABEL_STATUS[status],
      jumlah: daftar.length,
      nilai: daftar.reduce((n, p) => n + totalPesanan(p), 0),
    };
  });
}

/* ============================= Komposisi menu ======================== */

export interface BarisKomposisi {
  menuId: string;
  nama: string;
  kategori: string;
  porsi: number;
  nilai: number;
  porsiPersen: number;
  hpp: number;
  laba: number;
  margin: number;
}

export function komposisiMenu(
  pesanan: Pesanan[],
  menus: MenuItem[],
  acuan = hariIni(),
): BarisKomposisi[] {
  const index = new Map(menus.map((m) => [m.id, m]));
  const daftar = pesanan.filter((p) => pesananAktif(p) && selisihHari(acuan, p.tanggalAcara) >= -90);
  const total = new Map<string, BarisKomposisi>();
  let totalPorsi = 0;

  for (const p of daftar) {
    for (const item of p.items) {
      const menu = index.get(item.menuId);
      const baris =
        total.get(item.menuId) ??
        {
          menuId: item.menuId,
          nama: item.namaMenu,
          kategori: item.kategori,
          porsi: 0,
          nilai: 0,
          hpp: 0,
          laba: 0,
          margin: 0,
          porsiPersen: 0,
        };
      const hppSatuan = menu === undefined ? 0 : hppPerPorsi(menu);
      baris.porsi += item.jumlahPorsi;
      baris.nilai += item.jumlahPorsi * item.hargaPerPorsi;
      baris.hpp += item.jumlahPorsi * hppSatuan;
      baris.laba += item.jumlahPorsi * (item.hargaPerPorsi - hppSatuan);
      totalPorsi += item.jumlahPorsi;
      total.set(item.menuId, baris);
    }
  }

  return [...total.values()]
    .map((b) => ({
      ...b,
      porsiPersen: totalPorsi === 0 ? 0 : Math.round((b.porsi / totalPorsi) * 100),
      margin: b.nilai === 0 ? 0 : Math.round((b.laba / b.nilai) * 100),
    }))
    .sort((a, b) => b.nilai - a.nilai);
}

/* ============================== Piutang ============================= */

export interface SebaranBayar {
  status: string;
  jumlah: number;
  nilai: number;
}

export interface KeranjangPiutang {
  label: string;
  minHari: number;
  maksHari: number;
  jumlah: number;
  nilai: number;
}

export interface Tunggakan {
  total: number;
  nilai: number;
  sebaran: SebaranBayar[];
  keranjang: KeranjangPiutang[];
  terlamaHari: number;
  terlama: Pesanan | null;
}

/** Umur piutang dihitung dari tanggal acara pesanan yang belum lunas. */
export function analisisPiutang(pesanan: Pesanan[], acuan = hariIni()): Tunggakan {
  const menunggak = pesanan.filter((p) => pesananAktif(p) && sisaBayar(p) > 0);

  const sebaran = (['belum', 'sebagian', 'lunas'] as const).map((status) => {
    const daftar = menunggak.filter((p) => statusPembayaranPesanan(p) === status);
    return { status, jumlah: daftar.length, nilai: daftar.reduce((n, p) => n + sisaBayar(p), 0) };
  });

  const keranjang: KeranjangPiutang[] = [
    { label: 'Belum jatuh tempo', minHari: -99999, maksHari: 0 },
    { label: 'Telat 1–7 hari', minHari: 1, maksHari: 7 },
    { label: 'Telat 8–30 hari', minHari: 8, maksHari: 30 },
    { label: 'Telat lebih dari 30 hari', minHari: 31, maksHari: 99999 },
  ].map((b) => {
    const daftar = menunggak.filter((p) => {
      const umur = selisihHari(p.tanggalAcara, acuan);
      return umur >= b.minHari && umur <= b.maksHari;
    });
    return { ...b, jumlah: daftar.length, nilai: daftar.reduce((n, p) => n + sisaBayar(p), 0) };
  });

  const terlama = [...menunggak].sort(
    (a, b) => selisihHari(b.tanggalAcara, acuan) - selisihHari(a.tanggalAcara, acuan),
  )[0];

  return {
    total: menunggak.length,
    nilai: menunggak.reduce((n, p) => n + sisaBayar(p), 0),
    sebaran,
    keranjang,
    terlamaHari: terlama === undefined ? 0 : selisihHari(terlama.tanggalAcara, acuan),
    terlama: terlama ?? null,
  };
}

/* ============================ Beban per hari ========================= */

export interface BebanHari {
  tanggal: string;
  porsi: number;
  pesanan: number;
  bebanPersen: number;
}

export function bebanMingguan(
  pesanan: Pesanan[],
  ambang: number,
  acuan = hariIni(),
  jumlahHari = 14,
): BebanHari[] {
  return Array.from({ length: jumlahHari }, (_, i) => {
    const tanggal = geserHari(acuan, i);
    const hari = pesanan.filter((p) => p.tanggalAcara === tanggal && pesananAktif(p));
    const porsi = hari.reduce((n, p) => n + totalPorsi(p), 0);
    return {
      tanggal,
      porsi,
      pesanan: hari.length,
      bebanPersen: Math.round((porsi / Math.max(1, ambang)) * 100),
    };
  });
}

/* =========================== Pola pemesanan ========================= */

export interface PolaHari {
  hari: string;
  pesanan: number;
  porsi: number;
}

/** Rata-rata pesanan per nama hari dalam 90 hari terakhir. */
export function polaMingguan(pesanan: Pesanan[], acuan = hariIni()): PolaHari[] {
  const urut = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  const total = new Map<string, { pesanan: number; porsi: number }>(
    urut.map((h) => [h, { pesanan: 0, porsi: 0 }]),
  );

  for (const p of pesanan) {
    if (!pesananAktif(p)) continue;
    if (selisihHari(p.tanggalAcara, acuan) < -90) continue;
    const key = dariISO(p.tanggalAcara).toLocaleDateString('id-ID', { weekday: 'long' });
    const baris = total.get(key);
    if (baris === undefined) continue;
    baris.pesanan += 1;
    baris.porsi += totalPorsi(p);
  }

  return urut.map((hari) => ({ hari, ...(total.get(hari) ?? { pesanan: 0, porsi: 0 }) }));
}

export interface JamPuncak {
  jam: number;
  label: string;
  pesanan: number;
}

/** Jam acara tersibuk dari seluruh pesanan aktif. */
export function jamPuncak(pesanan: Pesanan[], jumlah = 4): JamPuncak[] {
  const total = new Map<number, number>();
  for (const p of pesanan) {
    if (!pesananAktif(p)) continue;
    const jam = Math.floor(keMenit(p.jamAcara) / 60);
    total.set(jam, (total.get(jam) ?? 0) + 1);
  }
  return [...total.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, jumlah)
    .map(([jam, n]) => ({ jam, label: `${String(jam).padStart(2, '0')}:00`, pesanan: n }));
}

/* =========================== Laba & margin ========================== */

export interface RingkasanLaba {
  pendapatan: number;
  hpp: number;
  laba: number;
  margin: number;
  adaResep: boolean;
}

export function ringkasanLaba(pesanan: Pesanan[], menus: MenuItem[]): RingkasanLaba {
  const index = new Map(menus.map((m) => [m.id, m]));
  let pendapatan = 0;
  let hpp = 0;
  let adaResep = false;

  for (const p of pesanan) {
    if (!pesananAktif(p)) continue;
    for (const item of p.items) {
      pendapatan += item.jumlahPorsi * item.hargaPerPorsi;
      const menu = index.get(item.menuId);
      if (menu !== undefined && menu.bahan.length > 0) {
        adaResep = true;
        hpp += item.jumlahPorsi * hppPerPorsi(menu);
      }
    }
  }

  return {
    pendapatan,
    hpp: Math.round(hpp),
    laba: Math.round(pendapatan - hpp),
    margin: pendapatan === 0 ? 0 : Math.round(((pendapatan - hpp) / pendapatan) * 100),
    adaResep,
  };
}