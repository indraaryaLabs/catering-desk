import type { AturanOtomasi, Pesanan, StatusPesanan } from '../types';
import { ULUTAN_STATUS } from '../types';
import { normalisasi, rupiah } from './format';
import {
  persenDP,
  statusPembayaranPesanan,
  sisaBayar,
  totalPorsi,
  totalPesanan,
  transisiDiizinkan,
} from './pesanan';
import { hariIni, labelTenggat, selisihHari, stempelWaktu } from './tanggal';

/**
 * Mesin otomatisasi lokal. Aturan dievaluasi di peramban terhadap state saat
 * ini — tanpa jaringan, tanpa layanan pihak ketiga, tanpa API berbayar.
 * Setiap eksekusi dicatat sebagai aktivitas sehingga selalu dapat diaudit.
 */

export interface KonteksEvaluasi {
  hariIni: string;
  pesanan: Pesanan[];
}

export interface Eksekusi {
  aturanId: string;
  namaAturan: string;
  pesananId: string;
  kode: string;
  tindakan: AturanOtomasi['tindakan'][number];
  ringkas: string;
  /** Data siap pakai untuk diterapkan ke state. */
  tugas: {
    judul: string;
    detail: string;
    batasWaktu: string;
    prioritas: 'rendah' | 'sedang' | 'tinggi';
    selesai: boolean;
    sumber: 'otomasi';
    pesananId: string | null;
  } | null;
  statusBaru: StatusPesanan | null;
}

export interface HasilEvaluasi {
  eksekusi: Eksekusi[];
  /** Aturan yang cocok tetapi dilewati, alasannya dicatat. */
  dilewati: Array<{ nama: string; alasan: string }>;
}

export interface TugasDraf {
  judul: string;
  detail: string;
  batasWaktu: string;
  prioritas: 'rendah' | 'sedang' | 'tinggi';
  selesai: boolean;
  sumber: 'otomasi';
  pesananId: string | null;
}

/* ------------------------------------------------------------------ */

function nilaiNumerik(bidang: string, p: Pesanan): number {
  switch (bidang) {
    case 'dpPersen':
      return persenDP(p);
    case 'porsi':
      return totalPorsi(p);
    case 'hariMenujuAcara':
      return selisihHari(hariIni(), p.tanggalAcara);
    case 'nilaiPesanan':
      return totalPesanan(p);
    default:
      return 0;
  }
}

function nilaiTeks(bidang: string, p: Pesanan): string {
  switch (bidang) {
    case 'status':
      return p.status;
    case 'jenisAcara':
      return p.jenisAcara;
    case 'kategoriMenu':
      return p.items.map((i) => i.kategori).join(' ');
    default:
      return '';
  }
}

const BIDANG_TEKS = new Set(['status', 'jenisAcara', 'kategoriMenu']);

export function kondisiTerpenuhi(k: AturanOtomasi['kondisi'][number], p: Pesanan): boolean {
  if (BIDANG_TEKS.has(k.bidang)) {
    const teks = normalisasi(nilaiTeks(k.bidang, p));
    const cari = normalisasi(k.nilai);
    if (k.operator === 'memuat') return cari !== '' && teks.includes(cari);
    if (k.operator === 'tidakSamaDengan') return teks !== cari;
    return teks === cari;
  }

  const kiri = nilaiNumerik(k.bidang, p);
  const kanan = Number.parseFloat(k.nilai.replace(/[^\d.-]/g, ''));
  if (!Number.isFinite(kanan)) return false;

  switch (k.operator) {
    case 'samaDengan':
      return kiri === kanan;
    case 'tidakSamaDengan':
      return kiri !== kanan;
    case 'lebihDari':
      return kiri > kanan;
    case 'kurangDari':
      return kiri < kanan;
    case 'memuat':
      return String(kiri).includes(k.nilai);
    default:
      return false;
  }
}

function cocokSemua(kondisi: AturanOtomasi['kondisi'], p: Pesanan): boolean {
  return kondisi.every((k) => kondisiTerpenuhi(k, p));
}

function batasTugas(p: Pesanan): string {
  return selisihHari(hariIni(), p.tanggalAcara) <= 1 ? hariIni() : p.tanggalAcara;
}

