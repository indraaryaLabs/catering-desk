import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useReducer, useState } from 'react';
import type { ReactNode } from 'react';
import type { BackupData, MenuItem, Pesanan, Preferensi, StatusPesanan, Tugas } from '../types';
import { evaluasiAturan } from '../lib/otomasi';
import { idBaru } from '../lib/kode';
import { hariIni, stempelWaktu } from '../lib/tanggal';
import { muatData, simpanData, simpanPreferensi, hapusDataTersimpan } from '../lib/storage';
import type { HasilMuat } from '../lib/storage';
import { bisaRedo, bisaUndo, keBackup, labelUndo, reducer, tokoAwal } from './reducer';
import type { Aksi, TokoState } from './reducer';

export type JenisNotif = 'sukses' | 'galat' | 'info' | 'peringatan';

export interface Notifikasi {
  id: string;
  teks: string;
  jenis: JenisNotif;
  /** Label aksi pembatal yang offered di dalam notifikasi. */
  batal?: string;
}

export type PemicuOtomasi = 'pesanan-ditambahkan' | 'status-berubah' | 'pesanan-diubah';

interface KonteksToko {
  state: TokoState;
  data: TokoState['data'];
  hariIni: string;
  kirim: (aksi: Aksi) => void;
  /** Kirim aksi lalu jalankan mesin otomatisasi secara berurutan. */
  kirimOtomatis: (aksi: Aksi, pemicu?: PemicuOtomasi) => void;
  notifikasi: Notifikasi[];
  beriNotifikasi: (teks: string, jenis?: JenisNotif) => void;
  buangNotifikasi: (id: string) => void;
  bisaUndo: boolean;
  bisaRedo: boolean;
  labelUndo: string | null;
  undo: () => void;
  redo: () => void;
  resetDemo: () => void;
  imporData: (backup: BackupData) => void;
  setPreferensi: (p: Preferensi) => void;
  catatanPemuat: string | null;
  sumberData: HasilMuat['sumber'];
  cariPesanan: (id: string) => Pesanan | undefined;
  cariMenu: (id: string) => MenuItem | undefined;
  tersimpanPada: string;
  /** Ringkasan singkat aksi otomatis terakhir untuk ditampilkan. */
  eksekusiTerakhir: string[];
}

const TokoContext = createContext<KonteksToko | null>(null);

