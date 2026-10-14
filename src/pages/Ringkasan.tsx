import { useMemo } from 'react';
import type { ReactNode } from 'react';
import {
  ArrowRight,
  CalendarClock,
  ChefHat,
  CircleDollarSign,
  CircleAlert,
  ClipboardList,
  Eye,
  Plus,
  Printer,
  ListChecks,
} from 'lucide-react';
import type { Pesanan, StatusPesanan } from '../types';
import { useToko } from '../state/toko';
import {
  aksiUtama,
  pesananAktif,
  sisaBayar,
  statusPembayaranPesanan,
  tingkatBeban,
  LABEL_BEBAN,
  totalPorsi,
  totalPesanan,
} from '../lib/pesanan';
import { angka, rupiahRingkas } from '../lib/format';
import { labelRelatif, labelTenggat, tanggalPendek, selisihHari } from '../lib/tanggal';
import { Avatar, Bilah, Kartu, Kosong, Lencana, LencanaPrioritas, LencanaStatus, Metrik } from '../components/atom';
import { MiniGaris } from '../components/Grafik';
import { urutkanTugas } from '../lib/otomasi';

interface Properti {
  bukaDetail: (p: Pesanan) => void;
  bukaForm: (awal: Pesanan | null) => void;
  ubahStatus: (id: string, s: StatusPesanan) => void;
  toggleTugas: (id: string) => void;
  keLaporan: () => void;
}

