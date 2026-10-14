import type { Pesanan, StatusPesanan } from '../types';
import { normalisasi } from './format';
import { statusPembayaranPesanan, totalPesanan, sisaBayar } from './pesanan';
import type { StatusPembayaran } from './pesanan';
import { selisihHari } from './tanggal';

export type StatusFilter = StatusPesanan | 'semua';
export type PembayaranFilter = StatusPembayaran | 'semua';
export type UrutanPesanan =
  | 'tanggal-acara'
  | 'dibuat-terbaru'
  | 'nilai-terbesar'
  | 'sisa-terbesar'
  | 'nama-pelanggan';

export const LABEL_URUTAN: Record<UrutanPesanan, string> = {
  'tanggal-acara': 'Tanggal acara (terdekat)',
  'dibuat-terbaru': 'Terbaru dibuat',
  'nilai-terbesar': 'Nilai terbesar',
  'sisa-terbesar': 'Sisa tagihan terbesar',
  'nama-pelanggan': 'Nama pelanggan (A-Z)',
};

export interface FilterPesanan {
  q: string;
  status: StatusFilter;
  pembayaran: PembayaranFilter;
  pengantar: string;
  tanggal: string;
  hanyaAktif: boolean;
  urut: UrutanPesanan;
}

export const FILTER_AWAL: FilterPesanan = {
  q: '',
  status: 'semua',
  pembayaran: 'semua',
  pengantar: 'semua',
  tanggal: '',
  hanyaAktif: true,
  urut: 'tanggal-acara',
};

export function filterAktif(f: FilterPesanan): boolean {
  return (
    f.q.trim() !== '' ||
    f.status !== 'semua' ||
    f.pembayaran !== 'semua' ||
    f.pengantar !== 'semua' ||
    f.tanggal !== '' ||
    !f.hanyaAktif
  );
}

function teksPencarian(p: Pesanan): string {
  return normalisasi(
    [
      p.kode,
      p.namaPelanggan,
      p.kontak,
      p.jenisAcara,
      p.alamat,
      p.pengantar,
      p.catatan,
      p.catatanAntar,
      p.status,
      ...p.items.map((i) => i.namaMenu),
    ].join(' '),
  );
}

export function cocokPencarian(p: Pesanan, kueri: string): boolean {
  const k = normalisasi(kueri);
  return k === '' || teksPencarian(p).includes(k);
}

const URUT: Record<UrutanPesanan, (a: Pesanan, b: Pesanan) => number> = {
  'tanggal-acara': (a, b) =>
    a.tanggalAcara.localeCompare(b.tanggalAcara) ||
    a.jamAcara.localeCompare(b.jamAcara) ||
    a.kode.localeCompare(b.kode, 'id'),
  'dibuat-terbaru': (a, b) => b.dibuatPada.localeCompare(a.dibuatPada),
  'nilai-terbesar': (a, b) => totalPesanan(b) - totalPesanan(a),
  'sisa-terbesar': (a, b) => sisaBayar(b) - sisaBayar(a),
  'nama-pelanggan': (a, b) => a.namaPelanggan.localeCompare(b.namaPelanggan, 'id'),
};

export function filterDanUrutkan(pesanan: Pesanan[], f: FilterPesanan): Pesanan[] {
  const hasil = pesanan.filter((p) => {
    if (f.hanyaAktif && p.status === 'dibatalkan') return false;
    if (!cocokPencarian(p, f.q)) return false;
    if (f.status !== 'semua' && p.status !== f.status) return false;
    if (f.pembayaran !== 'semua' && statusPembayaranPesanan(p) !== f.pembayaran) return false;
    if (f.pengantar !== 'semua' && p.pengantar !== f.pengantar) return false;
    if (f.tanggal !== '' && p.tanggalAcara !== f.tanggal) return false;
    return true;
  });

  // Tampilan bawaan mengurutkan menurut jadwal acara dan selalu mendorong
  // pesanan batal ke bawah agar daftar kerja tetap bersih. Urutan lain yang
  // dipilih pengguna dipakai apa adanya, tanpa syarat tambahan.
  const diBawah = (p: Pesanan) => (p.status === 'dibatalkan' ? 1 : 0);
  const bawaan = f.urut === 'tanggal-acara' && f.status === 'semua';
  return [...hasil].sort((a, b) => {
    if (bawaan && diBawah(a) !== diBawah(b)) return diBawah(a) - diBawah(b);
    return URUT[f.urut](a, b);
  });
}

export interface RingkasanFilter {
  jumlah: number;
  porsi: number;
  nilai: number;
  sisa: number;
}

export function ringkasHasil(daftar: Pesanan[]): RingkasanFilter {
  return {
    jumlah: daftar.length,
    porsi: daftar.reduce((n, p) => n + p.items.reduce((m, i) => m + i.jumlahPorsi, 0), 0),
    nilai: daftar.reduce((n, p) => n + totalPesanan(p), 0),
    sisa: daftar.reduce((n, p) => n + sisaBayar(p), 0),
  };
}

/** Daftar pilihan unik pengantar dari data pesanan. */
export function daftarPengantar(pesanan: Pesanan[]): string[] {
  const set = new Set<string>();
  for (const p of pesanan) if (p.pengantar.trim() !== '') set.add(p.pengantar.trim());
  return [...set].sort((a, b) => a.localeCompare(b, 'id'));
}

/* ----------------------------- tampilan ----------------------------- */

export type TampilanPesanan = 'tabel' | 'kartu';

export interface TampilanSimpan {
  tampilan: TampilanPesanan;
  filter: FilterPesanan;
}

export function bawaanTampilan(): TampilanSimpan {
  return { tampilan: 'tabel', filter: FILTER_AWAL };
}

/** Berapa pesanan yang jatuh tempo hari ini dan belum lunas. */
export function perluPerhatian(pesanan: Pesanan[], hariIni: string): Pesanan[] {
  return pesanan
    .filter(
      (p) =>
        p.status !== 'dibatalkan' &&
        p.status !== 'selesai' &&
        selisihHari(hariIni, p.tanggalAcara) <= 1,
    )
    .sort((a, b) => a.tanggalAcara.localeCompare(b.tanggalAcara));
}