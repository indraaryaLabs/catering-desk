import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  CalendarDays,
  ClipboardCopy,
  Copy,
  Info,
  MessageCircle,
  Pencil,
  Printer,
  Repeat2,
  Trash2,
  Truck,
  User,
} from 'lucide-react';
import type { MenuItem, Pesanan, StatusPesanan } from '../types';
import { LABEL_KATEGORI, LABEL_STATUS, ULUTAN_STATUS } from '../types';
import {
  aksiStatus,
  persenDP,
  sisaBayar,
  statusPembayaranPesanan,
  totalPesanan,
  totalPorsi,
} from '../lib/pesanan';
import { rupiah } from '../lib/format';
import { labelRelatif, tanggalPanjang, tanggalRingkas } from '../lib/tanggal';
import { salinKePapanKlip } from '../lib/router';
import { SEMUA_DRAF, LABEL_DRAF, drafDisarankan, susunDraf, tautanWhatsApp } from '../lib/pesan';
import type { JenisDraf } from '../lib/pesan';
import { Dialog } from './Dialog';
import { Lencana, LencanaBayar, LencanaStatus } from './atom';
import { useKirimNotif } from './Notifikasi';

interface Properti {
  pesanan: Pesanan | null;
  menus: MenuItem[];
  hariIni: string;
  tutup: () => void;
  onUbah: (p: Pesanan) => void;
  onStatus: (id: string, s: StatusPesanan) => void;
  onHapus: (p: Pesanan) => void;
  onUlang: (p: Pesanan) => void;
}

