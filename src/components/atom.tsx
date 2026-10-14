import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { StatusPesanan } from '../types';
import { LABEL_STATUS } from '../types';
import type { Prioritas, StatusPembayaran } from '../lib/pesanan';
import { LABEL_PEMBAYARAN } from '../lib/pesanan';
import { inisial } from '../lib/format';

export type Nada = 'merek' | 'sukses' | 'peringatan' | 'bahaya' | 'info' | 'netral';

const NADA_STATUS: Record<StatusPesanan, Nada> = {
  inquiry: 'info',
  dikonfirmasi: 'merek',
  persiapan: 'peringatan',
  siap: 'sukses',
  selesai: 'netral',
  dibatalkan: 'bahaya',
};

export function Lencana({ nada, children, titik }: { nada: Nada; children: ReactNode; titik?: boolean }): ReactNode {
  return (
    <span className={`lencana nada-${nada}`}>
      {titik === true && <i className="titik" aria-hidden="true" />}
      {children}
    </span>
  );
}

export function LencanaStatus({ status }: { status: StatusPesanan }): ReactNode {
  return (
    <Lencana nada={NADA_STATUS[status]} titik>
      {LABEL_STATUS[status]}
    </Lencana>
  );
}

const NADA_BAYAR: Record<StatusPembayaran, Nada> = {
  belum: 'bahaya',
  sebagian: 'peringatan',
  lunas: 'sukses',
};

export function LencanaBayar({ status }: { status: StatusPembayaran }): ReactNode {
  return <Lencana nada={NADA_BAYAR[status]}>{LABEL_PEMBAYARAN[status]}</Lencana>;
}

const NADA_PRIORITAS: Record<Prioritas, Nada> = { tinggi: 'bahaya', sedang: 'peringatan', rendah: 'netral' };
export const LABEL_PRIORITAS: Record<Prioritas, string> = { tinggi: 'Tinggi', sedang: 'Sedang', rendah: 'Rendah' };

export function LencanaPrioritas({ prioritas }: { prioritas: Prioritas }): ReactNode {
  return <Lencana nada={NADA_PRIORITAS[prioritas]}>{LABEL_PRIORITAS[prioritas]}</Lencana>;
}

export function Avatar({ nama, merek }: { nama: string; merek?: boolean }): ReactNode {
  return (
    <span className={`avatar${merek === true ? ' avatar-merek' : ''}`} aria-hidden="true">
      {inisial(nama)}
    </span>
  );
}

interface MetrikProps {
  label: string;
  nilai: string;
  sisa?: string;
  ikon?: ReactNode;
  nada?: Nada;
}

export function Metrik({ label, nilai, sisa, ikon, nada = 'netral' }: MetrikProps): ReactNode {
  return (
    <article className="metrik" data-nada={nada}>
      <p className="label">
        {ikon !== undefined && <span aria-hidden="true">{ikon}</span>}
        {label}
      </p>
      <p className="nilai">{nilai}</p>
      {sisa !== undefined && <p className="sisa">{sisa}</p>}
    </article>
  );
}

interface MetrikUtamaProps {
  label: string;
  nilai: string;
  sisa?: string;
  children?: ReactNode;
}

export function MetrikUtama({ label, nilai, sisa, children }: MetrikUtamaProps): ReactNode {
  return (
    <section className="metrik-utama">
      <p className="label">{label}</p>
      <p className="nilai">{nilai}</p>
      {sisa !== undefined && <p className="sisa">{sisa}</p>}
      {children}
    </section>
  );
}

export interface Tren {
  arah: 'naik' | 'turun' | 'datar';
  teks: string;
}

/** Indikator perubahan; warna tidak pernah jadi satu-satunya pembawa informasi. */
export function TrenBadge({ tren, nada }: { tren: Tren; nada?: Nada }): ReactNode {
  const warna = nada ?? (tren.arah === 'naik' ? 'sukses' : tren.arah === 'turun' ? 'bahaya' : 'netral');
  const Ikon = tren.arah === 'naik' ? ArrowUpRight : tren.arah === 'turun' ? ArrowDownRight : Minus;
  return (
    <Lencana nada={warna}>
      <Ikon size={12} aria-hidden="true" />
      {tren.teks}
    </Lencana>
  );
}

interface KosongProps {
  ikon: ReactNode;
  judul: string;
  pesan: string;
  aksi?: ReactNode;
}

export function Kosong({ ikon, judul, pesan, aksi }: KosongProps): ReactNode {
  return (
    <div className="kosong">
      <span className="kosong-ikon" aria-hidden="true">
        {ikon}
      </span>
      <h3>{judul}</h3>
      <p>{pesan}</p>
      {aksi !== undefined && <div className="kosong-aksi">{aksi}</div>}
    </div>
  );
}

export function Kartu({
  judul,
  sub,
  aksi,
  children,
  className = '',
  tanpaPad,
}: {
  judul?: string;
  sub?: string;
  aksi?: ReactNode;
  children: ReactNode;
  className?: string;
  tanpaPad?: boolean;
}): ReactNode {
  const adaKepala = judul !== undefined || aksi !== undefined;
  return (
    <section className={`kartu ${className}`}>
      {adaKepala && (
        <header className="kartu-kepala">
          <div>
            {judul !== undefined && <h2>{judul}</h2>}
            {sub !== undefined && <p>{sub}</p>}
          </div>
          {aksi}
        </header>
      )}
      <div className={tanpaPad === true ? '' : 'kartu-isi'}>{children}</div>
    </section>
  );
}

export function Bilah({
  persen,
  nada,
  label,
}: {
  persen: number;
  nada?: 'ringan' | 'sedang' | 'berat' | 'penuh';
  label: string;
}): ReactNode {
  return (
    <div
      className="bilah"
      role="meter"
      aria-valuenow={Math.round(persen)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <i style={{ width: `${Math.min(100, Math.max(0, persen))}%` }} data-nada={nada} />
    </div>
  );
}
