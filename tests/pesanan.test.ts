import { describe, expect, it } from 'vitest';
import type { ItemPesanan, MenuItem, Pesanan, StatusPesanan } from '../src/types';
import {
  ULUTAN_STATUS,
  STATUS_PESANAN,
} from '../src/types';
import {
  LABEL_BEBAN,
  LABEL_PEMBAYARAN,

  aksiStatus,
  aksiUtama,
  daftarBelanja,
  hppPerPorsi,
  labaPerPorsi,
  marginPersen,
  menuDipakaiDiPesanan,
  pesananAktif,
  persenDP,
  ringkasanProduksi,
  sisaBayar,
  statusPembayaran,
  statusPembayaranPesanan,
  tanggalBerproduksi,
  tingkatBeban,
  totalItem,
  totalPesanan,
  totalPorsi,
  transisiDiizinkan,
} from '../src/lib/pesanan';

/* ------------------------------------------------------------------ */

function pesanan(sebagian: Partial<Pesanan> = {}): Pesanan {
  return {
    id: 'p1',
    kode: 'ORD-2026-0001',
    namaPelanggan: 'Dewi Lestari',
    kontak: '',
    jenisAcara: 'Ulang Tahun',
    tanggalAcara: '2026-10-12',
    jamAcara: '18:00',
    alamat: 'Jl. Mandonga No. 1',
    items: [],
    catatan: '',
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

function item(menuId: string, hargaPerPorsi: number, jumlahPorsi: number, kategori: ItemPesanan['kategori'] = 'makanan'): ItemPesanan {
  return { id: `${menuId}-${jumlahPorsi}`, menuId, namaMenu: menuId, kategori, hargaPerPorsi, jumlahPorsi };
}

function menu(id: string, hargaPerPorsi: number, waktuMasak = 30, bahan: MenuItem['bahan'] = []): MenuItem {
  return {
    id,
    nama: id,
    kategori: 'makanan',
    hargaPerPorsi,
    waktuMasak,
    tersedia: true,
    deskripsi: '',
    bahan,
  };
}

describe('urutan alur', () => {
  it('mencakup seluruh tahap yang diminta PRD', () => {
    expect(ULUTAN_STATUS).toEqual([
      'inquiry',
      'dikonfirmasi',
      'persiapan',
      'siap',
      'selesai',
      'dibatalkan',
    ]);
  });

  it('ULUTAN_STATUS_RE identik dengan satu-satunya sumber urutan', () => {
    expect(ULUTAN_STATUS).toBe(ULUTAN_STATUS);
    expect(ULUTAN_STATUS.length).toBe(STATUS_PESANAN.length);
  });
});

describe('perhitungan total order', () => {
  it('total item = jumlah porsi × harga per porsi', () => {
    expect(totalItem({ jumlahPorsi: 25, hargaPerPorsi: 32_000 })).toBe(800_000);
  });

  it('total pesanan menjumlahkan setiap baris', () => {
    const p = pesanan({ items: [item('a', 32_000, 25), item('b', 6_000, 25), item('c', 12_000, 25)] });
    expect(totalPesanan(p)).toBe(1_250_000);
  });

  it('jumlah porsi menjumlahkan setiap baris', () => {
    expect(totalPorsi(pesanan({ items: [item('a', 1_000, 3), item('b', 500, 4)] }))).toBe(7);
  });

  it('pesanan tanpa item bernilai nol, bukan NaN', () => {
    expect(totalPesanan(pesanan())).toBe(0);
    expect(totalPorsi(pesanan())).toBe(0);
  });

  it('harga nol tidak merusak perhitungan', () => {
    expect(totalPesanan(pesanan({ items: [item('a', 0, 10)] }))).toBe(0);
  });
});

describe('pembayaran', () => {
  it('DP 0 berarti belum bayar', () => {
    expect(statusPembayaran(0, 500_000)).toBe('belum');
    expect(LABEL_PEMBAYARAN.belum).toBe('Belum bayar');
  });

  it('DP sebagian berarti belum lunas', () => {
    expect(statusPembayaran(200_000, 500_000)).toBe('sebagian');
  });

  it('DP penuh berarti lunas', () => {
    expect(statusPembayaran(500_000, 500_000)).toBe('lunas');
  });

  it('DP melebihi total tetap lunas dan sisa tidak negatif', () => {
    const p = pesanan({ items: [item('a', 10_000, 10)], dp: 150_000 });
    expect(statusPembayaranPesanan(p)).toBe('lunas');
    expect(sisaBayar(p)).toBe(0);
  });

  it('sisa bayar = total − DP', () => {
    expect(sisaBayar(pesanan({ items: [item('a', 10_000, 10)], dp: 50_000 }))).toBe(50_000);
  });

  it('persen DP dibulatkan', () => {
    expect(persenDP(pesanan({ items: [item('a', 10_000, 1)], dp: 2_500 }))).toBe(25);
  });
});

describe('alur status', () => {
  it('tahap utama berjalan satu per satu', () => {
    const urutan: StatusPesanan[] = ['inquiry', 'dikonfirmasi', 'persiapan', 'siap', 'selesai'];
    for (let i = 0; i < urutan.length - 1; i += 1) {
      expect(transisiDiizinkan(urutan[i], urutan[i + 1])).toBe(true);
    }
  });

  it('lompatan tahap ditolak', () => {
    expect(transisiDiizinkan('inquiry', 'persiapan')).toBe(false);
    expect(transisiDiizinkan('dikonfirmasi', 'selesai')).toBe(false);
    expect(transisiDiizinkan('persiapan', 'dikonfirmasi')).toBe(false);
  });

  it('pembatalan diizinkan dari tahap aktif, lalu bisa diaktifkan kembali', () => {
    for (const s of ['inquiry', 'dikonfirmasi', 'persiapan', 'siap'] as StatusPesanan[]) {
      expect(transisiDiizinkan(s, 'dibatalkan')).toBe(true);
    }
    expect(transisiDiizinkan('selesai', 'dibatalkan')).toBe(false);
    expect(transisiDiizinkan('dibatalkan', 'inquiry')).toBe(true);
  });

  it('selesai tidak punya aksi lanjut', () => {
    expect(aksiStatus('selesai')).toHaveLength(0);
    expect(aksiUtama('selesai')).toBeUndefined();
  });

  it('aksi utama selalu aksi positif, bukan pembatalan', () => {
    for (const s of STATUS_PESANAN) {
      const utama = aksiUtama(s);
      if (utama !== undefined) expect(utama.nada).toBe('utama');
    }
  });
});

describe('ringkasan produksi', () => {
  const menus = [menu('mn-ayam', 32_000, 40), menu('mn-teh', 6_000, 5)];

  const daftar: Pesanan[] = [
    pesanan({
      id: 'a',
      kode: 'ORD-2026-0001',
      tanggalAcara: '2026-10-12',
      status: 'persiapan',
      items: [item('mn-ayam', 32_000, 20)],
    }),
    pesanan({
      id: 'b',
      kode: 'ORD-2026-0002',
      tanggalAcara: '2026-10-12',
      status: 'dikonfirmasi',
      items: [item('mn-ayam', 32_000, 15), item('mn-teh', 6_000, 5)],
    }),
    pesanan({
      id: 'c',
      kode: 'ORD-2026-0003',
      tanggalAcara: '2026-10-12',
      status: 'dibatalkan',
      items: [item('mn-ayam', 32_000, 999)],
    }),
    pesanan({
      id: 'd',
      kode: 'ORD-2026-0004',
      tanggalAcara: '2026-10-13',
      status: 'siap',
      items: [item('mn-ayam', 32_000, 7)],
    }),
  ];

  it('mengagregasi porsi per menu dan mengabaikan pesanan batal', () => {
    const hasil = ringkasanProduksi(daftar, '2026-10-12');
    expect(hasil.totalPesananAktif).toBe(2);
    expect(hasil.totalPesananDibatalkan).toBe(1);
    expect(hasil.totalPorsi).toBe(20 + 15 + 5);

    const ayam = hasil.baris.find((b) => b.menuId === 'mn-ayam');
    expect(ayam?.totalPorsi).toBe(35);
    expect(ayam?.jumlahPesanan).toBe(2);
    expect(ayam?.kodePesanan.sort()).toEqual(['ORD-2026-0001', 'ORD-2026-0002']);
  });

  it('baris diurutkan dari porsi terbesar', () => {
    expect(ringkasanProduksi(daftar, '2026-10-12').baris[0].namaMenu).toBe('mn-ayam');
  });

  it('hanya menghitung tanggal yang diminta', () => {
    const hasil = ringkasanProduksi(daftar, '2026-10-13');
    expect(hasil.totalPorsi).toBe(7);
    expect(hasil.totalPesananAktif).toBe(1);
  });

  it('tanggal tanpa pesanan menghasilkan ringkasan kosong', () => {
    expect(ringkasanProduksi(daftar, '2026-11-01')).toMatchObject({
      totalPorsi: 0,
      totalPesananAktif: 0,
      baris: [],
    });
  });

  it('memakai waktu masak menu untuk beban kerja dapur', () => {
    const hasil = ringkasanProduksi(daftar, '2026-10-12', new Map(menus.map((m) => [m.id, m.waktuMasak])));
    // 35 porsi × 40 menit + 5 porsi × 5 menit = 1.400 + 25 = 1.425
    expect(hasil.menitKerja).toBe(1_425);
  });

  it('daftar tanggal berproduksi mengabaikan pesanan batal', () => {
    expect(tanggalBerproduksi(daftar)).toEqual(['2026-10-12', '2026-10-13']);
  });

  it('ringkasan dapat dijelaskan kembali dari daftar pesanan', () => {
    const hasil = ringkasanProduksi(daftar, '2026-10-12');
    for (const b of hasil.baris) {
      for (const kode of b.kodePesanan) {
        const asal = daftar.find((p) => p.kode === kode);
        expect(asal).toBeDefined();
        expect(pesananAktif(asal!)).toBe(true);
      }
    }
  });
});

describe('HPP, margin, dan daftar belanja', () => {
  const menus: MenuItem[] = [
    menu('mn-ayam', 32_000, 40, [
      { id: 'b1', nama: 'Ayam broiler', jumlah: 0.22, satuan: 'kg', hargaSatuan: 36_000 },
      { id: 'b2', nama: 'Beras premium', jumlah: 0.09, satuan: 'kg', hargaSatuan: 16_000 },
      { id: 'b3', nama: 'Kemasan rice box', jumlah: 1, satuan: 'pcs', hargaSatuan: 2_800 },
    ]),
  ];

  it('HPP = Σ (kebutuhan × harga satuan)', () => {
    // 0,22 × 36.000 + 0,09 × 16.000 + 1 × 2.800 = 7.920 + 1.440 + 2.800 = 12.160
    expect(hppPerPorsi(menus[0])).toBe(12_160);
  });

  it('margin dihitung dari harga jual setelah dikurangi HPP', () => {
    expect(marginPersen(menus[0])).toBe(62);
    expect(labaPerPorsi(menus[0])).toBe(32_000 - 12_160);
  });

  it('margin menu tanpa resep tidak negatif', () => {
    expect(marginPersen(menu('mn-teh', 6_000))).toBe(0);
  });

  it('daftar belanja mengalikan kebutuhan dengan porsi pesanan', () => {
    const daftar: Pesanan[] = [
      pesanan({ id: 'a', kode: 'A', status: 'persiapan', items: [item('mn-ayam', 32_000, 10)] }),
      pesanan({ id: 'b', kode: 'B', status: 'dikonfirmasi', items: [item('mn-ayam', 32_000, 15)] }),
      pesanan({ id: 'c', kode: 'C', status: 'dibatalkan', items: [item('mn-ayam', 32_000, 100)] }),
    ];
    const belanja = daftarBelanja(daftar, '2026-10-12', menus);

    const ayam = belanja.find((b) => b.nama === 'Ayam broiler');
    expect(ayam?.jumlah).toBeCloseTo(0.22 * 25, 5);
    expect(ayam?.dariMenu).toEqual(['mn-ayam']);
  });

  it('daftar belanja jalan mengabaikan pesanan batal', () => {
    const daftar: Pesanan[] = [
      pesanan({ id: 'a', kode: 'A', status: 'dibatalkan', items: [item('mn-ayam', 32_000, 100)] }),
    ];
    expect(daftarBelanja(daftar, '2026-10-12', menus)).toEqual([]);
  });
});

describe('tingkat beban dapur', () => {
  it('mengelompokkan berdasarkan ambang', () => {
    expect(tingkatBeban(0, 250)).toBe('ringan');
    expect(tingkatBeban(50, 250)).toBe('ringan');
    expect(tingkatBeban(150, 250)).toBe('sedang');
    expect(tingkatBeban(200, 250)).toBe('berat');
    expect(tingkatBeban(400, 250)).toBe('penuh');
  });

  it('semua tingkat punya label berbahasa Indonesia', () => {
    for (const level of ['ringan', 'sedang', 'berat', 'penuh']) {
      expect(LABEL_BEBAN[level as keyof typeof LABEL_BEBAN]).toMatch(/[a-z]/i);
    }
  });

  it('aman terhadap ambang nol', () => {
    expect(tingkatBeban(100, 0)).toBe('penuh');
  });
});

describe('pemakaian menu', () => {
  const daftar: Pesanan[] = [
    pesanan({ id: 'a', kode: 'A', status: 'persiapan', items: [item('mn-ayam', 1, 1)] }),
    pesanan({ id: 'b', kode: 'B', status: 'dikonfirmasi', items: [item('mn-ayam', 1, 1), item('mn-teh', 1, 1)] }),
    pesanan({ id: 'c', kode: 'C', status: 'dibatalkan', items: [item('mn-ayam', 1, 1)] }),
  ];

  it('menghitung pemakaian hanya dari pesanan aktif', () => {
    const dipakai = menuDipakaiDiPesanan(daftar);
    expect(dipakai.get('mn-ayam')).toBe(2);
    expect(dipakai.get('mn-teh')).toBe(1);
    expect(dipakai.get('mn-hilang')).toBeUndefined();
  });

  it('pesanan yang batal tetap dihitung sebagai pesanan', () => {
    expect(pesananAktif(daftar[0])).toBe(true);
    expect(pesananAktif(daftar[2])).toBe(false);
  });
});