export function HalamanRingkasan({
  bukaDetail,
  bukaForm,
  ubahStatus,
  toggleTugas,
  keLaporan,
}: Properti): ReactNode {
  const { data, hariIni } = useToko();

  const hariIniPesanan = useMemo(
    () =>
      data.pesanan
        .filter((p) => p.tanggalAcara === hariIni && pesananAktif(p))
        .sort((a, b) => a.jamAcara.localeCompare(b.jamAcara)),
    [data.pesanan, hariIni],
  );

  const porsiHariIni = useMemo(() => hariIniPesanan.reduce((n, p) => n + totalPorsi(p), 0), [hariIniPesanan]);
  const nilaiHariIni = useMemo(() => hariIniPesanan.reduce((n, p) => n + totalPesanan(p), 0), [hariIniPesanan]);

  const belumLunas = useMemo(
    () => data.pesanan.filter((p) => pesananAktif(p) && sisaBayar(p) > 0),
    [data.pesanan],
  );
  const totalTunggahan = belumLunas.reduce((n, p) => n + sisaBayar(p), 0);

  const segera = useMemo(
    () =>
      data.pesanan
        .filter((p) => {
          if (!pesananAktif(p) || p.status === 'selesai') return false;
          const d = selisihHari(hariIni, p.tanggalAcara);
          return d >= 0 && d <= 2;
        })
        .sort((a, b) => a.tanggalAcara.localeCompare(b.tanggalAcara)),
    [data.pesanan, hariIni],
  );

  const inquiry = useMemo(() => data.pesanan.filter((p) => p.status === 'inquiry'), [data.pesanan]);

  const tugas = useMemo(() => urutkanTugas(data.tugas.filter((t) => !t.selesai)).slice(0, 6), [data.tugas]);

  const trenPorsi = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const t = new Date(hariIni);
        t.setDate(t.getDate() - (13 - i));
        const iso = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
        return data.pesanan
          .filter((p) => p.tanggalAcara === iso && pesananAktif(p))
          .reduce((n, p) => n + totalPorsi(p), 0);
      }),
    [data.pesanan, hariIni],
  );

  const level = tingkatBeban(porsiHariIni, data.preferensi.ambangBeban);
  const persenBeban = Math.round((porsiHariIni / Math.max(1, data.preferensi.ambangBeban)) * 100);

  return (
    <div className="tumpuk">
      {/* ---------------- angka utama: satu pertanyaan, satu jawaban ---------------- */}
      <section
        className="kartu"
        style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 200px', gap: 20, alignItems: 'center' }}
      >
        <div>
          <p style={{ fontSize: 'var(--t-sm)', color: 'var(--redup)', fontWeight: 500 }}>
            Porsi yang harus disiapkan hari ini
          </p>
          <p
            style={{
              fontSize: 'var(--t-2xl)',
              fontWeight: 640,
              letterSpacing: '-0.04em',
              lineHeight: 1.02,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {angka(porsiHariIni)}
            <span style={{ fontSize: 'var(--t-lg)', fontWeight: 500, color: 'var(--redup)', marginLeft: 8 }}>
              porsi
            </span>
          </p>
          <p style={{ fontSize: 'var(--t-sm)', color: 'var(--redup)', marginTop: 6 }}>
            {hariIniPesanan.length} pesanan aktif · {rupiahRingkas(nilaiHariIni)} · {tanggalPendek(hariIni)}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            <Bilah persen={persenBeban} nada={level} label={`Beban dapur ${persenBeban} persen`} />
            <Lencana
              nada={
                level === 'ringan' ? 'sukses' : level === 'sedang' ? 'info' : level === 'berat' ? 'peringatan' : 'bahaya'
              }
            >
              Beban {LABEL_BEBAN[level]} · {persenBeban}% dari ambang {angka(data.preferensi.ambangBeban)}
            </Lencana>
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 'var(--t-xs)', color: 'var(--redup)', marginBottom: 4 }}>
            14 hari terakhir
          </p>
          <MiniGaris nilai={trenPorsi} judul="Porsi produksi 14 hari terakhir" />
          <p style={{ fontSize: 'var(--t-xs)', color: 'var(--redup)', marginTop: 2 }}>
            Rata-rata {angka(Math.round(trenPorsi.reduce((a, b) => a + b, 0) / 14))} porsi/hari
          </p>
        </div>
      </section>

      <section className="metrik-grid">
        <Metrik
          label="Pesanan hari ini"
          nilai={angka(hariIniPesanan.length)}
          sisa={`${angka(inquiry.length)} inquiry menunggu`}
          ikon={<ClipboardList size={13} />}
          nada="merek"
        />
        <Metrik
          label="Belum lunas"
          nilai={angka(belumLunas.length)}
          sisa={`Sisa tagihan ${rupiahRingkas(totalTunggahan)}`}
          ikon={<CircleDollarSign size={13} />}
          nada={belumLunas.length === 0 ? 'sukses' : 'peringatan'}
        />
        <Metrik
          label="Segera (≤2 hari)"
          nilai={angka(segera.length)}
          sisa={`${angka(segera.reduce((n, p) => n + totalPorsi(p), 0))} porsi akan datang`}
          ikon={<CalendarClock size={13} />}
          nada={segera.length === 0 ? 'netral' : 'merek'}
        />
        <Metrik
          label="Tugas terbuka"
          nilai={angka(data.tugas.filter((t) => !t.selesai).length)}
          sisa={data.tugas.filter((t) => !t.selesai && selisihHari(hariIni, t.batasWaktu) < 0).length > 0 ? 'Ada yang terlambat' : 'Semua tepat waktu'}
          ikon={<ListChecks size={13} />}
          nada="info"
        />
      </section>

      <div className="dua-kolom-kiri">
        {/* ------------------------------ run sheet ----------------------------- */}
        <Kartu
          judul="Run sheet hari ini"
          sub={`${hariIniPesanan.length} pesanan · diurutkan jam acara`}
          aksi={
            <button type="button" className="tombol datar" onClick={() => window.print()}>
              <Printer size={15} aria-hidden="true" />
              Cetak
            </button>
          }
          tanpaPad
        >
          {hariIniPesanan.length === 0 ? (
            <Kosong
              ikon={<ChefHat size={22} />}
              judul="Tidak ada acara hari ini"
              pesan="Dapur kosong. Manfaatkan hari ini untuk mengecek bahan dan menghubungi pelanggan yang akan datang minggu depan."
              aksi={
                <button type="button" className="tombol utama" onClick={() => bukaForm(null)}>
                  <Plus size={15} aria-hidden="true" />
                  Buat pesanan
                </button>
              }
            />
          ) : (
            <ul className="daftar" style={{ padding: '4px 16px 12px' }}>
              {hariIniPesanan.map((p) => {
                const lanjut = aksiUtama(p.status);
                return (
                  <li className="daftar-baris" key={p.id}>
                    <span className="num tebal" style={{ width: 46, fontSize: 'var(--t-base)' }}>
                      {p.jamAcara}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="tebal" style={{ fontSize: 'var(--t-base)' }}>
                        {p.namaPelanggan}
                      </p>
                      <p className="kecil redup">
                        {p.kode} · {p.items.map((i) => `${i.namaMenu} ${i.jumlahPorsi}p`).join(', ')}
                      </p>
                    </div>
                    <span className="kecil redup nowrap">{rupiahRingkas(totalPesanan(p))}</span>
                    <LencanaStatus status={p.status} />
                    <div style={{ display: 'flex', gap: 4 }}>
                      {lanjut !== undefined && (
                        <button
                          type="button"
                          className="tombol kecil datar"
                          onClick={() => ubahStatus(p.id, lanjut.status)}
                        >
                          {lanjut.label}
                        </button>
                      )}
                      <button
                        type="button"
                        className="ikon-tombol"
                        onClick={() => bukaDetail(p)}
                        aria-label={`Lihat detail ${p.kode}`}
                      >
                        <Eye size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Kartu>

        {/* ------------------------------- tugas ------------------------------- */}
        <div className="tumpuk">
          <Kartu judul="Tugas" sub="Dibuat otomatis atau oleh Anda">
            {tugas.length === 0 ? (
              <p className="petunjuk">
                Tidak ada tugas terbuka. Aturan otomatisasi dapat membuat tugas untuk Anda — buka
                halaman Otomasi.
              </p>
            ) : (
              <ul className="daftar">
                {tugas.map((t) => {
                  const terlambat = selisihHari(hariIni, t.batasWaktu) < 0;
                  return (
                    <li className="daftar-baris" key={t.id}>
                      <input
                        type="checkbox"
                        checked={t.selesai}
                        onChange={() => toggleTugas(t.id)}
                        aria-label={`Tandai selesai: ${t.judul}`}
                        style={{ width: 16, height: 16, accentColor: 'var(--merek)', flex: '0 0 auto', cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 'var(--t-base)', textDecoration: t.selesai ? 'line-through' : undefined }}>
                          {t.judul}
                        </p>
                        <p className="kecil redup">{t.detail}</p>
                      </div>
                      <div style={{ display: 'flex', gap: 5, flexDirection: 'column', alignItems: 'flex-end' }}>
                        <LencanaPrioritas prioritas={t.prioritas} />
                        <span className={`kecil ${terlambat ? '' : 'redup-2'}`} style={terlambat ? { color: 'var(--bahaya)' } : undefined}>
                          {labelTenggat(t.batasWaktu, hariIni)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Kartu>

          <Kartu judul="Perlu perhatian">
            {inquiry.length === 0 && segera.length === 0 ? (
              <p className="petunjuk">Tidak ada hal yang mendesak. Semua pesanan berjalan sesuai rencana.</p>
            ) : (
              <ul className="daftar-mini">
                {inquiry.slice(0, 4).map((p) => (
                  <li key={p.id}>
                    <button type="button" className="mini" onClick={() => bukaDetail(p)}>
                      <Avatar nama={p.namaPelanggan} merek />
                      <span className="mini-teks">
                        <b>{p.namaPelanggan}</b>
                        <small>
                          Inquiry {rupiahRingkas(totalPesanan(p))} · {labelRelatif(p.tanggalAcara, hariIni)}
                        </small>
                      </span>
                      <ArrowRight size={14} aria-hidden="true" style={{ color: 'var(--redup-2)' }} />
                    </button>
                  </li>
                ))}
                {segera
                  .filter((p) => p.status !== 'inquiry' && statusPembayaranPesanan(p) !== 'lunas')
                  .slice(0, 3)
                  .map((p) => (
                    <li key={p.id}>
                      <button type="button" className="mini" onClick={() => bukaDetail(p)}>
                        <CircleAlert size={15} aria-hidden="true" style={{ color: 'var(--peringatan)' }} />
                        <span className="mini-teks">
                          <b>{p.kode} belum lunas</b>
                          <small>
                            Sisa {rupiahRingkas(sisaBayar(p))} · {labelRelatif(p.tanggalAcara, hariIni)}
                          </small>
                        </span>
                        <ArrowRight size={14} aria-hidden="true" style={{ color: 'var(--redup-2)' }} />
                      </button>
                    </li>
                  ))}
              </ul>
            )}
            <button type="button" className="tombol halus penuh" style={{ marginTop: 10 }} onClick={keLaporan}>
              Lihat laporan lengkap
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          </Kartu>
        </div>
      </div>
    </div>
  );
}

