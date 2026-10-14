import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CornerDownLeft, Search } from 'lucide-react';
import { normalisasi } from '../lib/format';

export interface Perintah {
  id: string;
  label: string;
  grup: string;
  ikon?: ReactNode;
  pintasan?: string;
  /** Teks tambahan yang dicari tapi tidak ditampilkan. */
  cari?: string;
  jalankan: () => void;
}

interface Properti {
  terbuka: boolean;
  perintah: Perintah[];
  tutup: () => void;
}

/**
 * Palet perintah (⌘K / Ctrl+K).
 *
 * Semua tindakan aplikasi dapat dijangkau dari sini atau lewat pintasan
 * keyboard, sehingga aplikasi bisa dipakai tanpa mouse.
 */
export function PaletPerintah({ terbuka, perintah, tutup }: Properti): ReactNode {
  const [kueri, setKueri] = useState('');
  const [sorot, setSorot] = useState(0);
  const daftarRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (terbuka) {
      setKueri('');
      setSorot(0);
    }
  }, [terbuka]);

  const hasil = useMemo(() => {
    const k = normalisasi(kueri);
    if (k === '') return perintah;
    return perintah.filter((p) => normalisasi(`${p.label} ${p.grup} ${p.cari ?? ''}`).includes(k));
  }, [perintah, kueri]);

  useEffect(() => {
    setSorot(0);
  }, [kueri]);

  useEffect(() => {
    if (!terbuka) return;
    const padaTombol = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        tutup();
      }
    };
    document.addEventListener('keydown', padaTombol);
    return () => document.removeEventListener('keydown', padaTombol);
  }, [terbuka, tutup]);

  if (!terbuka) return null;

  const jalankan = (p: Perintah | undefined) => {
    if (p === undefined) return;
    tutup();
    p.jalankan();
  };

  const grupTerlihat: Array<{ grup: string; item: Perintah[] }> = [];
  for (const p of hasil) {
    const terakhir = grupTerlihat[grupTerlihat.length - 1];
    if (terakhir !== undefined && terakhir.grup === p.grup) terakhir.item.push(p);
    else grupTerlihat.push({ grup: p.grup, item: [p] });
  }

  return (
    <div className="palet" onMouseDown={(e) => e.target === e.currentTarget && tutup()}>
      <div className="palet-kotak" role="dialog" aria-modal="true" aria-label="Palet perintah">
        <div className="palet-cari">
          <Search size={17} aria-hidden="true" style={{ color: 'var(--redup-2)' }} />
          <input
            data-fokus-awal="true"
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="palet-daftar"
            aria-activedescendant={sorot > 0 && hasil[sorot - 1] !== undefined ? `palet-${hasil[sorot - 1].id}` : undefined}
            aria-label="Cari perintah"
            value={kueri}
            autoComplete="off"
            spellCheck={false}
            placeholder="Cari perintah atau halaman…"
            onChange={(e) => setKueri(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSorot((s) => Math.min(hasil.length - 1, s + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSorot((s) => Math.max(0, s - 1));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                jalankan(hasil[sorot]);
              }
            }}
          />
          <span className="kbd">Esc</span>
        </div>

        <ul className="palet-daftar" id="palet-daftar" ref={daftarRef} role="listbox" aria-label="Daftar perintah">
          {hasil.length === 0 && (
            <li className="petunjuk" style={{ padding: '18px 12px', textAlign: 'center' }}>
              Tidak ada perintah yang cocok dengan “{kueri}”.
            </li>
          )}
          {grupTerlihat.map((g) => (
            <li key={g.grup} role="presentation">
              <p
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--redup-2)',
                  padding: '8px 10px 4px',
                }}
              >
                {g.grup}
              </p>
              <ul role="group" aria-label={g.grup}>
                {g.item.map((p) => {
                  const indeks = hasil.indexOf(p);
                  return (
                    <li key={p.id} role="presentation">
                      <button
                        type="button"
                        id={`palet-${p.id}`}
                        role="option"
                        aria-selected={indeks === sorot}
                        className="palet-item"
                        data-aktif={indeks === sorot}
                        onMouseEnter={() => setSorot(indeks)}
                        onClick={() => jalankan(p)}
                      >
                        {p.ikon !== undefined && <span aria-hidden="true">{p.ikon}</span>}
                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.label}
                        </span>
                        {p.pintasan !== undefined && <span className="kbd">{p.pintasan}</span>}
                        {indeks === sorot && <CornerDownLeft size={13} aria-hidden="true" style={{ opacity: 0.6 }} />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>

        <div className="palet-kaki">
          <span>
            <span className="kbd">↑</span> <span className="kbd">↓</span> navigasi
          </span>
          <span>
            <span className="kbd">↵</span> jalankan
          </span>
          <span>
            <span className="kbd">Esc</span> tutup
          </span>
        </div>
      </div>
    </div>
  );
}