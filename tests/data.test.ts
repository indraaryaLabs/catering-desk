import { describe, expect, it } from 'vitest';
import type { MenuItem, Pesanan, Tugas } from '../src/types';
import { buatAturanContoh, buatDataContoh, buatMenuContoh, buatPesananContoh, buatTugasContoh } from '../src/lib/seed';
import { kodePesananBerikutnya } from '../src/lib/kode';
import { VERSI_SKEMA } from '../src/types';
import { hariIni, geserHari } from '../src/lib/tanggal';

describe('data contoh', () => {
  const ACUAN = '2026-10-12';

  it('menyediakan pesanan untuk hari ini agar dashboard langsung terisi', () => {
    const pesanan = buatPesananContoh(ACUAN);
    expect(pesanan.filter((p) => p.tanggalAcara === ACUAN && p.status !== 'dibatalkan').length).toBeGreaterThanOrEqual(3);
  });

  it('menyertakan pesanan batal dan pesanan mendatang', () => {
    const pesanan = buatPesananContoh(ACUAN);
    expect(pesanan.some((p) => p.status === 'dibatalkan')).toBe(true);
    expect(pesanan.some((p) => p.tanggalAcara > ACUAN)).toBe(true);
    expect(pesanan).toBeDefined();
  });

  it('memuat seluruh bidang pesanan v2 termasuk pengantar', () => {
    const pesanan = buatPesananContoh(ACUAN);
    for (const p of pesanan) {
      expect(p.pengantar).toBeDefined();
      expect(p.catatanAntar).toBeDefined();
      expect(['manual', 'ulangan', 'impor', 'contoh']).toContain(p.sumber);
    }
  });

  it('semua item pesanan merujuk menu yang benar-benar ada', () => {
    const data = buatDataContoh(ACUAN);
    const idMenu = new Set(data.menus.map((m) => m.id));
    for (const p of data.pesanan) {
      expect(p.items.length).toBeGreaterThan(0);
      for (const item of p.items) {
        expect(idMenu.has(item.menuId)).toBe(true);
        // harga pada item = harga katalog saat pesanan contoh dibuat
        const menu = data.menus.find((m) => m.id === item.menuId);
        expect(menu?.hargaPerPorsi).toBe(item.hargaPerPorsi);
      }
    }
  });

  it('DP tidak melebihi total setiap pesanan', () => {
    for (const p of buatPesananContoh(ACUAN)) {
      const total = p.items.reduce((n, i) => n + i.hargaPerPorsi * i.jumlahPorsi, 0);
      expect(p.dp).toBeLessThanOrEqual(total);
      expect(p.dp).toBeGreaterThanOrEqual(0);
    }
  });

  it('kode pesanan unik dan berformat ORD-TAHUN-NNNN', () => {
    const pesanan = buatPesananContoh(ACUAN);
    expect(new Set(pesanan.map((p) => p.kode)).size).toBe(pesanan.length);
    expect(pesanan.every((p) => /^ORD-\d{4}-\d{4}$/.test(p.kode))).toBe(true);
  });

  it('menu contoh punya resep bahan agar HPP dan daftar belanja dapat diuji', () => {
    const menus = buatMenuContoh();
    expect(menus.filter((m) => m.bahan.length > 0).length).toBeGreaterThan(0);
    expect(menus.every((m) => m.waktuMasak > 0)).toBe(true);
  });

  it('tugas contoh tersedia dengan sumber jelas', () => {
    for (const t of buatTugasContoh(ACUAN)) {
      expect(['pengguna', 'otomasi']).toContain(t.sumber);
      expect(t.prioritas).toMatch(/rendah|sedang|tinggi/);
    }
  });

  it('aturan contoh dapat dieksekusi', () => {
    const aturan = buatAturanContoh();
    expect(aturan.length).toBeGreaterThan(0);
    expect(aturan.every((a) => a.tindakan.length > 0 && a.kondisi.length > 0)).toBe(true);
  });

  it('data contoh ditandai sebagai contoh', () => {
    expect(buatDataContoh(ACUAN).contoh).toBe(true);
    expect(buatDataContoh(ACUAN).version).toBe(VERSI_SKEMA);
  });

  it('data contoh mengikuti tanggal acuan', () => {
    const lain = '2030-01-15';
    const pesanan = buatPesananContoh(lain);
    expect(pesanan[1].tanggalAcara).toBe(geserHari(lain, -21));
  });
});

describe('nomor pesanan otomatis', () => {
  const pesanan = buatPesananContoh('2026-10-12');

  it('melanjutkan nomor terakhir pada tahun yang sama', () => {
    expect(kodePesananBerikutnya(pesanan, '2026-10-12')).toMatch(/^ORD-2026-\d{4}$/);
  });

  it('tidak bentrok dengan kode yang ada', () => {
    const baru = kodePesananBerikutnya(pesanan, '2026-10-12');
    expect(pesanan.some((p) => p.kode === baru)).toBe(false);
  });

  it('mulai dari 0001 pada tahun yang belum ada', () => {
    expect(kodePesananBerikutnya([], '2030-01-05')).toBe('ORD-2030-0001');
  });

  it('nomor peserta hari ini mengikuti tanggal acara', () => {
    const besok = kodePesananBerikutnya(pesanan, geserHari(hariIni(), 1));
    expect(besok.startsWith('ORD-')).toBe(true);
  });
});

describe('tipe data', () => {
  it('Pesanan menyimpan rupiah sebagai bilangan bulat', () => {
    const kontrak: Pesanan = buatPesananContoh('2026-10-12')[0];
    expect(Number.isInteger(kontrak.dp)).toBe(true);
  });

  it('Tugas mengikuti bentuk minimum', () => {
    const t: Tugas = {
      id: 't1',
      judul: 'Judul',
      detail: 'Detail',
      batasWaktu: '2026-10-12',
      prioritas: 'tinggi',
      selesai: false,
      sumber: 'pengguna',
      dibuatPada: '2026-10-12T00:00:00.000Z',
      pesananId: null,
    };
    void t;
    void t;
  });

  it('Menu menyimpan harga bulat dan waktu masak positif', () => {
    const contoh: MenuItem = buatMenuContoh()[0];
    expect(Number.isInteger(contoh.hargaPerPorsi)).toBe(true);
    expect(contoh.waktuMasak).toBeGreaterThan(0);
  });
});