function judulTugas(kondisi: AturanOtomasi['kondisi'], p: Pesanan): { judul: string; detail: string } {
  const hari = selisihHari(hariIni(), p.tanggalAcara);

  if (hari <= 1 && statusPembayaranPesanan(p) !== 'lunas') {
    return {
      judul: `Tindak lanjuti DP ${p.kode}`,
      detail: `Sisa tagihan ${rupiah(sisaBayar(p))} untuk ${p.namaPelanggan}, acara ${Math.max(hari, 0)} hari lagi.`,
    };
  }
  if (p.status === 'inquiry') {
    return {
      judul: `Konfirmasi inquiry ${p.kode}`,
      detail: `${p.namaPelanggan} menunggu konfirmasi untuk ${p.jenisAcara} (${rupiah(totalPesanan(p))}).`,
    };
  }
  if (hari === 1) {
    return {
      judul: `Cek bahan untuk ${p.kode}`,
      detail: `${totalPorsi(p)} porsi untuk ${p.namaPelanggan}. Besok ${p.jamAcara}.`,
    };
  }
  const pertama = kondisi[0];
  return {
    judul: `Tinjau ${p.kode}`,
    detail:
      pertama === undefined
        ? `${p.namaPelanggan} · ${p.jenisAcara}`
        : `${p.namaPelanggan} cocok kondisi "${pertama.nilai}".`,
  };
}

/**
 * Mengevaluasi seluruh aturan aktif terhadap satu pesanan.
 * Tidak mengubah state — pemanggil yang menerapkannya.
 */
export function evaluasiAturan(
  aturan: AturanOtomasi[],
  p: Pesanan,
  _konteks: KonteksEvaluasi,
  pemicu: AturanOtomasi['pemicu'],
  statusSebelum: StatusPesanan | null,
): HasilEvaluasi {
  const eksekusi: Eksekusi[] = [];
  const dilewati: Array<{ nama: string; alasan: string }> = [];

  for (const aturanAktif of aturan) {
    if (!aturanAktif.aktif) continue;
    if (aturanAktif.pemicu !== pemicu) continue;
    if (!cocokSemua(aturanAktif.kondisi, p)) continue;

    for (const tindakan of aturanAktif.tindakan) {
      const dasar = {
        aturanId: aturanAktif.id,
        namaAturan: aturanAktif.nama,
        pesananId: p.id,
        kode: p.kode,
        tindakan,
      };

      switch (tindakan.jenis) {
        case 'naikkan-status': {
          const target = statusBerikutnya(p.status);
          if (target === null) {
            dilewati.push({ nama: aturanAktif.nama, alasan: `${p.kode} sudah di tahap akhir` });
            continue;
          }
          if (statusSebelum !== null && target === statusSebelum) {
            dilewati.push({
              nama: aturanAktif.nama,
              alasan: `${p.kode} akan mengembalikan status yang sama (loop dicegah)`,
            });
            continue;
          }
          eksekusi.push({ ...dasar, statusBaru: target, tugas: null, ringkas: `${p.kode} naik ke ${target}` });
          break;
        }

        case 'buat-tugas': {
          const isi = judulTugas(aturanAktif.kondisi, p);
          eksekusi.push({
            ...dasar,
            statusBaru: null,
            tugas: {
              judul: isi.judul,
              detail: isi.detail,
              batasWaktu: batasTugas(p),
              prioritas: selisihHari(hariIni(), p.tanggalAcara) <= 1 ? 'tinggi' : 'sedang',
              selesai: false,
              sumber: 'otomasi' as const,
              pesananId: p.id,
            },
            ringkas: `Tugas dibuat: ${isi.judul}`,
          });
          break;
        }

        case 'tandai-prioritas': {
          const isi = judulTugas(aturanAktif.kondisi, p);
          eksekusi.push({
            ...dasar,
            statusBaru: null,
            tugas: {
              judul: isi.judul,
              detail: isi.detail,
              batasWaktu: batasTugas(p),
              prioritas: 'tinggi',
              selesai: false,
              sumber: 'otomasi' as const,
              pesananId: p.id,
            },
            ringkas: `Prioritas tinggi: ${p.kode}`,
          });
          break;
        }

        case 'siapkan-draf-pesan': {
          eksekusi.push({
            ...dasar,
            statusBaru: null,
            tugas: {
              judul: `Siapkan pesan untuk ${p.kode}`,
              detail: `${p.namaPelanggan} · ${p.jenisAcara}. Draf tersedia di detail pesanan.`,
              batasWaktu: batasTugas(p),
              prioritas: 'sedang',
              selesai: false,
              sumber: 'otomasi' as const,
              pesananId: p.id,
            },
            ringkas: `Draf pesan disiapkan untuk ${p.kode}`,
          });
          break;
        }

        default:
          break;
      }
    }
  }

  return { eksekusi, dilewati };
}

