import { useId } from 'react';
import type { ReactNode } from 'react';

/**
 * Grafik SVG ringkas yang digambar langsung dari data.
 *
 * Semua nilai di sini berasal dari state aplikasi — tidak ada angka contoh,
 * tidak ada placeholder, dan tidak ada sumber data eksternal.
 */

const PALET = [
  'var(--merek)',
  'var(--info)',
  'var(--sukses)',
  'var(--peringatan)',
  'var(--bahaya)',
  'var(--netral)',
];

export function warnaSeri(i: number): string {
  return PALET[i % PALET.length] ?? 'var(--merek)';
}

/* ============================== Batang ============================== */

export interface TitikBar {
  label: string;
  nilai: number;
  /** Nilai pembanding, misalnya periode sebelumnya. */
  banding?: number;
  meta?: string;
}

interface GrafikBarProps {
  data: TitikBar[];
  tinggi?: number;
  format: (n: number) => string;
  judul: string;
}

export function GrafikBar({ data, tinggi = 160, format, judul }: GrafikBarProps): ReactNode {
  void tinggi;
  const idGradien = 'gbar';
  void useId;
  if (data.length === 0) return <p className="petunjuk">Belum ada data untuk ditampilkan.</p>;

  const maks = Math.max(...data.map((d) => Math.max(d.nilai, d.banding ?? 0)), 1);
  const lebarTotal = 100;
  const lebarSlot = lebarTotal / data.length;
  const lebarBar = Math.min(34, lebarSlot * 0.56);

  return (
    <div>
      <svg className="grafik" viewBox={`0 0 ${lebarTotal} 46`} preserveAspectRatio="none" role="img" aria-label={judul}>
        <defs>
          <linearGradient id={`g-${idGradien}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--merek)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--merek)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} className="grafik-kisi" x1="0" y1={44 - f * 40} x2="100" y2={44 - f * 40} vectorEffect="non-scaling-stroke" />
        ))}
        {data.map((d, i) => {
          const tinggiBar = Math.max(1.2, (d.nilai / maks) * 40);
          const x = i * lebarSlot + (lebarSlot - lebarBar) / 2;
          const tinggiBanding = d.banding === undefined ? 0 : Math.max(1, (d.banding / maks) * 40);
          return (
            <g key={d.label}>
              <rect
                className="grafik-bar"
                x={x}
                y={44 - tinggiBar}
                width={lebarBar}
                height={tinggiBar}
                rx={1}
                fill={`url(#g-${idGradien})`}
              >
                <title>{`${d.label}: ${format(d.nilai)}${d.meta === undefined ? '' : ` · ${d.meta}`}`}</title>
              </rect>
              {d.banding !== undefined && (
                <rect
                  x={x}
                  y={44 - tinggiBanding}
                  width={lebarBar}
                  height={0.9}
                  fill="var(--redup-2)"
                  opacity="0.7"
                />
              )}
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', marginTop: 6 }}>
        {data.map((d) => (
          <span
            key={d.label}
            title={d.meta ?? d.label}
            style={{
              flex: `1 1 0`,
              minWidth: 0,
              textAlign: 'center',
              fontSize: 10,
              color: 'var(--redup-2)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              padding: '0 2px',
            }}
          >
            {d.label}
          </span>
        ))}
      </div>
      <p className="petunjuk" style={{ marginTop: 6 }}>
        Puncak {format(maks)}
      </p>
      <span className="sr-only">
        {judul}: {data.map((d) => `${d.label} ${format(d.nilai)}`).join(', ')}
      </span>
    </div>
  );
}

/* ============================== Garis =============================== */

export interface TitikGaris {
  label: string;
  nilai: number;
}

export function GrafikGaris({
  data,
  tinggi = 170,
  format,
  judul,
  warna = 'var(--merek)',
}: {
  data: TitikGaris[];
  tinggi?: number;
  format: (n: number) => string;
  judul: string;
  warna?: string;
}): ReactNode {
  const idGradien = 'gbar';
  void useId;
  if (data.length === 0) return <p className="petunjuk">Belum ada data untuk ditampilkan.</p>;

  const W = 100;
  const H = 46;
  const maks = Math.max(...data.map((d) => d.nilai), 1);
  const min = Math.min(...data.map((d) => d.nilai), 0);
  const rentang = Math.max(1, maks - min);

  const titik = data.map((d, i) => {
    const x = data.length === 1 ? W / 2 : (i / (data.length - 1)) * W;
    const y = H - 4 - ((d.nilai - min) / rentang) * (H - 10);
    return { ...d, x, y };
  });

  const jalur = titik.map((t, i) => `${i === 0 ? 'M' : 'L'}${t.x.toFixed(2)},${t.y.toFixed(2)}`).join(' ');
  const area = `${jalur} L${titik[titik.length - 1]?.x ?? 0},${H} L${titik[0]?.x ?? 0},${H} Z`;

  return (
    <div>
      <svg
        className="grafik"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ height: tinggi }}
        role="img"
        aria-label={judul}
      >
        <defs>
          <linearGradient id={`l-${idGradien}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={warna} stopOpacity="0.24" />
            <stop offset="100%" stopColor={warna} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} className="grafik-kisi" x1="0" y1={H * f} x2={W} y2={H * f} vectorEffect="non-scaling-stroke" />
        ))}
        <path d={area} fill={`url(#l-${idGradien})`} />
        <path
          d={jalur}
          fill="none"
          stroke={warna}
          strokeWidth="1.6"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {titik.map((t) => (
          <circle key={t.label} cx={t.x} cy={t.y} r="1.6" fill={warna}>
            <title>{`${t.label}: ${format(t.nilai)}`}</title>
          </circle>
        ))}
      </svg>
      <div style={{ display: 'flex', marginTop: 6 }}>
        {titik.map((t) => (
          <span
            key={t.label}
            style={{
              flex: '1 1 0',
              minWidth: 0,
              textAlign: 'center',
              fontSize: 10,
              color: 'var(--redup-2)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              padding: '0 2px',
            }}
          >
            {t.label}
          </span>
        ))}
      </div>
      <span className="sr-only">
        {judul}: {titik.map((t) => `${t.label} ${format(t.nilai)}`).join(', ')}
      </span>
    </div>
  );
}

/* ============================ Cincin ================================ */

export function Cincin({
  nilai,
  label,
  warna = 'var(--merek)',
  ukuran = 92,
  tebal = 9,
}: {
  nilai: number;
  label: string;
  warna?: string;
  ukuran?: number;
  tebal?: number;
}): ReactNode {
  const r = (ukuran - tebal) / 2;
  const keliling = 2 * Math.PI * r;
  const isi = Math.max(0, Math.min(100, nilai));

  return (
    <div style={{ display: 'grid', placeItems: 'center', position: 'relative', width: ukuran, height: ukuran }}>
      <svg width={ukuran} height={ukuran} role="img" aria-label={`${label}: ${Math.round(isi)} persen`}>
        <circle cx={ukuran / 2} cy={ukuran / 2} r={r} fill="none" stroke="var(--permukaan-3)" strokeWidth={tebal} />
        <circle
          cx={ukuran / 2}
          cy={ukuran / 2}
          r={r}
          fill="none"
          stroke={warna}
          strokeWidth={tebal}
          strokeLinecap="round"
          strokeDasharray={`${(keliling * isi) / 100} ${keliling}`}
          transform={`rotate(-90 ${ukuran / 2} ${ukuran / 2})`}
          style={{ transition: 'stroke-dasharray 420ms cubic-bezier(.22,.72,.28,1)' }}
        />
      </svg>
      <span
        style={{
          position: 'absolute',
          fontSize: ukuran > 80 ? 17 : 13,
          fontWeight: 650,
          letterSpacing: '-0.02em',
          fontVariantNumeric: 'tabular-nums',
          color: 'var(--tinta)',
        }}
      >
        {Math.round(isi)}%
      </span>
    </div>
  );
}

/* =========================== Mini bar ============================== */

/** Sparkline satu-dimensional untuk di dalam kartu metrik. */
export function MiniGaris({
  nilai,
  tinggi = 34,
  warna = 'var(--merek)',
  judul,
}: {
  nilai: number[];
  tinggi?: number;
  warna?: string;
  judul: string;
}): ReactNode {
  if (nilai.length < 2) return <span style={{ height: tinggi, display: 'block' }} />;
  const maks = Math.max(...nilai, 1);
  const W = 100;
  const H = 30;
  const titik = nilai.map((v, i) => ({
    x: (i / (nilai.length - 1)) * W,
    y: H - (v / maks) * (H - 4) - 2,
  }));
  const jalur = titik.map((t, i) => `${i === 0 ? 'M' : 'L'}${t.x.toFixed(1)},${t.y.toFixed(1)}`).join(' ');
  const akhir = titik[titik.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ height: tinggi, width: '100%' }}
      role="img"
      aria-label={judul}
    >
      <path d={`${jalur} L${W},${H} L0,${H} Z`} fill={warna} opacity="0.1" />
      <path d={jalur} fill="none" stroke={warna} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      {akhir !== undefined && <circle cx={akhir.x} cy={akhir.y} r="2" fill={warna} vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}

/* ======================== Progress bar list ========================= */

export interface BarisPorsi {
  label: string;
  nilai: number;
  warna?: string;
  meta?: string;
}

export function BarisPersentase({ data, format }: { data: BarisPorsi[]; format: (n: number) => string }): ReactNode {
  const total = data.reduce((n, d) => n + d.nilai, 0);
  if (total === 0) return <p className="petunjuk">Belum ada komposisi untuk ditampilkan.</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', height: 10, borderRadius: 99, overflow: 'hidden', background: 'var(--permukaan-3)' }}>
        {data.map((d, i) => (
          <span
            key={d.label}
            style={{ width: `${(d.nilai / total) * 100}%`, background: d.warna ?? warnaSeri(i) }}
            title={`${d.label}: ${format(d.nilai)}`}
          />
        ))}
      </div>
      <ul style={{ display: 'grid', gap: 7 }}>
        {data.map((d, i) => (
          <li key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--t-sm)' }}>
            <i style={{ width: 8, height: 8, borderRadius: 2, background: d.warna ?? warnaSeri(i), flex: '0 0 auto' }} />
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {d.label}
            </span>
            {d.meta !== undefined && <span className="redup-2 kecil">{d.meta}</span>}
            <span className="tebal" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {format(d.nilai)}
            </span>
            <span className="redup-2 kecil" style={{ width: 38, textAlign: 'right' }}>
              {Math.round((d.nilai / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
