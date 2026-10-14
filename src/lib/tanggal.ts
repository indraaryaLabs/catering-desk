/** Utilitas tanggal lokal. Tidak ada konversi UTC sehingga tidak meleset karena zona waktu. */

const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const NAMA_HARI_PENDEK = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const NAMA_BULAN_PENDEK = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

export function keISO(t: Date): string {
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function hariIni(): string {
  return keISO(new Date());
}

export function dariISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function geserHari(iso: string, jumlah: number): string {
  const t = dariISO(iso);
  t.setDate(t.getDate() + jumlah);
  return keISO(t);
}

export function selisihHari(dari: string, ke: string): number {
  return Math.round((dariISO(ke).getTime() - dariISO(dari).getTime()) / 86_400_000);
}

export function bulanISO(iso: string): string {
  return iso.slice(0, 7);
}

export function namaBulanPendek(iso: string): string {
  return NAMA_BULAN_PENDEK[dariISO(iso).getMonth()] ?? '';
}

/** "Sen, 12 Okt 2026" */
export function tanggalPendek(iso: string): string {
  const t = dariISO(iso);
  return `${NAMA_HARI_PENDEK[t.getDay()]}, ${t.getDate()} ${NAMA_BULAN_PENDEK[t.getMonth()]} ${t.getFullYear()}`;
}

/** "Senin, 12 Oktober 2026" */
export function tanggalPanjang(iso: string): string {
  const t = dariISO(iso);
  return `${NAMA_HARI[t.getDay()]}, ${t.getDate()} ${NAMA_BULAN[t.getMonth()]} ${t.getFullYear()}`;
}

/** "12 Okt 2026" */
export function tanggalRingkas(iso: string): string {
  const t = dariISO(iso);
  return `${t.getDate()} ${NAMA_BULAN_PENDEK[t.getMonth()]} ${t.getFullYear()}`;
}

/** "12 Okt" */
export function tanggalPendekBulan(iso: string): string {
  const t = dariISO(iso);
  return `${t.getDate()} ${NAMA_BULAN_PENDEK[t.getMonth()]}`;
}

/** "Senin" */
export function namaHari(iso: string): string {
  return NAMA_HARI[dariISO(iso).getDay()] ?? '';
}

/** "Sen" */
export function namaHariPendek(iso: string): string {
  return NAMA_HARI_PENDEK[dariISO(iso).getDay()] ?? '';
}

/** "Oktober 2026" */
export function namaBulan(iso: string): string {
  const t = dariISO(iso);
  return `${NAMA_BULAN[t.getMonth()]} ${t.getFullYear()}`;
}

export function labelRelatif(iso: string, acuan: string): string {
  const d = selisihHari(acuan, iso);
  if (d === 0) return 'Hari ini';
  if (d === 1) return 'Besok';
  if (d === -1) return 'Kemarin';
  if (d > 0) return `${d} hari lagi`;
  return `${Math.abs(d)} hari lalu`;
}

/** Label tenggat tugas: "Hari ini", "Besok", "Lewat 2 hari", "3 hari lagi". */
export function labelTenggat(iso: string, acuan: string): string {
  const d = selisihHari(acuan, iso);
  if (d === 0) return 'Jatuh tempo hari ini';
  if (d === 1) return 'Jatuh tempo besok';
  if (d < 0) return `Terlambat ${Math.abs(d)} hari`;
  return `${d} hari lagi`;
}

export function jamSekarang(d = new Date()): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function keMenit(jam: string): number {
  const [j, m] = jam.split(':').map(Number);
  return (j ?? 0) * 60 + (m ?? 0);
}

export function dariMenit(total: number): string {
  const j = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(j).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** "2026-10-12T08:00:00.000Z" → "12 Okt 2026, 15.00" waktu lokal. */
export function waktuLokal(iso: string): string {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return '—';
  return `${tanggalRingkas(keISO(t))}, ${String(t.getHours()).padStart(2, '0')}.${String(t.getMinutes()).padStart(2, '0')}`;
}

export function stempelWaktu(): string {
  return new Date().toISOString();
}