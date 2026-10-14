import type {
  Aktivitas,
  AturanOtomasi,
  BackupData,
  DataAplikasi,
  JenisAktivitas,
  MenuItem,
  Pesanan,
  Preferensi,
  StatusPesanan,
  Tugas,
} from '../types';
import { buatDataContoh } from '../lib/seed';
import { pesananAktif, transisiDiizinkan, type RingkasanProduksi } from '../lib/pesanan';
import { ringkasanProduksi } from '../lib/pesanan';
import { idBaru } from '../lib/kode';
import { hariIni, stempelWaktu } from '../lib/tanggal';

/* ==================================================================== */
/* Aksi                                                                 */
/* ==================================================================== */

export type Aksi =
  | { tipe: 'pesanan/tambah'; pesanan: Pesanan }
  | { tipe: 'pesanan/ubah'; pesanan: Pesanan }
  | { tipe: 'pesanan/hapus'; id: string }
  | { tipe: 'pesanan/status'; id: string; status: StatusPesanan; oleh?: 'pengguna' | 'otomasi' }
  | { tipe: 'pesanan/status-banyak'; perubahan: Array<{ id: string; status: StatusPesanan }> }
  | { tipe: 'menu/tambah'; menu: MenuItem }
  | { tipe: 'menu/ubah'; menu: MenuItem }
  | { tipe: 'menu/hapus'; id: string }
  | { tipe: 'tugas/tambah'; tugas: Tugas }
  | { tipe: 'tugas/toggle'; id: string }
  | { tipe: 'tugas/hapus'; id: string }
  | { tipe: 'tugas/bersihkan' }
  | {
      tipe: 'aturan/simpan';
      aturan: AturanOtomasi;
      /** Hanya menaikkan penghitung eksekusi; tidak dicatat sebagai langkah undo. */
      hanyaHitung?: boolean;
    }
  | { tipe: 'aturan/hapus'; id: string }
  | { tipe: 'data/impor'; backup: BackupData }
  | { tipe: 'data/reset'; acuan: string }
  | { tipe: 'data/preferensi'; preferensi: Preferensi }
  | { tipe: 'data/aktivitas'; aktivitas: Aktivitas[] }
  | { tipe: 'riwayat/undo' }
  | { tipe: 'riwayat/redo' };

/* ==================================================================== */
/* State + riwayat                                                      */
/* ==================================================================== */

export interface Cuplikan {
  label: string;
  data: DataAplikasi;
}

export interface Riwayat {
  lalu: Cuplikan[];
  damping: Cuplikan[];
}

export interface TokoState {
  data: DataAplikasi;
  riwayat: Riwayat;
}

const MAKS_RIWAYAT = 40;
const MAKS_AKTIVITAS = 120;
const MAKS_TUGAS = 300;

export function tokoAwal(data: DataAplikasi): TokoState {
  return { data, riwayat: { lalu: [], damping: [] } };
}

function dorongRiwayat(riwayat: Riwayat, label: string, data: DataAplikasi): Riwayat {
  if (label === '') return riwayat;
  return { lalu: [...riwayat.lalu, { label, data }].slice(-MAKS_RIWAYAT), damping: [] };
}

function catat(
  state: TokoState,
  jenis: JenisAktivitas,
  judul: string,
  detail = '',
  oleh: Aktivitas['oleh'] = 'pengguna',
): Aktivitas[] {
  const baru: Aktivitas = { id: idBaru('ak'), waktu: stempelWaktu(), jenis, judul, detail, oleh };
  return [baru, ...state.data.aktivitas].slice(0, MAKS_AKTIVITAS);
}

/**
 * Menerapkan perubahan data dan mencatatnya ke riwayat undo.
 *
 * `diam` menandai perubahan sampingan yang tidak boleh menjadi langkah undo
 * tersendiri — misalnya tugas dan penghitung eksekusi yang dibuat otomasi
 * menyertai satu aksi pengguna. Tanpa penanda ini, satu Ctrl+Z hanya
 * membatalkan sampingan itu dan aksi pengguna tetap menggantung, sehingga
 * undo terasa macet. Karena undo memulihkan data secara menyeluruh, seluruh
 * efek samping aksi pengguna ikut hilang bersama dalam satu langkah.
 */
function dengan(
  state: TokoState,
  patch: Partial<DataAplikasi>,
  aktivitas?: Aktivitas[],
  label?: string,
  diam = false,
): TokoState {
  const data: DataAplikasi = { ...state.data, ...patch, preferensi: patch.preferensi ?? state.data.preferensi };
  return {
    data: aktivitas === undefined ? data : { ...data, aktivitas },
    riwayat: diam ? state.riwayat : dorongRiwayat(state.riwayat, label ?? '', state.data),
  };
}

/* ==================================================================== */
/* Reducer                                                              */
/* ==================================================================== */

