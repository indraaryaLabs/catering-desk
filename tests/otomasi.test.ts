import { describe, expect, it } from 'vitest';
import type { AturanOtomasi, Pesanan } from '../src/types';
import { kondisiTerpenuhi, evaluasiAturan, ringkasAturan, statusBerikutnya, validasiAturan, aturanBaru } from '../src/lib/otomasi';
import { hariIni } from '../src/lib/tanggal';

function pesanan(sebagian: Partial<Pesanan> = {}): Pesanan {
  return {
    id: 'p1',
    kode: 'ORD-2026-0001',
    namaPelanggan: 'Dewi Lestari',
    kontak: '',
    jenisAcara: 'Pengajian Bulanan',
    tanggalAcara: hariIni(),
    jamAcara: '18:00',
    alamat: 'Jl. Mandonga No. 1',
    items: [
      {
        id: 'i1',
        menuId: 'mn-ayam',
        namaMenu: 'Nasi Kotak Ayam Bakar',
        kategori: 'makanan',
        hargaPerPorsi: 32_000,
        jumlahPorsi: 20,
      },
    ],
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

function aturan(patch: Partial<AturanOtomasi> = {}): AturanOtomasi {
  return {
    id: 'at-1',
    nama: 'Aturan uji',
    aktif: true,
    pemicu: 'pesanan-ditambahkan',
    kondisi: [],
    tindakan: [],
    dibuatPada: '2026-10-01T00:00:00.000Z',
    eksekusi: 0,
    ...patch,
  };
}

const konteks = { hariIni: hariIni(), pesanan: [] };

describe('statusBerikutnya', () => {
  it('maju satu tahap setiap kali', () => {
    expect(statusBerikutnya('inquiry')).toBe('dikonfirmasi');
    expect(statusBerikutnya('dikonfirmasi')).toBe('persiapan');
    expect(statusBerikutnya('persiapan')).toBe('siap');
    expect(statusBerikutnya('siap')).toBe('selesai');
  });

  it('berhenti di tahap akhir', () => {
    expect(statusBerikutnya('selesai')).toBeNull();
    expect(statusBerikutnya('dibatalkan')).toBeNull();
  });
});

describe('kondisi terpenuhi', () => {
  const p = pesanan({ dp: 200_000, tanggalAcara: hariIni(), status: 'dikonfirmasi', jenisAcara: 'Pengajian Bulanan' });

  it('membandingkan status', () => {
    expect(kondisiTerpenuhi({ id: 'k', bidang: 'status', operator: 'samaDengan', nilai: 'dikonfirmasi' }, p)).toBe(true);
    expect(kondisiTerpenuhi({ id: 'k', bidang: 'status', operator: 'samaDengan', nilai: 'inquiry' }, p)).toBe(false);
    expect(kondisiTerpenuhi({ id: 'k', bidang: 'status', operator: 'tidakSamaDengan', nilai: 'inquiry' }, p)).toBe(true);
  });

  it('membandingkan persen DP (20.000 dari 640.000 = 31%)', () => {
    expect(kondisiTerpenuhi({ id: 'k', bidang: 'dpPersen', operator: 'lebihDari', nilai: '25' }, p)).toBe(true);
    expect(kondisiTerpenuhi({ id: 'k', bidang: 'dpPersen', operator: 'kurangDari', nilai: '10' }, p)).toBe(false);
  });

  it('membandingkan jumlah porsi', () => {
    expect(kondisiTerpenuhi({ id: 'k', bidang: 'porsi', operator: 'lebihDari', nilai: '19' }, p)).toBe(true);
  });

  it('membandingkan hari menuju acara (tanpa kemunduan)', () => {
    expect(kondisiTerpenuhi({ id: 'k', bidang: 'hariMenujuAcara', operator: 'kurangDari', nilai: '1' }, p)).toBe(true);
  });

  it('membandingkan jenis acara dengan pencocokan huruf bebas', () => {
    expect(kondisiTerpenuhi({ id: 'k', bidang: 'jenisAcara', operator: 'memuat', nilai: 'pengajian' }, p)).toBe(true);
    expect(kondisiTerpenuhi({ id: 'k', bidang: 'jenisAcara', operator: 'memuat', nilai: 'ulang tahun' }, p)).toBe(false);
  });

  it('menolak nilai kondisi yang tidak numerik', () => {
    expect(kondisiTerpenuhi({ id: 'k', bidang: 'porsi', operator: 'lebihDari', nilai: 'bukan-angka' }, p)).toBe(false);
  });
});

describe('evaluasi aturan', () => {
  it('tidak menjalankan aturan nonaktif', () => {
    const a = aturan({ aktif: false, pemicu: 'pesanan-ditambahkan', tindakan: [{ id: 't', jenis: 'naikkan-status', parameter: '' }] });
    const hasil = evaluasiAturan([a], pesanan(), konteks, 'pesanan-ditambahkan', null);
    expect(hasil.eksekusi).toHaveLength(0);
  });

  it('tidak menjalankan pemicu yang tidak cocok', () => {
    const a = aturan({ pemicu: 'harian', tindakan: [{ id: 't', jenis: 'naikkan-status', parameter: '' }] });
    expect(evaluasiAturan([a], pesanan(), konteks, 'pesanan-ditambahkan', null).eksekusi).toHaveLength(0);
  });

  it('tidak menjalankan bila kondisi tidak terpenuhi', () => {
    const a = aturan({
      pemicu: 'pesanan-ditambahkan',
      kondisi: [{ id: 'k', bidang: 'status', operator: 'samaDengan', nilai: 'selesai' }],
      tindakan: [{ id: 't', jenis: 'naikkan-status', parameter: '' }],
    });
    expect(evaluasiAturan([a], pesanan(), konteks, 'pesanan-ditambahkan', null).eksekusi).toHaveLength(0);
  });

  it('maju satu tahap bila DP melebihi batas', () => {
    const p = pesanan({ dp: 400_000 });
    const a = aturan({
      pemicu: 'pesanan-ditambahkan',
      kondisi: [{ id: 'k', bidang: 'dpPersen', operator: 'lebihDari', nilai: '50' }],
      tindakan: [{ id: 't', jenis: 'naikkan-status', parameter: '' }],
    });
    const hasil = evaluasiAturan([a], p, konteks, 'pesanan-ditambahkan', null);
    expect(hasil.eksekusi).toHaveLength(1);
    expect(hasil.eksekusi[0].statusBaru).toBe('dikonfirmasi');
  });

  it('menghindari ping-pong status', () => {
    const p = pesanan({ dp: 400_000 });
    const a = aturan({
      pemicu: 'status-berubah',
      kondisi: [{ id: 'k', bidang: 'dpPersen', operator: 'lebihDari', nilai: '50' }],
      tindakan: [{ id: 't', jenis: 'naikkan-status', parameter: '' }],
    });
    const hasil = evaluasiAturan([a], p, konteks, 'status-berubah', 'dikonfirmasi');
    expect(hasil.eksekusi).toHaveLength(0);
    expect(hasil.dilewati[0].alasan).toMatch(/loop/);
  });

  it('membuat tugas untuk status akhir', () => {
    const a = aturan({
      pemicu: 'pesanan-ditambahkan',
      kondisi: [{ id: 'k', bidang: 'status', operator: 'samaDengan', nilai: 'inquiry' }],
      tindakan: [{ id: 't', jenis: 'buat-tugas', parameter: '' }],
    });
    const hasil = evaluasiAturan([a], pesanan(), konteks, 'pesanan-ditambahkan', null);
    expect(hasil.eksekusi).toHaveLength(1);
    expect(hasil.eksekusi[0].tugas?.judul).toContain('ORD-2026-0001');
    expect(hasil.eksekusi[0].tugas?.sumber).toBe('otomasi');
  });

  it('tandai-prioritas menghasilkan tugas dengan prioritas tinggi', () => {
    const a = aturan({
      pemicu: 'pesanan-ditambahkan',
      kondisi: [{ id: 'k', bidang: 'status', operator: 'samaDengan', nilai: 'inquiry' }],
      tindakan: [{ id: 't', jenis: 'tandai-prioritas', parameter: '' }],
    });
    const hasil = evaluasiAturan([a], pesanan(), konteks, 'pesanan-ditambahkan', null);
    expect(hasil.eksekusi[0].tugas?.prioritas).toBe('tinggi');
  });

  it('siapkan-draf-pesan menghasilkan tugas yang jelas', () => {
    const a = aturan({
      pemicu: 'pesanan-ditambahkan',
      kondisi: [{ id: 'k', bidang: 'status', operator: 'samaDengan', nilai: 'inquiry' }],
      tindakan: [{ id: 't', jenis: 'siapkan-draf-pesan', parameter: '' }],
    });
    const hasil = evaluasiAturan([a], pesanan(), konteks, 'pesanan-ditambahkan', null);
    expect(hasil.eksekusi[0].tugas?.judul).toBe('Siapkan pesan untuk ORD-2026-0001');
  });

  it('pemicu tak dikenal tidak memberi aksi', () => {
    const a = aturan({
      pemicu: 'pesanan-ditambahkan',
      kondisi: [{ id: 'k', bidang: 'status', operator: 'samaDengan', nilai: 'inquiry' }],
      tindakan: [{ id: 't', jenis: 'buat-tugas', parameter: '' }],
    });
    const pertama = evaluasiAturan([a], pesanan(), konteks, 'pesanan-ditambahkan', null);
    const kedua = evaluasiAturan([a], pesanan(), konteks, 'harian', null);
    expect(pertama.eksekusi).toHaveLength(1);
    expect(kedua.eksekusi).toHaveLength(0);
  });
});

describe('ringkas & validasi aturan', () => {
  it('ringkasan menyebut kondisi yang belum terisi', () => {
    expect(ringkasAturan(aturan())).toBe('berlaku untuk semua pesanan dengan pemicu ini');
  });

  it('ringkasan menyebut setiap kondisi', () => {
    const a = aturan({ kondisi: [{ id: 'k', bidang: 'porsi', operator: 'lebihDari', nilai: '50' }] });
    expect(ringkasAturan(a)).toContain('porsi');
    expect(ringkasAturan(a)).toContain('50');
  });

  it('aturan baru memakai id unik', () => {
    expect(aturanBaru().id).not.toBe(aturanBaru().id);
  });

  it('aturan tanpa syarat dan tindakan ditolak', () => {
    const a = aturan({ nama: 'ok' });
    expect(validasiAturan(a).length).toBeGreaterThan(0);
  });

  it('aturan lengkap diterima', () => {
    const a = aturan({
      nama: 'Auto konfirmasi',
      kondisi: [{ id: 'k', bidang: 'dpPersen', operator: 'lebihDari', nilai: '50' }],
      tindakan: [{ id: 't', jenis: 'naikkan-status', parameter: '' }],
    });
    expect(validasiAturan(a)).toHaveLength(0);
  });

  it('nilai kondisi kosong ditolak', () => {
    const a = aturan({
      nama: 'Batas kosong',
      kondisi: [{ id: 'k', bidang: 'porsi', operator: 'lebihDari', nilai: '  ' }],
      tindakan: [{ id: 't', jenis: 'buat-tugas', parameter: '' }],
    });
    expect(validasiAturan(a).some((g) => g.bidang === 'kondisi')).toBe(true);
  });
});