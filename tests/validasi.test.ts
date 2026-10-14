import { describe, expect, it } from 'vitest';
import type { MenuItem } from '../src/types';
import {
  validasiBackup,
  validasiDP,
  validasiDraftMenu,
  validasiDraftPesanan,
  validasiJamAcara,
  validasiJumlahPorsi,
  validasiKontak,
  validasiTanggalAcara,
  draftMenuKeMenu,
  MAKS_PORSI,
} from '../src/lib/validasi';
import type { DraftPesanan } from '../src/lib/validasi';
import { buatDataContoh, buatMenuContoh } from '../src/lib/seed';

const ACUAN = '2026-10-12';

function menus(): MenuItem[] {
  return buatMenuContoh().slice(0, 3);
}

function draft(sebagian: Partial<DraftPesanan> = {}): DraftPesanan {
  return {
    namaPelanggan: 'Ratna Kusumawardani',
    kontak: '',
    jenisAcara: 'Ulang Tahun Anak',
    tanggalAcara: '2026-10-20',
    jamAcara: '18:00',
    alamat: 'Jl. Poros Mandonga No. 12, Kendari',
    pengantar: 'Ahmad (mitra)',
    items: [{ id: 'i1', menuId: 'mn-ayam-bakar', jumlahPorsi: '25' }],
    catatan: '',
    catatanAntar: '',
    dp: '',
    ...sebagian,
  };
}

describe('validasi jumlah porsi', () => {
  it('menolak nilai kosong', () => {
    expect(validasiJumlahPorsi('')).toBe('Jumlah porsi wajib diisi.');
  });

  it('menolak desimal dan negatif', () => {
    expect(validasiJumlahPorsi('12.5')).not.toBeNull();
    expect(validasiJumlahPorsi('-5')).not.toBeNull();
    expect(validasiJumlahPorsi('0')).not.toBeNull();
  });

  it('menerima bilangan bulat positif sampai batas', () => {
    expect(validasiJumlahPorsi('1')).toBeNull();
    expect(validasiJumlahPorsi(String(MAKS_PORSI))).toBeNull();
  });

  it('menolak yang melebihi batas', () => {
    expect(validasiJumlahPorsi(String(MAKS_PORSI + 1))).not.toBeNull();
  });
});

describe('validasi kontak', () => {
  it('kontak opsional sehingga kosong lolos', () => {
    expect(validasiKontak('')).toBeNull();
    expect(validasiKontak('   ')).toBeNull();
  });

  it('menerima format nomor Indonesia', () => {
    expect(validasiKontak('0812 3456 7890')).toBeNull();
    expect(validasiKontak('+62 812-3456-7890')).toBeNull();
  });

  it('menolak huruf dan nomor terlalu pendek', () => {
    expect(validasiKontak('0812abc')).not.toBeNull();
    expect(validasiKontak('0812')).not.toBeNull();
  });
});

describe('validasi tanggal dan jam acara', () => {
  it('menolak format salah', () => {
    expect(validasiTanggalAcara('20-10-2026')).not.toBeNull();
    expect(validasiJamAcara('25:00')).not.toBeNull();
    expect(validasiJamAcara('18:60')).not.toBeNull();
    expect(validasiJamAcara('')).not.toBeNull();
  });

  it('menolak tanggal kalender yang tidak ada', () => {
    expect(validasiTanggalAcara('2026-02-29')).not.toBeNull();
    expect(validasiTanggalAcara('2026-04-31')).not.toBeNull();
    expect(validasiTanggalAcara('2026-13-01')).not.toBeNull();
  });

  it('menerima tanggal dan jam yang sah', () => {
    expect(validasiTanggalAcara('2026-10-20')).toBeNull();
    expect(validasiTanggalAcara('2024-02-29')).toBeNull();
    expect(validasiJamAcara('08:30')).toBeNull();
    expect(validasiJamAcara('23:59')).toBeNull();
  });
});

describe('validasi DP', () => {
  it('DP kosong berarti tidak ada pembayaran', () => {
    expect(validasiDP('', 500_000)).toBeNull();
    expect(validasiDP('0', 500_000)).toBeNull();
  });

  it('menolak DP melebihi total', () => {
    expect(validasiDP('600000', 500_000)).not.toBeNull();
  });

  it('menolak DP bukan bilangan bulat', () => {
    expect(validasiDP('50rb', 500_000)).not.toBeNull();
  });
});