export function reducer(state: TokoState, aksi: Aksi): TokoState {
  switch (aksi.tipe) {
    case 'pesanan/tambah':
      return dengan(
        state,
        { pesanan: [...state.data.pesanan, aksi.pesanan], contoh: false },
        catat(state, 'pesanan-dibuat', `Pesanan ${aksi.pesanan.kode} dibuat`, aksi.pesanan.namaPelanggan),
        `Tambah pesanan ${aksi.pesanan.kode}`,
      );

    case 'pesanan/ubah': {
      const sebelum = state.data.pesanan.find((p) => p.id === aksi.pesanan.id);
      const statusBerubah = sebelum !== undefined && sebelum.status !== aksi.pesanan.status;
      return dengan(
        state,
        {
          pesanan: state.data.pesanan.map((p) => (p.id === aksi.pesanan.id ? aksi.pesanan : p)),
          contoh: false,
        },
        catat(
          state,
          statusBerubah ? 'status-berubah' : 'pesanan-diubah',
          statusBerubah
            ? `${aksi.pesanan.kode}: ${sebelum.status} → ${aksi.pesanan.status}`
            : `Pesanan ${aksi.pesanan.kode} diperbarui`,
          aksi.pesanan.namaPelanggan,
        ),
        `Ubah pesanan ${aksi.pesanan.kode}`,
      );
    }

    case 'pesanan/hapus': {
      const target = state.data.pesanan.find((p) => p.id === aksi.id);
      return dengan(
        state,
        { pesanan: state.data.pesanan.filter((p) => p.id !== aksi.id), contoh: false },
        catat(state, 'pesanan-dihapus', `Pesanan ${target?.kode ?? '—'} dihapus`, target?.namaPelanggan ?? ''),
        `Hapus pesanan ${target?.kode ?? ''}`,
      );
    }

    case 'pesanan/status': {
      const target = state.data.pesanan.find((p) => p.id === aksi.id);
      if (target === undefined || target.status === aksi.status) return state;
      if (!transisiDiizinkan(target.status, aksi.status)) return state;
      return dengan(
        state,
        {
          pesanan: state.data.pesanan.map((p) =>
            p.id === aksi.id ? { ...p, status: aksi.status, diperbaruiPada: stempelWaktu() } : p,
          ),
          contoh: false,
        },
        catat(
          state,
          'status-berubah',
          `${target.kode}: ${target.status} → ${aksi.status}`,
          target.namaPelanggan,
          aksi.oleh ?? 'pengguna',
        ),
        `Ubah status ${target.kode}`,
      );
    }

    case 'pesanan/status-banyak': {
      const peta = new Map(aksi.perubahan.map((x) => [x.id, x.status]));
      return dengan(
        state,
        {
          pesanan: state.data.pesanan.map((p) => {
            const s = peta.get(p.id);
            if (s === undefined || s === p.status || !transisiDiizinkan(p.status, s)) return p;
            return { ...p, status: s, diperbaruiPada: stempelWaktu() };
          }),
          contoh: false,
        },
        catat(state, 'status-berubah', `Status ${peta.size} pesanan diperbarui`, '', 'otomasi'),
        // Perubahan status hasil otomasi menyertai aksi pemicunya.
        '',
      );
    }

    case 'menu/tambah':
      return dengan(
        state,
        { menus: [...state.data.menus, aksi.menu], contoh: false },
        catat(state, 'menu-diubah', `Menu ${aksi.menu.nama} ditambahkan`),
        `Tambah menu ${aksi.menu.nama}`,
      );

    case 'menu/ubah':
      return dengan(
        state,
        { menus: state.data.menus.map((m) => (m.id === aksi.menu.id ? aksi.menu : m)), contoh: false },
        catat(state, 'menu-diubah', `Menu ${aksi.menu.nama} diperbarui`),
        `Ubah menu ${aksi.menu.nama}`,
      );

    case 'menu/hapus':
      return dengan(
        state,
        { menus: state.data.menus.filter((m) => m.id !== aksi.id), contoh: false },
        catat(state, 'menu-diubah', `Menu ${state.data.menus.find((m) => m.id === aksi.id)?.nama ?? '—'} dihapus`),
        'Hapus menu',
      );

    case 'tugas/tambah':
      return dengan(
        state,
        { tugas: [aksi.tugas, ...state.data.tugas].slice(0, MAKS_TUGAS) },
        catat(state, 'atasReset', `Tugas baru: ${aksi.tugas.judul}`, '', aksi.tugas.sumber),
        // Tugas dari otomasi menyertai aksi pemicunya, bukan langkah sendiri.
        aksi.tugas.sumber === 'otomasi' ? '' : 'Tambah tugas',
      );

    case 'tugas/toggle':
      return dengan(
        state,
        { tugas: state.data.tugas.map((t) => (t.id === aksi.id ? { ...t, selesai: !t.selesai } : t)) },
        undefined,
        'Ubah status tugas',
      );

    case 'tugas/hapus':
      return dengan(state, { tugas: state.data.tugas.filter((t) => t.id !== aksi.id) }, undefined, 'Hapus tugas');

    case 'tugas/bersihkan':
      return dengan(state, { tugas: state.data.tugas.filter((t) => !t.selesai) }, undefined, 'Bersihkan tugas selesai');

    case 'aturan/simpan': {
      const ada = state.data.aturan.some((a) => a.id === aksi.aturan.id);
      return dengan(
        state,
        {
          aturan: ada
            ? state.data.aturan.map((a) => (a.id === aksi.aturan.id ? aksi.aturan : a))
            : [...state.data.aturan, aksi.aturan],
          contoh: false,
        },
        // Menaikkan penghitung eksekusi adalah catatan sampingan, bukan langkah
        // undo tersendiri: pengguna tidak pernah merasa ia mengubah aturan.
        aksi.hanyaHitung
          ? undefined
          : catat(state, 'otomasi', `Aturan ${ada ? 'diperbarui' : 'ditambahkan'}: ${aksi.aturan.nama}`),
        aksi.hanyaHitung ? '' : ada ? 'Ubah aturan' : 'Tambah aturan',
      );
    }

    case 'aturan/hapus':
      return dengan(
        state,
        { aturan: state.data.aturan.filter((a) => a.id !== aksi.id) },
        catat(state, 'otomasi', `Aturan ${state.data.aturan.find((a) => a.id === aksi.id)?.nama ?? '—'} dihapus`),
        'Hapus aturan',
      );

    case 'data/impor':
      return dengan(
        state,
        {
          menus: aksi.backup.menus,
          pesanan: aksi.backup.pesanan,
          tugas: aksi.backup.tugas ?? [],
          aturan: aksi.backup.aturan ?? [],
          aktivitas: aksi.backup.aktivitas ?? [],
          contoh: false,
        },
        catat(state, 'diimpor', 'Data diimpor dari berkas cadangan', `${aksi.backup.pesanan.length} pesanan, ${aksi.backup.menus.length} menu`),
        'Impor data',
      );

    case 'data/reset':
      return { data: buatDataContoh(aksi.acuan), riwayat: dorongRiwayat(state.riwayat, 'Reset ke data contoh', state.data) };

    case 'data/preferensi':
      return { ...state, data: { ...state.data, preferensi: aksi.preferensi } };

    case 'data/aktivitas':
      return { ...state, data: { ...state.data, aktivitas: aksi.aktivitas.slice(0, MAKS_AKTIVITAS) } };

    case 'riwayat/undo': {
      const entri = state.riwayat.lalu[state.riwayat.lalu.length - 1];
      if (entri === undefined) return state;
      return {
        data: entri.data,
        riwayat: {
          lalu: state.riwayat.lalu.slice(0, -1),
          // Simpan keadaan SESUDAH perubahan, bukan entri yang sama. Kalau
          // entri lama ikut didorong ke sini, redo akan memulihkan keadaan
          // sebelum perubahan — sehingga redo tampak tidak melakukan apa pun.
          damping: [...state.riwayat.damping, { label: entri.label, data: state.data }].slice(
            -MAKS_RIWAYAT,
          ),
        },
      };
    }

    case 'riwayat/redo': {
      const sesudah = state.riwayat.damping[state.riwayat.damping.length - 1];
      if (sesudah === undefined) return state;
      return {
        data: sesudah.data,
        riwayat: {
          lalu: [...state.riwayat.lalu, sesudah].slice(-MAKS_RIWAYAT),
          damping: state.riwayat.damping.slice(0, -1),
        },
      };
    }

    default:
      return state;
  }
}

