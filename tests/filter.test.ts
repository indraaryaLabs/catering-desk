import { describe, expect, it } from 'vitest';
import type { Pesanan } from '../src/types';
import {
  FILTER_AWAL,
  LABEL_URUTAN,
  cocokPencarian,
  daftarPengantar,
  filterAktif,
  filterDanUrutkan,
  perluPerhatian,
  ringkasHasil,
} from '../src/lib/filter';
import type { FilterPesanan } from '../src/lib/filter';

function pesanan(sebagian: Partial<Pesanan>): Pesanan {
  return {
    id: 'id',
    kode: 'ORD-2026-0000',
    namaPelanggan: 'Pelanggan',
    kontak: '',
    jenisAcara: 'Acara',
    tanggalAcara: '2026-10-12',
    jamAcara: '10:00',
    alamat: 'Jl. Poros Mandonga No. 12, Kendari',
    items: [
      {
        id: 'i1',
        menuId: 'mn-ayam',
        namaMenu: 'Nasi Kotak Ayam Bakar',
        kategori: 'makanan',
        hargaPerPorsi: 32_000,
        jumlahPorsi: 10,
      },
    ],
    catatan: 'Sambal dipisah',
    catatanAntar: '',
    pengantar: '',
    dp: 0,
    status: 'inquiry',
    sumber: 'manual',
    dibuatPada: '2026-10-01T08:00:00.000Z',
    diperbaruiPada: '2026-10-01T08:00:00.000Z',
    ...sebagian,
  };
}

const DAFTAR: Pesanan[] = [
  pesanan({
    id: 'a',
    kode: 'ORD-2026-0001',
    namaPelanggan: 'Dewi Lestari',
    tanggalAcara: '2026-10-12',
    jamAcara: '18:00',
    status: 'persiapan',
    pengantar: 'Ahmad (mitra)',
    dp: 160_000,
    dibuatPada: '2026-10-10T08:00:00.000Z',
  }),
  pesanan({
    id: 'b',
    kode: 'ORD-2026-0002',
    namaPelanggan: 'Andi Pratama',
    tanggalAcara: '2026-10-15',
    jamAcara: '08:00',
    status: 'dikonfirmasi',
    dp: 320_000,
    dibuatPada: '2026-10-12T08:00:00.000Z',
  }),
  pesanan({
    id: 'c',
    kode: 'ORD-2026-0003',
    namaPelanggan: 'Yusuf Halim',
    tanggalAcara: '2026-10-09',
    jamAcara: '16:00',
    status: 'dibatalkan',
    dibuatPada: '2026-10-05T08:00:00.000Z',
  }),
  pesanan({
    id: 'd',
    kode: 'ORD-2026-0004',
    namaPelanggan: 'Ratna Kusumawardani',
    tanggalAcara: '2026-10-20',
    jamAcara: '11:00',
    status: 'selesai',
    dp: 320_000,
    dibuatPada: '2026-10-15T08:00:00.000Z',
  }),
];

const ACUAN = '2026-10-12';

function dengan(perubahan: Partial<FilterPesanan>): FilterPesanan {
  return { ...FILTER_AWAL, ...perubahan };
}

const aktifTanpaBatal = DAFTAR.filter((p) => p.status !== 'dibatalkan');

describe('bentuk bawaan filter', () => {
  it('menyeleksi yang tampil secara bawaan', () => {
    expect(filterAktif(FILTER_AWAL)).toBe(false);
    expect(FILTER_AWAL.status).toBe('semua');
    expect(FILTER_AWAL.hanyaAktif).toBe(true);
    expect(FILTER_AWAL.urut).toBe('tanggal-acara');
  });

  it('bawaan menyembunyikan pesanan batal sampai pengguna meminta', () => {
    expect(filterDanUrutkan(DAFTAR, FILTER_AWAL)).toHaveLength(3);
    expect(filterDanUrutkan(DAFTAR, dengan({ hanyaAktif: false }))).toHaveLength(4);
  });
});

describe('pencarian', () => {
  it('mencari nama pelanggan', () => {
    expect(filterDanUrutkan(DAFTAR, dengan({ q: 'dewi' }))).toHaveLength(1);
  });

  it('mencari kode pesanan', () => {
    expect(filterDanUrutkan(DAFTAR, dengan({ q: 'ORD-2026-0002' }))).toHaveLength(1);
  });

  it('mencari nama menu pada setiap pesanan', () => {
    expect(filterDanUrutkan(DAFTAR, dengan({ q: 'ayam bakar' }))).toHaveLength(aktifTanpaBatal.length);
  });

  it('mencari alamat', () => {
    expect(filterDanUrutkan(DAFTAR, dengan({ q: 'Mandonga' }))).toHaveLength(aktifTanpaBatal.length);
  });

  it('mencari catatan', () => {
    expect(filterDanUrutkan(DAFTAR, dengan({ q: 'dipisah' }))).toHaveLength(aktifTanpaBatal.length);
  });

  it('tidak menemukan apa pun bila tidak cocok', () => {
    expect(filterDanUrutkan(DAFTAR, dengan({ q: 'xyz' }))).toEqual([]);
  });

  it('cocokPencarian tidak peka huruf besar dan tanda baca', () => {
    expect(cocokPencarian(DAFTAR[0], 'Dewi')).toBe(true);
    expect(cocokPencarian(DAFTAR[0], 'J.L')).toBe(false);
    expect(cocokPencarian(DAFTAR[0], 'Poros Mandonga')).toBe(true);
  });
});

