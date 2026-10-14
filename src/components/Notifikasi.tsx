import { createContext, useCallback, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import type { Notifikasi, JenisNotif } from '../state/toko';
import { useToko } from '../state/toko';

const Konteks = createContext<{
  notifikasi: Notifikasi[];
  beri: (teks: string, jenis?: JenisNotif) => void;
  buang: (id: string) => void;
} | null>(null);

const IKON: Record<JenisNotif, ReactNode> = {
  sukses: <CheckCircle2 size={16} aria-hidden="true" />,
  galat: <XCircle size={16} aria-hidden="true" />,
  info: <Info size={16} aria-hidden="true" />,
  peringatan: <AlertTriangle size={16} aria-hidden="true" />,
};

const JUDUL: Record<JenisNotif, string> = {
  sukses: 'Berhasil',
  galat: 'Gagal',
  info: 'Informasi',
  peringatan: 'Perhatian',
};

export function NotifikasiProvider({ children }: { children: ReactNode }): ReactNode {
  const { notifikasi, beriNotifikasi, buangNotifikasi } = useToko();

  const nilai = useMemo(
    () => ({ notifikasi, beri: beriNotifikasi, buang: buangNotifikasi }),
    [notifikasi, beriNotifikasi, buangNotifikasi],
  );

  return (
    <Konteks.Provider value={nilai}>
      {children}
      <div className="notif-wadah" role="status" aria-live="polite">
        {notifikasi.map((n) => (
          <div key={n.id} className={`notif notif-${n.jenis}`}>
            <span className="notif-ikon">{IKON[n.jenis]}</span>
            <span className="notif-teks">
              <b>{JUDUL[n.jenis]}</b>
              <span>{n.teks}</span>
            </span>
            <button
              type="button"
              className="ikon-tombol"
              style={{ width: 24, height: 24, marginLeft: 'auto' }}
              onClick={() => buangNotifikasi(n.id)}
              aria-label="Tutup notifikasi"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </Konteks.Provider>
  );
}

export function useNotif(): {
  notifikasi: Notifikasi[];
  beri: (teks: string, jenis?: JenisNotif) => void;
  buang: (id: string) => void;
} {
  const k = useContext(Konteks);
  if (k === null) throw new Error('useNotif harus dipakai di dalam NotifikasiProvider.');
  return k;
}

export function useKirimNotif(): (teks: string, jenis?: JenisNotif) => void {
  const { beriNotifikasi } = useToko();
  return useCallback((teks: string, jenis: JenisNotif = 'sukses') => beriNotifikasi(teks, jenis), [beriNotifikasi]);
}