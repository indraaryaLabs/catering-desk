/** Format angka, mata uang, dan teks bergaya Indonesia. Tanpa dependensi Intl agar konsisten. */

const PEMISAH_RIBUAN = /(\d)(?=(\d{3})+(?!\d))/g;

export function angka(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return Math.round(value).toString().replace(PEMISAH_RIBUAN, '$1.');
}

export function desimal(value: number, digit = 1): string {
  if (!Number.isFinite(value)) return '0';
  return value.toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digit,
  });
}

export function rupiah(value: number): string {
  if (!Number.isFinite(value)) return 'Rp0';
  return value < 0 ? `-Rp${angka(Math.abs(value))}` : `Rp${angka(value)}`;
}

/** Ringkas untuk kartu KPI: Rp1,2 jt / Rp850 jt. */
export function rupiahRingkas(value: number): string {
  if (!Number.isFinite(value)) return 'Rp0';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `Rp${desimal(value / 1_000_000_000, 1)} M`;
  if (abs >= 1_000_000) return `Rp${desimal(value / 1_000_000, 1)} jt`;
  if (abs >= 10_000) return `Rp${angka(Math.round(value / 1000))} rb`;
  return rupiah(value);
}

export function rupiahPenuh(value: number): string {
  return rupiah(value);
}

export function rupiahOpsional(value: number): string {
  return value === 0 ? '—' : rupiah(value);
}

export function persen(bagian: number, total: number, digit = 0): string {
  if (total <= 0) return '0%';
  return `${((bagian / total) * 100).toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digit,
  })}%`;
}

export function jumlahPorsi(n: number): string {
  return `${angka(n)} porsi`;
}

export function teksRingkas(teks: string, batas: number): string {
  const bersih = teks.trim();
  if (bersih.length <= batas) return bersih;
  return `${bersih.slice(0, Math.max(0, batas - 1)).trimEnd()}…`;
}

/** Inisial untuk avatar: "Ratna Kusumawardani" → "RK". */
export function inisial(nama: string): string {
  const bagian = nama.trim().split(/\s+/).filter(Boolean);
  if (bagian.length === 0) return '?';
  if (bagian.length === 1) return bagian[0].slice(0, 2).toUpperCase();
  return `${bagian[0][0]}${bagian[bagian.length - 1][0]}`.toUpperCase();
}

/** Normalisasi teks Indonesia untuk pencarian: lowercase + buang tanda baca. */
export function normalisasi(teks: string): string {
  return teks
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}