/* ==================================================================== */
/* Undo / redo                                                          */
/* ==================================================================== */

export function bisaUndo(r: Riwayat): boolean {
  return r.lalu.length > 0;
}

export function bisaRedo(r: Riwayat): boolean {
  return r.damping.length > 0;
}

export function labelUndo(r: Riwayat): string | null {
  return r.lalu[r.lalu.length - 1]?.label ?? null;
}

/* ==================================================================== */
/* Derivasi yang sering dipakai                                         */
/* ==================================================================== */

export function petaWaktuMasak(menus: MenuItem[]): Map<string, number> {
  return new Map(menus.map((m) => [m.id, m.waktuMasak]));
}

export function produksiUntuk(data: DataAplikasi, tanggal: string): RingkasanProduksi {
  return ringkasanProduksi(data.pesanan, tanggal, petaWaktuMasak(data.menus));
}

export function pesananAktifHariIni(data: DataAplikasi, acuan = hariIni()): Pesanan[] {
  return data.pesanan
    .filter((p) => p.tanggalAcara === acuan && pesananAktif(p))
    .sort((a, b) => a.jamAcara.localeCompare(b.jamAcara));
}

export function keBackup(d: DataAplikasi): BackupData {
  return {
    version: d.version,
    disimpanPada: stempelWaktu(),
    menus: d.menus,
    pesanan: d.pesanan,
    tugas: d.tugas,
    aturan: d.aturan,
    aktivitas: d.aktivitas,
  };
}
