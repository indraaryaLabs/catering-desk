import { useCallback, useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export interface PropertiDialog {
  terbuka: boolean;
  judul: string;
  sub?: string;
  ukuran?: 'kecil' | 'sedang' | 'lebar' | 'luar-lebar';
  tutup: () => void;
  children: ReactNode;
  kaki?: ReactNode;
  labelTutup?: string;
}

/**
 * Dialog yang bisa diakses: menahan fokus di dalam, menutup dengan Escape,
 * mengunci gulir latar, dan mengembalikan fokus ke pemicu saat ditutup.
 */
export function Dialog({
  terbuka,
  judul,
  sub,
  ukuran = 'sedang',
  tutup,
  children,
  kaki,
  labelTutup = 'Tutup dialog',
}: PropertiDialog): ReactNode {
  const kotak = useRef<HTMLDivElement>(null);
  const pemicu = useRef<Element | null>(null);
  const idJudul = useId();

  const padaTombol = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        tutup();
        return;
      }
      if (event.key !== 'Tab' || kotak.current === null) return;
      const bisa = kotak.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (bisa.length === 0) return;
      const pertama = bisa[0];
      const terakhir = bisa[bisa.length - 1];
      if (event.shiftKey && document.activeElement === pertama) {
        event.preventDefault();
        terakhir.focus();
      } else if (!event.shiftKey && document.activeElement === terakhir) {
        event.preventDefault();
        pertama.focus();
      }
    },
    [tutup],
  );

  useEffect(() => {
    if (!terbuka) return;
    pemicu.current = document.activeElement;
    document.addEventListener('keydown', padaTombol, true);
    const gulirAsal = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const jeda = window.setTimeout(() => {
      kotak.current
        ?.querySelector<HTMLElement>('[data-fokus-awal], input:not([type=hidden]), textarea, select, button')
        ?.focus();
    }, 30);
    return () => {
      document.removeEventListener('keydown', padaTombol, true);
      document.body.style.overflow = gulirAsal;
      window.clearTimeout(jeda);
      if (pemicu.current instanceof HTMLElement) pemicu.current.focus();
    };
  }, [terbuka, padaTombol]);

  if (!terbuka) return null;

  const kelasUkuran =
    ukuran === 'kecil' ? '' : ukuran === 'lebar' ? 'lebar' : ukuran === 'luar-lebar' ? 'luar-lebar' : '';

  return (
    <div className="lapisan" onMouseDown={(e) => e.target === e.currentTarget && tutup()}>
      <div
        className={`dialog ${kelasUkuran}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idJudul}
        ref={kotak}
      >
        <header className="dialog-kepala">
          <div style={{ minWidth: 0 }}>
            <h2 id={idJudul}>{judul}</h2>
            {sub !== undefined && <p className="dialog-sub">{sub}</p>}
          </div>
          <button type="button" className="ikon-tombol" onClick={tutup} aria-label={labelTutup}>
            <X size={17} aria-hidden="true" />
          </button>
        </header>
        <div className="dialog-isi">{children}</div>
        {kaki !== undefined && <footer className="dialog-kaki">{kaki}</footer>}
      </div>
    </div>
  );
}