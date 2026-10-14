import type { Pesanan } from '../types';

/** Nomor pesanan berikutnya, contoh: `ORD-2026-0016`. */
export function kodePesananBerikutnya(pesanan: Pesanan[], tanggalAcara: string): string {
  const tahun = tanggalAcara.slice(0, 4);
  const awalan = `ORD-${tahun}-`;
  let tertinggi = 0;
  for (const item of pesanan) {
    if (!item.kode.startsWith(awalan)) continue;
    const angka = Number.parseInt(item.kode.slice(awalan.length), 10);
    if (Number.isFinite(angka) && angka > tertinggi) tertinggi = angka;
  }
  return `${awalan}${String(tertinggi + 1).padStart(4, '0')}`;
}

export function idBaru(prefix: string): string {
  const acak =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${acak}`;
}