/** Tahap berikutnya dalam alur, atau null bila sudah di tahap akhir. */
export function statusBerikutnya(s: StatusPesanan): StatusPesanan | null {
  const index = ULUTAN_STATUS.indexOf(s);
  if (index < 0 || s === 'selesai' || s === 'dibatalkan') return null;
  const berikut = ULUTAN_STATUS[index + 1];
  return berikut !== undefined && transisiDiizinkan(s, berikut) ? berikut : null;
}

export function ringkasAturan(a: AturanOtomasi): string {
  if (a.kondisi.length === 0) return 'berlaku untuk semua pesanan dengan pemicu ini';
  return `ketika ${a.kondisi
    .map((k) => `${k.bidang} ${k.operator} ${k.nilai}`)
    .join(' dan ')}`;
}

export function validasiAturan(a: AturanOtomasi): Array<{ bidang: string; pesan: string }> {
  const galat: Array<{ bidang: string; pesan: string }> = [];
  if (a.nama.trim().length < 3) galat.push({ bidang: 'nama', pesan: 'Nama aturan minimal 3 karakter.' });
  if (a.kondisi.length === 0) galat.push({ bidang: 'kondisi', pesan: 'Tambahkan minimal satu kondisi.' });
  if (a.tindakan.length === 0) galat.push({ bidang: 'tindakan', pesan: 'Pilih minimal satu tindakan.' });
  for (const k of a.kondisi) {
    if (k.nilai.trim() === '') galat.push({ bidang: 'kondisi', pesan: 'Nilai kondisi tidak boleh kosong.' });
  }
  return galat;
}

export function aturanBaru(): AturanOtomasi {
  return {
    id: `at-${Math.random().toString(36).slice(2, 10)}`,
    nama: 'Aturan baru',
    aktif: true,
    pemicu: 'status-berubah',
    kondisi: [],
    tindakan: [],
    dibuatPada: stempelWaktu(),
    eksekusi: 0,
  };
}

/** Membuat tugas otomatis untuk pesanan yang jatuh tempo dalam 3 hari. */
export function tugasHarian(
  tugas: Array<{ pesananId: string | null; batasWaktu: string; selesai: boolean; sumber: string }>,
  p: Pesanan,
  acuan: string,
): TugasDraf | null {
  const sudahAda = tugas.some(
    (t) => t.pesananId === p.id && t.batasWaktu === acuan && !t.selesai && t.sumber === 'otomasi',
  );
  if (sudahAda) return null;
  const hari = selisihHari(acuan, p.tanggalAcara);
  if (hari < 0 || hari > 3) return null;
  if (p.status === 'selesai' || p.status === 'dibatalkan') return null;
  return {
    judul: `Cek persiapan ${p.kode}`,
    detail:
      hari === 0
        ? `${totalPorsi(p)} porsi untuk ${p.namaPelanggan}, acara hari ini ${p.jamAcara}.`
        : `${totalPorsi(p)} porsi untuk ${p.namaPelanggan}, ${labelTenggat(p.tanggalAcara, acuan)}.`,
    batasWaktu: p.tanggalAcara,
    prioritas: hari <= 1 ? 'tinggi' : 'sedang',
    selesai: false,
    sumber: 'otomasi' as const,
    pesananId: p.id,
  };
}

/** Urutkan tugas: belum selesai dulu, lalu prioritas, lalu tenggat. */
export function urutkanTugas<T extends { selesai: boolean; prioritas: 'rendah' | 'sedang' | 'tinggi'; batasWaktu: string; dibuatPada: string }>(
  tugas: T[],
): T[] {
  const bobot = { tinggi: 0, sedang: 1, rendah: 2 } as const;
  return [...tugas].sort((a, b) => {
    if (a.selesai !== b.selesai) return a.selesai ? 1 : -1;
    if (bobot[a.prioritas] !== bobot[b.prioritas]) return bobot[a.prioritas] - bobot[b.prioritas];
    if (a.batasWaktu !== b.batasWaktu) return a.batasWaktu.localeCompare(b.batasWaktu);
    return b.dibuatPada.localeCompare(a.dibuatPada);
  });
}

/** Tugas yang terlambat atau jatuh tempo hari ini. */
export function tugasMendesak<T extends { selesai: boolean; batasWaktu: string; prioritas: 'rendah' | 'sedang' | 'tinggi'; dibuatPada: string }>(
  tugas: T[],
  acuan = hariIni(),
): T[] {
  return urutkanTugas(tugas.filter((t) => !t.selesai)).filter(
    (t) => selisihHari(acuan, t.batasWaktu) <= 0,
  );
}