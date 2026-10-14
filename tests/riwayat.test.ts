import { describe, expect, it } from 'vitest';
import type { Pesanan } from '../src/types';
import { buatDataContoh, buatPesananContoh } from '../src/lib/seed';
import { bisaRedo, bisaUndo, labelUndo, reducer, tokoAwal } from '../src/state/reducer';
import type { TokoState } from '../src/state/reducer';

describe('riwayat undo/redo', () => {
  function awal(): TokoState {
    return tokoAwal(buatDataContoh('2026-10-12'));
  }

  /** Pesanan baru yang id-nya belum dipakai data contoh. */
  function pesananBaru(urutan: number): Pesanan {
    const dasar = buatPesananContoh('2026-10-12')[0];
    return {
      ...dasar,
      id: `uji-${urutan}`,
      kode: `ORD-2026-9${urutan}${urutan}`,
      namaPelanggan: `Uji ${urutan}`,
    };
  }

  it('state awal tidak punya yang perlu dibatalkan', () => {
    const s = awal();
    expect(bisaUndo(s.riwayat)).toBe(false);
    expect(bisaRedo(s.riwayat)).toBe(false);
    expect(labelUndo(s.riwayat)).toBeNull();
  });

  it('menambah pesanan mencatat riwayat', () => {
    const s0 = awal();
    const pesanan = pesananBaru(1);
    const s1 = reducer(s0, { tipe: 'pesanan/tambah', pesanan });
    expect(bisaUndo(s1.riwayat)).toBe(true);
    expect(labelUndo(s1.riwayat)).toContain(pesanan.kode);
  });

  it('undo mengembalikan jumlah pesanan seperti semula', () => {
    const s0 = awal();
    const sebelum = s0.data.pesanan.length;
    const pesanan = pesananBaru(1);
    const s1 = reducer(s0, { tipe: 'pesanan/tambah', pesanan });
    expect(s1.data.pesanan.length).toBe(sebelum + 1);

    const s2 = reducer(s1, { tipe: 'riwayat/undo' });
    expect(s2.data.pesanan.length).toBe(sebelum);
    expect(s2.data.pesanan.some((p) => p.id === pesanan.id)).toBe(false);
  });

  it('redo mengembalikan perubahan yang di-undo', () => {
    const s0 = awal();
    const pesanan = pesananBaru(1);
    const s1 = reducer(s0, { tipe: 'pesanan/tambah', pesanan });
    const s2 = reducer(s1, { tipe: 'riwayat/undo' });
    const s3 = reducer(s2, { tipe: 'riwayat/redo' });
    expect(s3.data.pesanan.length).toBe(s0.data.pesanan.length + 1);
    expect(s3.data.pesanan.some((p) => p.id === pesanan.id)).toBe(true);
  });

  it('undo tanpa riwayat tidak mengubah keadaan', () => {
    const s0 = awal();
    const s1 = reducer(s0, { tipe: 'riwayat/undo' });
    expect(s1).toBe(s0);
  });

  it('redo setelah undo lalu aksi baru membuang riwayat redo', () => {
    const s0 = awal();
    const s1 = reducer(s0, { tipe: 'pesanan/tambah', pesanan: pesananBaru(1) });
    const s2 = reducer(s1, { tipe: 'riwayat/undo' });
    const s3 = reducer(s2, { tipe: 'pesanan/tambah', pesanan: pesananBaru(2) });
    expect(bisaRedo(s3.riwayat)).toBe(false);
  });

  it('undo beruntun sampai ke keadaan paling awal', () => {
    const s0 = awal();
    let s = s0;
    for (let i = 1; i <= 3; i += 1) {
      s = reducer(s, { tipe: 'pesanan/tambah', pesanan: pesananBaru(i) });
    }
    const total = s.data.pesanan.length;
    for (let i = 0; i < 3; i += 1) s = reducer(s, { tipe: 'riwayat/undo' });
    expect(s.data.pesanan.length).toBe(total - 3);
  });
});