describe('validasi draft pesanan', () => {
  const daftar = menus();

  it('draft benar tidak menghasilkan galat', () => {
    expect(validasiDraftPesanan(draft(), daftar)).toEqual({});
  });

  it('menandai setiap bidang wajib', () => {
    const galat = validasiDraftPesanan(
      draft({ namaPelanggan: '', jenisAcara: '', tanggalAcara: '', jamAcara: '', alamat: '', items: [] }),
      daftar,
    );
    expect(galat.namaPelanggan).toBeDefined();
    expect(galat.jenisAcara).toBeDefined();
    expect(galat.tanggalAcara).toBeDefined();
    expect(galat.jamAcara).toBeDefined();
    expect(galat.alamat).toBeDefined();
    expect(galat.items).toBeDefined();
  });

  it('menolak item tanpa menu terpilih', () => {
    expect(validasiDraftPesanan(draft({ items: [{ id: 'i1', menuId: '', jumlahPorsi: '10' }] }), daftar).items).toBeDefined();
  });

  it('menolak jumlah porsi tidak valid', () => {
    expect(validasiDraftPesanan(draft({ items: [{ id: 'i1', menuId: 'mn-ayam-bakar', jumlahPorsi: '0' }] }), daftar).items).toBeDefined();
  });

  it('menolak DP melebihi total yang dihitung dari draft', () => {
    // 25 porsi × 32.000 = 800.000
    expect(validasiDraftPesanan(draft({ dp: '900000' }), daftar).dp).toBeDefined();
  });
});

describe('validasi draft menu', () => {
  it('menolak nama terlalu pendek dan harga kosong', () => {
    const g = validasiDraftMenu({ nama: 'Ab', kategori: 'makanan', hargaPerPorsi: '', waktuMasak: '30', deskripsi: '', tersedia: true, bahan: [] });
    expect(g.nama).toBeDefined();
    expect(g.hargaPerPorsi).toBeDefined();
  });

  it('menolak harga di bawah minimum', () => {
    expect(validasiDraftMenu({ nama: 'Es Teh', kategori: 'minuman', hargaPerPorsi: '500', waktuMasak: '5', deskripsi: '', tersedia: true, bahan: [] }).hargaPerPorsi).toBeDefined();
  });

  it('menolak waktu masak tidak masuk akal', () => {
    expect(validasiDraftMenu({ nama: 'Nasi', kategori: 'makanan', hargaPerPorsi: '10000', waktuMasak: '0', deskripsi: '', tersedia: true, bahan: [] }).waktuMasak).toBeDefined();
    expect(validasiDraftMenu({ nama: 'Nasi', kategori: 'makanan', hargaPerPorsi: '10000', waktuMasak: '9999', deskripsi: '', tersedia: true, bahan: [] }).waktuMasak).toBeDefined();
  });

  it('menerima menu sah', () => {
    expect(validasiDraftMenu({ nama: 'Es Teh Manis', kategori: 'minuman', hargaPerPorsi: '6000', waktuMasak: '5', deskripsi: '', tersedia: true, bahan: [] })).toEqual({});
  });

  it('memeriksa bahan: kebutuhan dan harga satuan', () => {
    const g = validasiDraftMenu({
      nama: 'Paket',
      kategori: 'paket',
      hargaPerPorsi: '30000',
      waktuMasak: '30',
      deskripsi: '',
      tersedia: true,
      bahan: [{ id: 'b1', nama: '', jumlah: '', satuan: 'kg', hargaSatuan: '' }],
    });
    expect(g['bahan-0']).toBeDefined();
  });

  it('draftMenuKeMenu mengubah string menjadi angka', () => {
    const menu = draftMenuKeMenu(
      {
        nama: '  Nasi Kotak  ',
        kategori: 'makanan',
        hargaPerPorsi: '32000',
        waktuMasak: '45',
        deskripsi: '  nasi  ',
        tersedia: true,
        bahan: [{ id: 'b1', nama: 'Beras', jumlah: '0.09', satuan: 'kg', hargaSatuan: '16000' }],
      },
      'mn-baru',
    );
    expect(menu.id).toBe('mn-baru');
    expect(menu.nama).toBe('Nasi Kot' + 'ak');
    expect(menu.hargaPerPorsi).toBe(32_000);
    expect(menu.bahan[0].jumlah).toBeCloseTo(0.09, 5);
  });
});

