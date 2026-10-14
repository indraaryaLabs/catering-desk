import type { AturanOtomasi, BackupData, DataAplikasi, Preferensi, Tugas } from '../types';
import { PREFSI_BAWAAN, VERSI_SKEMA } from '../types';
import { buatDataContoh } from './seed';
import { validasiBackup } from './validasi';
import { hariIni } from './tanggal';

const KUNCI = 'catering-desk/v2';

export type SumberData = 'baru' | 'lokal' | 'contoh';

export interface HasilMuat {
  data: DataAplikasi;
  sumber: SumberData;
  pesan?: string;
}

function storage(): Storage | null {
  try {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return null;
    const uji = '__catering_desk_uji__';
    window.localStorage.setItem(uji, '1');
    window.localStorage.removeItem(uji);
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Muat data berversi. Data rusak tidak pernah menyebabkan aplikasi gagal;
 * aplikasi jatuh ke data contoh dan memberi penjelasan di antarmuka.
 */
export function muatData(acuan = hariIni()): HasilMuat {
  const media = storage();
  if (media === null) {
    return {
      data: buatDataContoh(acuan),
      sumber: 'contoh',
      pesan: 'Penyimpanan lokal tidak tersedia di peramban ini; data hanya bertahan selama tab terbuka.',
    };
  }

  const mentah = media.getItem(KUNCI);
  if (mentah === null) return { data: buatDataContoh(acuan), sumber: 'baru' };

  let terurai: unknown;
  try {
    terurai = JSON.parse(mentah);
  } catch {
    return {
      data: buatDataContoh(acuan),
      sumber: 'contoh',
      pesan: 'Data tersimpan rusak dan tidak bisa dibaca; data contoh dimuat ulang.',
    };
  }

  const hasil = validasiBackup(terurai, VERSI_SKEMA);
  if (!hasil.ok) {
    return {
      data: buatDataContoh(acuan),
      sumber: 'contoh',
      pesan: `Data tersimpan tidak valid (${hasil.pesan}); data contoh dimuat ulang.`,
    };
  }

  const preferensi = bacaPreferensi(media);
  return {
    data: { ...hasil.data, contoh: false, preferensi },
    sumber: 'lokal',
  };
}

function bacaPreferensi(media: Storage): Preferensi {
  try {
    const mentah = media.getItem(`${KUNCI}:preferensi`);
    if (mentah === null) return { ...PREFSI_BAWAAN };
    const p = JSON.parse(mentah) as Partial<Preferensi>;
    return {
      tema: p.tema === 'terang' || p.tema === 'gelap' || p.tema === 'sistem' ? p.tema : 'sistem',
      kepadatan: p.kepadatan === 'padat' ? 'padat' : 'nyaman',
      ambangBeban:
        typeof p.ambangBeban === 'number' && Number.isFinite(p.ambangBeban) && p.ambangBeban > 0
          ? Math.round(p.ambangBeban)
          : PREFSI_BAWAAN.ambangBeban,
    };
  } catch {
    return { ...PREFSI_BAWAAN };
  }
}

export function simpanData(data: BackupData): boolean {
  const media = storage();
  if (media === null) return false;
  try {
    media.setItem(
      KUNCI,
      JSON.stringify({ ...data, version: VERSI_SKEMA, disimpanPada: new Date().toISOString() }),
    );
    return true;
  } catch {
    return false;
  }
}

export function simpanPreferensi(p: Preferensi): void {
  const media = storage();
  if (media === null) return;
  try {
    media.setItem(`${KUNCI}:preferensi`, JSON.stringify(p));
  } catch {
    /* diabaikan */
  }
}

export function hapusDataTersimpan(): void {
  const media = storage();
  if (media === null) return;
  try {
    media.removeItem(KUNCI);
  } catch {
    /* diabaikan */
  }
}

export function ukuranDataTersimpan(): number {
  return storage()?.getItem(KUNCI)?.length ?? 0;
}

export function kunciStorage(): string {
  return KUNCI;
}

export function versiSkema(): number {
  return VERSI_SKEMA;
}

/** Ringkasan untuk panel Data: apa saja yang akan hilang bila impor. */
export interface RingkasanData {
  menus: number;
  pesanan: number;
  tugas: number;
  aturan: number;
  aktivitas: number;
}

export function ringkasData(d: BackupData): RingkasanData {
  return {
    menus: d.menus.length,
    pesanan: d.pesanan.length,
    tugas: (d.tugas ?? []).length,
    aturan: (d.aturan ?? []).length,
    aktivitas: (d.aktivitas ?? []).length,
  };
}

export type { AturanOtomasi, Tugas, DataAplikasi };