export function DetailPesanan({
  pesanan,
  menus,
  hariIni,
  tutup,
  onUbah,
  onStatus,
  onHapus,
  onUlang,
}: Properti): ReactNode {
  const notif = useKirimNotif();
  const [jenisDraf, setJenisDraf] = useState<JenisDraf | null>(null);

  const draf = useMemo(
    () => (jenisDraf === null || pesanan === null ? null : susunDraf(jenisDraf, pesanan, menus)),
    [jenisDraf, pesanan, menus],
  );

  if (pesanan === null) return null;

  const total = totalPesanan(pesanan);
  const sisa = sisaBayar(pesanan);
  const bayar = statusPembayaranPesanan(pesanan);
  const aksi = aksiStatus(pesanan.status);
  const posisi = ULUTAN_STATUS.indexOf(pesanan.status);
  const hariMenuju = labelRelatif(pesanan.tanggalAcara, hariIni);
  const drafAnjuran = drafDisarankan(pesanan, Math.round((new Date(pesanan.tanggalAcara).getTime() - new Date(hariIni).getTime()) / 86_400_000));

  const salin = async (teks: string) => {
    const berhasil = await salinKePapanKlip(teks);
    notif(berhasil ? 'Teks berhasil disalin ke papan klip.' : 'Papan klip tidak dapat diakses.', berhasil ? 'sukses' : 'galat');
  };

  return (
    <Dialog
      terbuka
      judul={`${pesanan.kode} · ${pesanan.namaPelanggan}`}
      sub={`${pesanan.jenisAcara} — ${tanggalPanjang(pesanan.tanggalAcara)}, ${pesanan.jamAcara}`}
      ukuran="lebar"
      tutup={tutup}
      kaki={
        <>
          <button type="button" className="tombol bahaya datar" onClick={() => onHapus(pesanan)}>
            <Trash2 size={15} aria-hidden="true" />
            Hapus
          </button>
          <div className="grup-kanan" style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="tombol datar" onClick={() => onUlang(pesanan)}>
              <Repeat2 size={15} aria-hidden="true" />
              Pesan lagi
            </button>
            <button type="button" className="tombol utama" onClick={() => onUbah(pesanan)}>
              <Pencil size={15} aria-hidden="true" />
              Ubah
            </button>
          </div>
        </>
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <LencanaStatus status={pesanan.status} />
        <LencanaBayar status={bayar} />
        <Lencana nada="netral">{totalPorsi(pesanan).toLocaleString('id-ID')} porsi</Lencana>
        <span style={{ marginLeft: 'auto', fontSize: 'var(--t-xl)', fontWeight: 640, letterSpacing: '-0.03em' }}>
          {rupiah(total)}
        </span>
      </div>

      <ol className="garis-waktu" aria-label="Tahap pesanan">
        {ULUTAN_STATUS.slice(0, 5).map((s, i) => (
          <li key={s} className={i === posisi ? 'aktif' : i < posisi ? 'lewat' : ''}>
            {LABEL_STATUS[s]}
          </li>
        ))}
      </ol>

      {aksi.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '14px 0 18px' }}>
          {aksi.map((a) => (
            <button
              key={a.status}
              type="button"
              className={`tombol ${a.nada === 'bahaya' ? 'bahaya datar' : 'datar'}`}
              onClick={() => onStatus(pesanan.id, a.status)}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid-2" style={{ marginBottom: 18 }}>
        <div>
          <p className="nav-label" style={{ padding: '0 0 6px' }}>
            Pengiriman
          </p>
          <dl className="daftar-definisi">
            <div>
              <dt>Pelanggan</dt>
              <dd>
                <User size={14} aria-hidden="true" />
                {pesanan.namaPelanggan}
              </dd>
            </div>
            <div>
              <dt>Kontak</dt>
              <dd>{pesanan.kontak === '' ? <span className="redup-2">tidak dicatat</span> : pesanan.kontak}</dd>
            </div>
            <div>
              <dt>Jadwal</dt>
              <dd>
                <CalendarDays size={14} aria-hidden="true" />
                {pesanan.jamAcara} · {hariMenuju}
              </dd>
            </div>
            <div>
              <dt>Pengantar</dt>
              <dd>
                <Truck size={14} aria-hidden="true" />
                {pesanan.pengantar === '' ? <span className="redup-2">ambil sendiri</span> : pesanan.pengantar}
              </dd>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <dt>Alamat</dt>
              <dd style={{ display: 'block' }}>{pesanan.alamat}</dd>
            </div>
          </dl>
        </div>

        <div>
          <p className="nav-label" style={{ padding: '0 0 6px' }}>
            Pembayaran
          </p>
          <dl className="daftar-definisi">
            <div>
              <dt>Total</dt>
              <dd>{rupiah(total)}</dd>
            </div>
            <div>
              <dt>DP tercatat</dt>
              <dd>{pesanan.dp === 0 ? <span className="redup-2">belum ada</span> : rupiah(pesanan.dp)}</dd>
            </div>
            <div>
              <dt>Sisa tagihan</dt>
              <dd className={sisa > 0 ? '' : ''}>{rupiah(sisa)}</dd>
            </div>
            <div>
              <dt>DP masuk</dt>
              <dd>{persenDP(pesanan)}%</dd>
            </div>
          </dl>
          {(pesanan.catatan !== '' || pesanan.catatanAntar !== '') && (
            <p className="catatan" style={{ marginTop: 10 }}>
              <Info size={13} aria-hidden="true" />
              <span>
                {pesanan.catatan}
                {pesanan.catatanAntar !== '' && <><br />Pengiriman: {pesanan.catatanAntar}</>}
              </span>
            </p>
          )}
        </div>
      </div>

      <h3 style={{ marginBottom: 8 }}>Rincian menu</h3>
      <div className="gulir">
        <table className="tabel">
          <thead>
            <tr>
              <th scope="col">Menu</th>
              <th scope="col">Kategori</th>
              <th scope="col" className="kanan">
                Porsi
              </th>
              <th scope="col" className="kanan">
                Harga / porsi
              </th>
              <th scope="col" className="kanan">
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody>
            {pesanan.items.map((i) => (
              <tr key={i.id}>
                <td data-label="Menu">{i.namaMenu}</td>
                <td data-label="Kategori" className="redup">
                  {LABEL_KATEGORI[i.kategori]}
                </td>
                <td data-label="Porsi" className="kanan num">
                  {i.jumlahPorsi}
                </td>
                <td data-label="Harga / porsi" className="kanan num">
                  {rupiah(i.hargaPerPorsi)}
                </td>
                <td data-label="Subtotal" className="kanan num tebal">
                  {rupiah(i.jumlahPorsi * i.hargaPerPorsi)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={2}>
                Total
              </th>
              <td className="kanan num tebal">{totalPorsi(pesanan)}</td>
              <td />
              <td className="kanan num tebal">{rupiah(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ------------------------- draf pesan ------------------------- */}
      <div className="kartu" style={{ marginTop: 18, background: 'var(--permukaan-2)', boxShadow: 'none' }}>
        <div className="kartu-kepala" style={{ padding: '12px 14px' }}>
          <div>
            <h2 style={{ fontSize: 'var(--t-base)' }}>Draf pesan pelanggan</h2>
            <p>Aplikasi tidak mengirim pesan. Anda menyalin atau membuka tautan WhatsApp.</p>
          </div>
          <div className="grup-tombol" role="group" aria-label="Pilih jenis draf">
            {SEMUA_DRAF.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={jenisDraf === d}
                title={LABEL_DRAF[d]}
                aria-label={LABEL_DRAF[d]}
                style={{ width: 'auto', padding: '0 8px', fontSize: 'var(--t-xs)' }}
                onClick={() => setJenisDraf(jenisDraf === d ? null : d)}
              >
                {LABEL_DRAF[d].split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {draf === null ? (
          <p className="petunjuk" style={{ padding: '0 14px 14px' }}>
            Rekomendasi untuk pesanan ini: <b>{LABEL_DRAF[drafAnjuran]}</b>. Pilih salah satu draf di atas.
          </p>
        ) : (
          <div style={{ padding: '0 14px 14px' }}>
            <textarea readOnly rows={7} value={draf.isi} aria-label={`Isi draf ${draf.judul}`} style={{ fontSize: 'var(--t-sm)' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <button type="button" className="tombol utama" onClick={() => void salin(draf.isi)}>
                <Copy size={15} aria-hidden="true" />
                Salin draf
              </button>
              {tautanWhatsApp(pesanan.kontak, draf.isi) !== null && (
                <a
                  className="tombol datar"
                  href={tautanWhatsApp(pesanan.kontak, draf.isi) ?? '#'}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <MessageCircle size={15} aria-hidden="true" />
                  Buka di WhatsApp
                </a>
              )}
              {tautanWhatsApp(pesanan.kontak, draf.isi) === null && (
                <Lencana nada="netral">
                  <ClipboardCopy size={12} aria-hidden="true" />
                  Nomor kontak belum diisi
                </Lencana>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="tombol-baris tanpa-cetak" style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        <button type="button" className="tombol datar" onClick={() => window.print()}>
          <Printer size={15} aria-hidden="true" />
          Cetak halaman
        </button>
      </div>

      <p className="catatan" style={{ marginTop: 12 }}>
        <Info size={13} aria-hidden="true" />
        <span>
          DP dicatat manual. Aplikasi tidak memproses pembayaran, tidak mengirim pesan otomatis, dan
          tidak terhubung ke layanan luar.
        </span>
      </p>
    </Dialog>
  );
}

/** Baris ringkas pesanan untuk daftar. */
export function RingkasPesanan({ p, hariIni }: { p: Pesanan; hariIni: string }): string {
  return `${p.kode} · ${tanggalRingkas(p.tanggalAcara)} · ${labelRelatif(p.tanggalAcara, hariIni)}`;
}