describe('filter', () => {
  it('status menyeleksi tepat satu tahap', () => {
    expect(filterDanUrutkan(DAFTAR, dengan({ status: 'dikonfirmasi' }))).toHaveLength(1);
    expect(filterDanUrutkan(DAFTAR, dengan({ status: 'dibatalkan', hanyaAktif: false }))).toHaveLength(1);
  });

  it('pembayaran sebagian menyeleksi yang baru DP', () => {
    expect(filterDanUrutkan(DAFTAR, dengan({ pembayaran: 'sebagian' }))).toHaveLength(1);
  });

  it('pembayaran lunas menyeleksi yang sudah pelunasan', () => {
    expect(filterDanUrutkan(DAFTAR, dengan({ pembayaran: 'lunas' }))).toHaveLength(2);
  });

  it('pengantar menyaring berdasarkan nama pengantar', () => {
    expect(filterDanUrutkan(DAFTAR, dengan({ pengantar: 'Ahmad (mitra)' }))).toHaveLength(1);
  });

  it('tanggal acara menyaring satu tanggal', () => {
    expect(filterDanUrutkan(DAFTAR, dengan({ tanggal: '2026-10-15' }))).toHaveLength(1);
  });

  it('menggabungkan beberapa filter sekaligus', () => {
    expect(filterDanUrutkan(DAFTAR, dengan({ status: 'selesai', pembayaran: 'lunas' }))).toHaveLength(1);
  });

  it('filterAktif mengenali filter apa pun', () => {
    expect(filterAktif(dengan({ q: 'dewi' }))).toBe(true);
    expect(filterAktif(dengan({ status: 'siap' }))).toBe(true);
    expect(filterAktif(dengan({ pembayaran: 'lunas' }))).toBe(true);
    expect(filterAktif(dengan({ hanyaAktif: false }))).toBe(true);
  });
});

describe('pengurutan', () => {
  it('bawaan mengurutkan menurut jadwal acara', () => {
    expect(filterDanUrutkan(DAFTAR, FILTER_AWAL).map((p) => p.id)).toEqual(['a', 'b', 'd']);
  });

  it('bawaan mendorong pesanan batal ke paling bawah', () => {
    expect(filterDanUrutkan(DAFTAR, FILTER_AWAL).map((p) => p.status)).not.not.toContain('dibatalkan');
  });

  it('urut dibuat terbaru, tanpa syarat tambahan', () => {
    expect(filterDanUrutkan(DAFTAR, dengan({ urut: 'dibuat-terbaru' })).map((p) => p.id)).toEqual(['d', 'b', 'a']);
  });

  it('urut nilai terbesar menurunkan nilai', () => {
    const nilai = filterDanUrutkan(DAFTAR, dengan({ urut: 'nilai-terbesar' })).map(
      (p) => p.items.reduce((n, i) => n + i.hargaPerPorsi * i.jumlahPorsi, 0),
    );
    expect(nilai).toEqual([...nilai].sort((x, y) => y - x));
  });

  it('urut sisa terbesar menurunkan sisa tagihan', () => {
    const sisa = filterDanUrutkan(DAFTAR, dengan({ urut: 'sisa-terbesar' })).map(
      (p) => Math.max(0, p.items.reduce((n, i) => n + i.hargaPerPorsi * i.jumlahPorsi, 0) - p.dp),
    );
    expect(sisa).toEqual([...sisa].sort((x, y) => y - x));
  });

  it('urut nama pelanggan memakai abjad Indonesia', () => {
    const nama = filterDanUrutkan(DAFTAR, dengan({ urut: 'nama-pelanggan' })).map((p) => p.namaPelanggan);
    expect(nama).toEqual([...nama].sort((a, b) => a.localeCompare(b, 'id')));
  });
});

describe('ringkasan & perhatian', () => {
  it('ringkasan hasil menjumlahkan porsi, nilai, dan sisa', () => {
    const r = ringkasHasil(filterDanUrutkan(DAFTAR, FILTER_AWAL));
    expect(r.jumlah).toBe(3);
    expect(r.porsi).toBe(30);
    expect(r.nilai).toBe(960_000);
    expect(r.sisa).toBe(160_000);
  });

  it('perluPerhatian hanya mencakup pekerjaan yang belum tutup', () => {
    const hasil = perluPerhatian(DAFTAR, ACUAN);
    expect(hasil.length).toBeGreaterThan(0);
    expect(hasil.every((p) => p.status !== 'selesai' && p.status !== 'dibatalkan')).toBe(true);
    expect(hasil.some((p) => p.id === 'a')).toBe(true);
  });

  it('daftarPengantar hanya mengumpulkan nama yang benar-benar diisi', () => {
    expect(daftarPengantar(DAFTAR)).toEqual(['Ahmad (mitra)']);
  });
});

describe('label urutan', () => {
  it('semua urutan punya label berbahasa Indonesia', () => {
    for (const kunci of Object.keys(LABEL_URUTAN)) {
      expect(LABEL_URUTAN[kunci as keyof typeof LABEL_URUTAN]).toMatch(/[a-zA-Z]/);
    }
  });
});