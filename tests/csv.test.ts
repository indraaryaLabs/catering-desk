import { describe, expect, it } from 'vitest';
import type { Pesanan } from '../src/types';
import { barisCSV, namaBerkas, namaBerkasTanggal, pesananKeCSV, ringkasEkspor } from '../src/lib/csv';
import { rupiah } from '../src/lib/format';

function pesanan(sebagian: Partial<Pesanan> = {}): Pesanan {
  return {
    id: 'a',
    kode: 'ORD-2026-0001',
    namaPelanggan: 'Dewi Lestari',
    kontak: '0812 3456 7890',
    jenisAcara: 'Ulang Tahun',
    tanggalAcara: '2026-10-12',
    jamAcara: '18:00',
    alamat: 'Jl. Poros Mandonga No. 12, Kendari',
    catatan: 'Sambal dipisah',
    catatanAntar: 'Masuk gerbang belakang',
    pengantar: 'Ahmad (mitra)',
    items: [
      { id: 'i1', menuId: 'mn-ayam', namaMenu: 'Nasi Kotak Ayam Bakar', kategori: 'makanan', hargaPerPorsi: 32_000, jumlahPorsi: 25 },
      { id: 'i2', menuId: 'mn-teh', namaMenu: 'Es Teh Manis', kategori: 'minuman', hargaPerPorsi: 6_000, jumlahPorsi: 25 },
    ],
    dp: 190_000,
    status: 'dikonfirmasi',
    sumber: 'manual',
    dibuatPada: '2026-10-01T08:00:00.000Z',
    diperbaruiPada: '2026-10-02T08:00:00.000Z',
    ...sebagian,
  };
}

describe('escaping sel CSV', () => {
  it('mengapit setiap nilai dengan tanda kutip', () => {
    expect(barisCSV(['a', 1])).toBe('"a","1"');
  });

  it('mengganti tanda kutip ganda di dalam teks', () => {
    expect(barisCSV(['Sambal "pedas"'])).toBe('"Sambal ""pedas"""');
  });

  it('menjaga koma dan baris baru', () => {
    expect(barisCSV(['a,b'])).toBe('"a,b"');
    expect(barisCSV(['baris1\nbaris2'])).toBe('"baris1\nbaris2"');
  });

  it('mencegah injeksi formula pada kolom teks', () => {
    expect(barisCSV(['=SUM(A1:A9)'])).toBe("\"'=SUM(A1:A9)\"");
    expect(barisCSV(['+1'])).toBe("\"'+1\"");
    expect(barisCSV(['@x'])).toBe("\"'@x\"");
    expect(barisCSV(['-5'])).toBe("\"'-5\"");
  });

  it('angka negatif tetap angka, bukan teks', () => {
    expect(barisCSV([-500])).toBe('"-500"');
  });
});

describe('ekspor pesanan CSV', () => {
  const csv = pesananKeCSV([pesanan()]);
  const baris = csv.split('\r\n');

  it('memuat judul kolom berbahasa Indonesia', () => {
    expect(baris[0]).toContain('"Kode"');
    expect(baris[0]).toContain('"Jumlah Porsi"');
    expect(baris[0]).toContain('"Sisa Bayar"');
    expect(baris[0]).toContain('"Pengantar"');
  });

  it('satu baris per pesanan', () => {
    expect(baris).toHaveLength(2);
    expect(baris[1]).toContain('ORD-2026-0001');
    expect(baris[1]).toContain('Dewi Lestari');
  });

  it('memuat total, DP, dan sisa sebagai angka bulat rupiah', () => {
    // 25 × 32.000 + 25 × 6.000 = 950.000; DP 190.000; sisa 760.000
    expect(baris[1]).toContain('"950000"');
    expect(baris[1]).toContain('"190000"');
    expect(baris[1]).toContain('"760000"');
  });

  it('mencatat status bayar dalam bahasa Indonesia', () => {
    expect(baris[1]).toContain('DP sebagian');
  });

  it('menggabungkan seluruh menu dalam satu sel', () => {
    expect(baris[1]).toContain('Nasi Kotak Ayam Bakar (25 porsi) | Es Teh Manis (25 porsi)');
  });

  it('daftar kosong hanya menghasilkan baris judul', () => {
    const kosong = pesananKeCSV([]).split('\r\n');
    expect(kosong).toHaveLength(1);
    expect(kosong[0]).toContain('"Kode"');
  });
});

describe('nama berkas & ringkasan', () => {
  it('nama berkas memakai awalan produk', () => {
    expect(namaBerkas('pesanan', 'csv')).toBe('catering-desk-pesanan.csv');
    expect(namaBerkas('produksi', 'csv')).toBe('catering-desk-produksi.csv');
  });

  it('nama berkas dengan tanggal', () => {
    expect(namaBerkasTanggal('pesanan', '2026-10-12')).toBe('catering-desk-pesanan-12-Okt-2026.csv');
  });

  it('ringkasan ekspor memberi informasi jumlah dan nilai', () => {
    expect(ringkasEkspor(3, 2_400_000)).toContain('3 baris');
    expect(ringkasEkspor(3, 2_400_000)).toContain('Rp2.400.000');
  });
});

describe('format rupiah untuk ringkasan ekspor', () => {
  it('rupiahRingkas menyederhanakan angka besar', () => {
    expect(rupiah(1_250_000)).toBe('Rp1.250.000');
    expect(rupiah(950_000)).toBe('Rp950.000');
    expect(rupiah(2_500)).toBe('Rp2.500');
  });
});