export function TokoProvider({ children }: { children: ReactNode }): ReactNode {
  const muatan = useRef<HasilMuat | null>(null);
  if (muatan.current === null) muatan.current = muatData(hariIni());

  const [state, dispatch] = useReducer(reducer, undefined, () => tokoAwal(muatan.current!.data));
  const [notifikasi, setNotifikasi] = useState<Notifikasi[]>([]);
  const [tersimpanPada, setTersimpanPada] = useState(() => new Date().toISOString());
  const [eksekusiTerakhir, setEksekusiTerakhir] = useState<string[]>([]);

  /* --------------------------- persistensi --------------------------- */
  useEffect(() => {
    if (simpanData(keBackup(state.data))) setTersimpanPada(new Date().toISOString());
  }, [state.data]);

  useEffect(() => {
    simpanPreferensi(state.data.preferensi);
  }, [state.data.preferensi]);

  /* ---------------------------- notifikasi --------------------------- */
  const buangNotifikasi = useCallback((id: string) => {
    setNotifikasi((daftar) => daftar.filter((n) => n.id !== id));
  }, []);

  const beriNotifikasi = useCallback(
    (teks: string, jenis: JenisNotif = 'sukses') => {
      const id = idBaru('nt');
      setNotifikasi((daftar) => [...daftar.slice(-3), { id, teks, jenis }]);
      window.setTimeout(() => buangNotifikasi(id), jenis === 'galat' ? 7_000 : 4_000);
    },
    [buangNotifikasi],
  );

  /* ----------------------------- dispatch ---------------------------- */
  const kirim = useCallback((aksi: Aksi) => dispatch(aksi), []);

  /**
   * Otomatasi dijalankan **serempak** dengan aksi utama: bentuk akhir pesanan
   * dihitung di sini, aturan dievaluasi, lalu hasilnya dispatch berurutan.
   * Dengan begitu tidak ada pembacaan state yang basi.
   */
  const kirimOtomatis = useCallback(
    (aksi: Aksi, pemicu: PemicuOtomasi = 'pesanan-ditambahkan') => {
      dispatch(aksi);

      const idTarget =
        aksi.tipe === 'pesanan/tambah'
          ? aksi.pesanan.id
          : aksi.tipe === 'pesanan/ubah'
            ? aksi.pesanan.id
            : aksi.tipe === 'pesanan/status'
              ? aksi.id
              : null;
      
      if (idTarget === null) return;

      const sebelum = state.data.pesanan.find((p) => p.id === idTarget) ?? null;

      const sesudah: Pesanan | null =
        aksi.tipe === 'pesanan/tambah' || aksi.tipe === 'pesanan/ubah'
          ? aksi.pesanan
          : aksi.tipe === 'pesanan/status' && sebelum !== null
            ? { ...sebelum, status: aksi.status, diperbaruiPada: stempelWaktu() }
            : null;
      if (sesudah === null || state.data.aturan.length === 0) return;

      const hasil = evaluasiAturan(
        state.data.aturan,
        sesudah,
        { hariIni: hariIni(), pesanan: state.data.pesanan },
        pemicu,
        sebelum?.status ?? null,
      );
      if (hasil.eksekusi.length === 0) return;

      const tugasBaru: Tugas[] = [];
      const perubahanStatus: Array<{ id: string; status: StatusPesanan }> = [];

      for (const x of hasil.eksekusi) {
        if (x.tugas !== null) {
          tugasBaru.push({ ...x.tugas, id: idBaru('tg'), dibuatPada: stempelWaktu() });
        }
        if (x.statusBaru !== null) perubahanStatus.push({ id: x.pesananId, status: x.statusBaru });
      }

      for (const t of tugasBaru) dispatch({ tipe: 'tugas/tambah', tugas: t });
      if (perubahanStatus.length > 0) {
        dispatch({ tipe: 'pesanan/status-banyak', perubahan: perubahanStatus });
      }
      dispatch({
        tipe: 'aturan/simpan',
        aturan: {
          ...state.data.aturan.find((a) => a.id === hasil.eksekusi[0]?.aturanId)!,
          eksekusi: (state.data.aturan.find((a) => a.id === hasil.eksekusi[0]?.aturanId)?.eksekusi ?? 0) + 1,
        },
        hanyaHitung: true,
      });

      const ringkas = hasil.eksekusi.map((x) => x.ringkas);
      setEksekusiTerakhir(ringkas);
      beriNotifikasi(`Otomasi: ${ringkas[0]}${ringkas.length > 1 ? ` (+${ringkas.length - 1} lainnya)` : ''}`, 'info');
    },
    [state.data.aturan, state.data.pesanan, beriNotifikasi],
  );

  /* ------------------------------- undo ------------------------------ */
  const undo = useCallback(() => {
    if (!bisaUndo(state.riwayat)) return;
    dispatch({ tipe: 'riwayat/undo' });
  }, [state.riwayat]);

  const redo = useCallback(() => {
    if (!bisaRedo(state.riwayat)) return;
    dispatch({ tipe: 'riwayat/redo' });
  }, [state.riwayat]);

  /* ------------------------------ lainnya ---------------------------- */
  const resetDemo = useCallback(() => {
    hapusDataTersimpan();
    dispatch({ tipe: 'data/reset', acuan: hariIni() });
    setEksekusiTerakhir([]);
  }, []);

  const imporData = useCallback((backup: BackupData) => dispatch({ tipe: 'data/impor', backup }), []);

  const setPreferensi = useCallback(
    (p: Preferensi) => dispatch({ tipe: 'data/preferensi', preferensi: p }),
    [],
  );

  const nilai = useMemo<KonteksToko>(
    () => ({
      state,
      data: state.data,
      hariIni: hariIni(),
      kirim,
      kirimOtomatis,
      notifikasi,
      beriNotifikasi,
      buangNotifikasi,
      bisaUndo: bisaUndo(state.riwayat),
      bisaRedo: bisaRedo(state.riwayat),
      labelUndo: labelUndo(state.riwayat),
      undo,
      redo,
      resetDemo,
      imporData,
      setPreferensi,
      catatanPemuat: muatan.current?.pesan ?? null,
      sumberData: muatan.current?.sumber ?? 'baru',
      cariPesanan: (id) => state.data.pesanan.find((p) => p.id === id),
      cariMenu: (id) => state.data.menus.find((m) => m.id === id),
      tersimpanPada,
      eksekusiTerakhir,
    }),
    [
      state,
      notifikasi,
      tersimpanPada,
      eksekusiTerakhir,
      kirim,
      kirimOtomatis,
      beriNotifikasi,
      buangNotifikasi,
      undo,
      redo,
      resetDemo,
      imporData,
      setPreferensi,
    ],
  );

  return <TokoContext.Provider value={nilai}>{children}</TokoContext.Provider>;
}

export function useToko(): KonteksToko {
  const k = useContext(TokoContext);
  if (k === null) throw new Error('useToko harus dipakai di dalam TokoProvider.');
  return k;
}

export type { Aksi, TokoState };