describe('validasi berkas cadangan (impor tidak tepercaya)', () => {
  const contoh = buatDataContoh(ACUAN);
  const cadangan = {
    version: contoh.version,
    disimpanPada: '2026-10-12T00:00:00.000Z',
    menus: contoh.menus,
    pesanan: contoh.pesanan,
    tugas: contoh.tugas,
    aturan: contoh.aturan,
    aktivitas: contoh.aktivitas,
  };

  it('menerima cadangan yang valid', () => {
    const hasil = validasiBackup(cadangan);
    expect(hasil.ok).toBe(true);
    if (hasil.ok) {
      expect(hasil.data.pesanan).toHaveLength(contoh.pesanan.length);
      expect(hasil.data.menus).toHaveLength(contoh.menus.length);
      expect(hasil.data.aturan).toHaveLength(contoh.aturan.length);
    }
  });

  it('menolak masukan non-objek', () => {
    expect(validasiBackup(null).ok).toBe(false);
    expect(validasiBackup('{}').ok).toBe(false);
    expect(validasiBackup([]).ok).toBe(false);
  });

  it('menolak versi skema yang lebih baru', () => {
    const hasil = validasiBackup({ ...cadangan, version: 99 });
    expect(hasil.ok).toBe(false);
    if (!hasil.ok) expect(hasil.pesan).toContain('versi skema');
  });

  it('menolak bidang menus/pesanan yang bukan array', () => {
    expect(validasiBackup({ ...cadangan, menus: {} }).ok).toBe(false);
    expect(validasiBackup({ ...cadangan, pesanan: 'tidak' }).ok).toBe(false);
  });

  it('menolak katalog menu kosong', () => {
    expect(validasiBackup({ ...cadangan, menus: [] }).ok).toBe(false);
  });

  it('menolak kategori menu tidak dikenal', () => {
    const hasil = validasiBackup({ ...cadangan, menus: [{ ...cadangan.menus[0], kategori: 'minuman-imposter' }] });
    expect(hasil.ok).toBe(false);
  });

  it('menolak harga pecahan atau negatif', () => {
    expect(validasiBackup({ ...cadangan, menus: [{ ...cadangan.menus[0], hargaPerPorsi: 32_000.5 }] }).ok).toBe(false);
    expect(validasiBackup({ ...cadangan, menus: [{ ...cadangan.menus[0], hargaPerPorsi: -1 }] }).ok).toBe(false);
  });

  it('menolak menu tanpa nama', () => {
    expect(validasiBackup({ ...cadangan, menus: [{ ...cadangan.menus[0], nama: '   ' }] }).ok).toBe(false);
  });

  it('menolak pesanan tanpa nama pelanggan', () => {
    const rusak = JSON.parse(JSON.stringify(cadangan)) as typeof cadangan;
    rusak.pesanan[0].namaPelanggan = '   ';
    expect(validasiBackup(rusak).ok).toBe(false);
  });

  it('menolak tanggal acara tidak sah', () => {
    const rusak = JSON.parse(JSON.stringify(cadangan)) as typeof cadangan;
    rusak.pesanan[0].tanggalAcara = '2026-13-45';
    expect(validasiBackup(rusak).ok).toBe(false);
  });

  it('menolak jam acara di luar rentang', () => {
    const rusak = JSON.parse(JSON.stringify(cadangan)) as typeof cadangan;
    rusak.pesanan[0].jamAcara = '99:99';
    expect(validasiBackup(rusak).ok).toBe(false);
  });

  it('menolak status tidak dikenal', () => {
    const rusak = JSON.parse(JSON.stringify(cadangan)) as typeof cadangan;
    (rusak.pesanan[0] as { status: string }).status = 'dibaikan';
    expect(validasiBackup(rusak).ok).toBe(false);
  });

  it('menolak jumlah porsi bukan bilangan bulat positif', () => {
    const rusak = JSON.parse(JSON.stringify(cadangan)) as typeof cadangan;
    rusak.pesanan[0].items[0].jumlahPorsi = 0;
    expect(validasiBackup(rusak).ok).toBe(false);
  });

  it('menolak kode pesanan ganda', () => {
    const rusak = JSON.parse(JSON.stringify(cadangan)) as typeof cadangan;
    rusak.pesanan[1].kode = rusak.pesanan[0].kode;
    expect(validasiBackup(rusak).ok).toBe(false);
  });

  it('menolak tugas dengan batas waktu tidak sah', () => {
    const rusak = JSON.parse(JSON.stringify(cadangan)) as typeof cadangan;
    rusak.tugas[0].batasWaktu = 'besok';
    expect(validasiBackup(rusak).ok).toBe(false);
  });

  it('menolak aturan dengan pemicu tidak dikenal', () => {
    const rusak = JSON.parse(JSON.stringify(cadangan)) as typeof cadangan;
    (rusak.aturan[0] as { pemicu: string }).pemicu = 'ketika-bulan-purnama';
    expect(validasiBackup(rusak).ok).toBe(false);
  });

  it('semua pesan galat berbahasa Indonesia', () => {
    const hasil = validasiBackup({ ...cadangan, menus: 'x' });
    expect(hasil.ok).toBe(false);
    if (!hasil.ok) expect(hasil.pesan).toContain('daftar');
  });
});