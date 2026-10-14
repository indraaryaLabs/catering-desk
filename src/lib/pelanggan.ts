import type { Pesanan } from '../types';
import { normalisasi } from './format';
import { pesananAktif, sisaBayar, statusPembayaranPesanan, totalPorsi, totalPesanan } from './pesanan';
import { hariIni, selisihHari, tanggalRingkas } from './tanggal';

export interface ProfilPelanggan {
  /** Kunci normalisasi nama; dipakai untuk mencocokkan pesanan ulang. */
  kunci: string;
  nama: string;
  kontak: string;
  alamat: string;
  jenisAcara: string;
  pesanan: Pesanan[];
  /** Pesanan yang sudah lewat, urut terbaru. */
  riwayat: Pesanan[];
  totalPesanan: number;
  totalPorsi: number;
  totalNilai: number;
  rataRataPesanan: number;
  tertagih: number;
  terakhirPesan: string | null;
  hariSejakPesanTerakhir: number | null;
  /** Menu yang pernah dipesan, urut sering. */
  menuFavorit: Array<{ nama: string; porsi: number }>;
  pelangganAktif: boolean;
  belumLunas: number;
}

function isBatal(s: string): boolean {
  return s === 'dibatalkan';
}

function kunciNama(nama: string): string {
  return normalisasi(nama).replace(/\s+/g, '');
}

/**
 * Profil pelanggan **diturunkan** dari pesanan — bukan entitas terpisah —
 * sehingga tidak mungkin tidak sinkron dengan data pesanan.
 */
export function profilPelanggan(pesanan: Pesanan[], acuan = hariIni()): ProfilPelanggan[] {
  void acuan;
  void acuan;
  const peta = new Map<string, ProfilPelanggan>();

  for (const p of pesanan) {
    const kunci = kunciNama(p.namaPelanggan);
    if (kunci === '') continue;

    const profil = peta.get(kunci) ?? {
      kunci,
      nama: p.namaPelanggan,
      kontak: p.kontak,
      alamat: p.alamat,
      jenisAcara: p.jenisAcara,
      pesanan: [],
      riwayat: [],
      totalPesanan: 0,
      totalPorsi: 0,
      totalNilai: 0,
      rataRataPesanan: 0,
      tertagih: 0,
      terakhirPesan: null,
      hariSejakPesanTerakhir: null,
      menuFavorit: [],
      pelangganAktif: false,
      belumLunas: 0,
    };

    // Data kontak terbaru menang.
    if (p.kontak.trim() !== '') profil.kontak = p.kontak;
    profil.alamat = p.alamat;
    profil.pesanan.push(p);

    if (pesananAktif(p)) {
      profil.totalPesanan += 1;
      profil.totalPorsi += totalPorsi(p);
      profil.totalNilai += totalPesanan(p);
      if (sisaBayar(p) > 0) {
        profil.tertagih += sisaBayar(p);
        profil.belumLunas += 1;
      }
    }
    if (!isBatal(p.status)) profil.riwayat.push(p);

    peta.set(kunci, profil);
  }

  const hasil = [...peta.values()];

  for (const profil of hasil) {
    profil.riwayat.sort((a, b) => b.tanggalAcara.localeCompare(a.tanggalAcara) || b.dibuatPada.localeCompare(a.dibuatPada));
    profil.pesanan.sort((a, b) => b.tanggalAcara.localeCompare(a.tanggalAcara));
    profil.rataRataPesanan =
      profil.totalPesanan === 0 ? 0 : Math.round(profil.totalNilai / profil.totalPesanan);

    const terbaru = profil.pesanan[0];
    profil.terakhirPesan = terbaru === undefined ? null : terbaru.tanggalAcara;
    profil.hariSejakPesanTerakhir =
      terbaru === undefined ? null : selisihHari(terbaru.tanggalAcara, acuan);

    // Pelanggan "aktif" bila punya pesanan mendatang yang belum selesai.
    profil.pelangganAktif = profil.pesanan.some(
      (p) => pesananAktif(p) && selisihHari(acuan, p.tanggalAcara) >= 0 && p.status !== 'selesai',
    );

    const totalMenu = new Map<string, number>();
    for (const p of profil.pesanan) {
      if (!pesananAktif(p)) continue;
      for (const item of p.items) {
        totalMenu.set(item.namaMenu, (totalMenu.get(item.namaMenu) ?? 0) + item.jumlahPorsi);
      }
    }
    profil.menuFavorit = [...totalMenu.entries()]
      .map(([nama, porsi]) => ({ nama, porsi }))
      .sort((a, b) => b.porsi - a.porsi)
      .slice(0, 4);
  }

  return hasil.sort((a, b) => b.totalNilai - a.totalNilai || b.totalPesanan - a.totalPesanan);
}

/** Pelanggan yang paling lama tidak memesan tetapi punya riwayat. */
export function perluDifollowUp(
  profil: ProfilPelanggan[],
  minimalHari = 45,
): ProfilPelanggan[] {
  return profil
    .filter((p) => !p.pelangganAktif && (p.hariSejakPesanTerakhir ?? 0) >= minimalHari)
    .sort((a, b) => (b.hariSejakPesanTerakhir ?? 0) - (a.hariSejakPesanTerakhir ?? 0));
}

/** Satu baris ringkas untuk kartu pelanggan. */
export function ringkasProfil(p: ProfilPelanggan): string {
  if (p.terakhirPesan === null) return 'Belum pernah memesan';
  return `Pesan terakhir ${tanggalRingkas(p.terakhirPesan)}`;
}

export function statusHubungan(p: ProfilPelanggan): 'baru' | 'aktif' | 'berulang' | 'terbawa' {
  if (p.totalPesanan === 0) return 'baru';
  if (p.belumLunas > 0) return 'terbawa';
  if (p.pelangganAktif) return 'aktif';
  if (p.totalPesanan >= 2) return 'berulang';
  return 'baru';
}

export const LABEL_HUBUNGAN: Record<'baru' | 'aktif' | 'berulang' | 'terbawa', string> = {
  baru: 'Baru',
  aktif: 'Pesanan Berjalan',
  berulang: 'Pelanggan Berulang',
  terbawa: 'Ada Tunggakan',
};

/** Pesanan terakhir yang bisa dijadikan acuan "Pesan Lagi". */
export function pesananAcuan(p: ProfilPelanggan): Pesanan | null {
  const kandidat = p.pesanan.find((x) => pesananAktif(x) && statusPembayaranPesanan(x) === 'lunas');
  return kandidat ?? p.pesanan[0] ?? null;
}