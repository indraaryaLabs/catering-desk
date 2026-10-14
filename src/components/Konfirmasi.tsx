import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog } from './Dialog';

export interface OpsiKonfirmasi {
  judul: string;
  pesan: string;
  detail?: string;
  labelYa?: string;
  labelBatal?: string;
  merusak?: boolean;
}

interface KonteksKonfirmasi {
  konfirmasi: (opsi: OpsiKonfirmasi) => Promise<boolean>;
}

const Konteks = createContext<KonteksKonfirmasi | null>(null);

interface Antrean {
  opsi: OpsiKonfirmasi;
  selesai: (jawaban: boolean) => void;
}

export function KonfirmasiProvider({ children }: { children: ReactNode }): ReactNode {
  const [antrean, setAntrean] = useState<Antrean | null>(null);

  const konfirmasi = useCallback(
    (opsi: OpsiKonfirmasi) => new Promise<boolean>((selesai) => setAntrean({ opsi, selesai })),
    [],
  );

  const jawab = useCallback((jawaban: boolean) => {
    setAntrean((sekarang) => {
      sekarang?.selesai(jawaban);
      return null;
    });
  }, []);

  const nilai = useMemo(() => ({ konfirmasi }), [konfirmasi]);

  return (
    <Konteks.Provider value={nilai}>
      {children}
      {antrean !== null && (
        <Dialog
          terbuka
          judul={antrean.opsi.judul}
          sub={antrean.opsi.pesan}
          ukuran="kecil"
          tutup={() => jawab(false)}
          labelTutup="Batal dan tutup"
          kaki={
            <>
              <button type="button" className="tombol datar" onClick={() => jawab(false)}>
                {antrean.opsi.labelBatal ?? 'Batal'}
              </button>
              <button
                type="button"
                data-fokus-awal="true"
                className={`tombol ${antrean.opsi.merusak === true ? 'bahaya' : 'utama'}`}
                onClick={() => jawab(true)}
              >
                {antrean.opsi.labelYa ?? 'Ya, lanjutkan'}
              </button>
            </>
          }
        >
          {antrean.opsi.merusak === true && (
            <p className="catatan-hati" style={{ marginBottom: 10 }}>
              <AlertTriangle size={15} aria-hidden="true" />
              <span>Tindakan ini tidak bisa dibatalkan, tetapi Anda dapat menekan Ctrl+Z untuk mengembalikannya.</span>
            </p>
          )}
          {antrean.opsi.detail !== undefined && (
            <p className="petunjuk" style={{ lineHeight: 1.6 }}>
              {antrean.opsi.detail}
            </p>
          )}
        </Dialog>
      )}
    </Konteks.Provider>
  );
}

export function useKonfirmasi(): KonteksKonfirmasi {
  const k = useContext(Konteks);
  if (k === null) throw new Error('useKonfirmasi harus dipakai di dalam KonfirmasiProvider.');
  return k;
}