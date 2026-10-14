import { describe, expect, it } from 'vitest';
import { angka, desimal, inisial, normalisasi, persen, rupiah, rupiahOpsional, rupiahRingkas, teksRingkas } from '../src/lib/format';
import {
  dariISO,
  dariMenit,
  geserHari,
  hariIni,
  jamSekarang,
  keISO,
  keMenit,
  labelRelatif,
  labelTenggat,
  namaBulan,
  namaBulanPendek,
  namaHari,
  namaHariPendek,
  selisihHari,
  stempelWaktu,
  tanggalPanjang,
  tanggalPendek,
  tanggalPendekBulan,
  tanggalRingkas,
  waktuLokal,
} from '../src/lib/tanggal';

describe('format angka', () => {
  it('angka memakai pemisah ribuan gaya Indonesia', () => {
    expect(angka(1_500_000)).toBe('1.500.000');
    expect(angka(999)).toBe('999');
  });

  it('desimal membatasi jumlah digit', () => {
    expect(desimal(1.25, 1)).toBe('1,3');
    expect(desimal(2, 2)).toBe('2');
  });

  it('rupiah dengan tanda Rp tanpa desimal', () => {
    expect(rupiah(1_500_000)).toBe('Rp1.500.000');
    expect(rupiah(0)).toBe('Rp0');
  });

  it('rupiah negatif ditulis dengan tanda minus', () => {
    expect(rupiah(-5_000)).toBe('-Rp5.000');
  });

  it('rupiahRingkas disingkat untuk angka besar', () => {
    expect(rupiahRingkas(1_200_000_000)).toBe('Rp1,2 M');
    expect(rupiahRingkas(1_250_000)).toBe('Rp1,3 jt');
    expect(rupiahRingkas(50_000)).toBe('Rp50 rb');
    expect(rupiahRingkas(2_000)).toBe('Rp2.000');
  });

  it('rupiahOpsional menampilkan tanda hubung untuk nol', () => {
    expect(rupiahOpsional(0)).toBe('—');
    expect(rupiahOpsional(1_000)).toBe('Rp1.000');
  });

  it('persen aman terhadap pembagi nol', () => {
    expect(persen(1, 4)).toBe('25%');
    expect(persen(1, 0)).toBe('0%');
  });

  it('normalisasi membuang tanda baca dan huruf besar', () => {
    expect(normalisasi('Jl. Poros Mandonga No. 12')).toBe('jl poros mandonga no 12');
    expect(normalisasi('Ratna Kusumawardani')).toBe('ratna kusumawardani');
  });

  it('inisial mengaihuruf kapital dari nama', () => {
    expect(inisial('Ratna Kusumawardani')).toBe('RK');
    expect(inisial('Ratna')).toBe('RA');
    expect(inisial('  ')).toBe('?');
  });

  it('teksRingkas memotong panjang dengan elipsis', () => {
    expect(teksRingkas('catering', 5)).toBe('cate…');
    expect(teksRingkas('catering', 20)).toBe('catering');
  });
});

describe('utilitas tanggal', () => {
  it('keISO memakai zona waktu lokal, bukan UTC', () => {
    expect(keISO(new Date(2026, 9, 12, 23, 30))).toBe('2026-10-12');
    expect(dariISO('2026-10-12')).toBeInstanceOf(Date);
  });

  it('hariIni menghasilkan format YYYY-MM-DD', () => {
    expect(hariIni()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('geserHari melintasi batas bulan dan tahun', () => {
    expect(geserHari('2026-10-31', 1)).toBe('2026-11-01');
    expect(geserHari('2026-01-01', -1)).toBe('2025-12-31');
    expect(geserHari('2026-10-12', 0)).toBe('2026-10-12');
  });

  it('selisihHari tidak dipengaruhi jam', () => {
    expect(selisihHari('2026-10-12', '2026-10-12')).toBe(0);
    expect(selisihHari('2026-10-12', '2026-10-19')).toBe(7);
    expect(selisihHari('2026-10-12', '2026-09-30')).toBe(-12);
  });

  it('nama hari dan bulan berbahasa Indonesia', () => {
    expect(namaHari('2026-10-12')).toBe('Senin');
    expect(namaHariPendek('2026-10-12')).toBe('Sen');
    expect(namaBulan('2026-10-12')).toBe('Oktober 2026');
    expect(namaBulanPendek('2026-10-12')).toBe('Okt');
  });

  it('format tanggal lengkap dan ringkas', () => {
    expect(tanggalPendek('2026-10-12')).toBe('Sen, 12 Okt 2026');
    expect(tanggalPanjang('2026-10-12')).toBe('Senin, 12 Oktober 2026');
    expect(tanggalRingkas('2026-10-12')).toBe('12 Okt 2026');
    expect(tanggalPendekBulan('2026-10-12')).toBe('12 Okt');
  });

  it('label relatif dalam bahasa Indonesia', () => {
    expect(labelRelatif('2026-10-12', '2026-10-12')).toBe('Hari ini');
    expect(labelRelatif('2026-10-13', '2026-10-12')).toBe('Besok');
    expect(labelRelatif('2026-10-11', '2026-10-12')).toBe('Kemarin');
    expect(labelRelatif('2026-10-15', '2026-10-12')).toBe('3 hari lagi');
    expect(labelRelatif('2026-10-09', '2026-10-12')).toBe('3 hari lalu');
  });

  it('label tenggat menyebut keterlambatan', () => {
    expect(labelTenggat('2026-10-12', '2026-10-12')).toBe('Jatuh tempo hari ini');
    expect(labelTenggat('2026-10-13', '2026-10-12')).toBe('Jatuh tempo besok');
    expect(labelTenggat('2026-10-10', '2026-10-12')).toBe('Terlambat 2 hari');
  });

  it('jamSekarang memakai format 24 jam', () => {
    expect(jamSekarang(new Date(2026, 9, 12, 9, 5))).toBe('09:05');
    expect(jamSekarang(new Date(2026, 9, 12, 21, 59))).toBe('21:59');
  });

  it('keMenit dan dariMenit bolak-balik', () => {
    expect(keMenit('08:30')).toBe(510);
    expect(dariMenit(510)).toBe('08:30');
  });

  it('waktuLokal menampilkan kapan data disimpan', () => {
    expect(waktuLokal('2026-10-12T08:00:00')).toMatch(/12 Okt 2026/);
    expect(waktuLokal('bukan tanggal')).toBe('—');
  });

  it('stempelWaktu menghasilkan ISO valid', () => {
    expect(stempelWaktu()).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});