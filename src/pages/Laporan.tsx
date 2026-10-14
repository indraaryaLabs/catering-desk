import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Download, TrendingUp } from 'lucide-react';
import { useToko } from '../state/toko';
import {
  analisisPiutang,
  bebanMingguan,
  komposisiMenu,
  corongStatus,
  jamPuncak,
  metrikUmum,
  polaMingguan,
  ringkasanLaba,
  trenBulanan,
} from '../lib/analitik';
import { piutangKeCSV, unduhTeks, namaBerkasTanggal } from '../lib/csv';
import { angka, rupiah, rupiahRingkas } from '../lib/format';
import { selisihHari, tanggalPendekBulan } from '../lib/tanggal';
import { Kartu, Metrik } from '../components/atom';
import { BarisPersentase, Cincin, GrafikBar, GrafikGaris, warnaSeri } from '../components/Grafik';
import { pesananAktif, sisaBayar } from '../lib/pesanan';

export function HalamanLaporan(): ReactNode {
  const { data, hariIni, beriNotifikasi } = useToko();

  const metrik = useMemo(() => metrikUmum(data.pesanan), [data.pesanan]);
  const tren = useMemo(() => trenBulanan(data.pesanan, 6, hariIni), [data.pesanan, hariIni]);
  const corong = useMemo(() => corongStatus(data.pesanan), [data.pesanan]);
  const komposisi = useMemo(() => komposisiMenu(data.pesanan, data.menus, hariIni), [data.pesanan, data.menus, hariIni]);
  const piutang = useMemo(() => analisisPiutang(data.pesanan, hariIni), [data.pesanan, hariIni]);
  const beban = useMemo(() => bebanMingguan(data.pesanan, data.preferensi.ambangBeban, hariIni, 14), [data.pesanan, data.preferensi.ambangBeban, hariIni]);
  const pola = useMemo(() => polaMingguan(data.pesanan, hariIni), [data.pesanan, hariIni]);
  const jam = useMemo(() => jamPuncak(data.pesanan, 4), [data.pesanan]);
  const laba = useMemo(() => ringkasanLaba(data.pesanan, data.menus), [data.pesanan, data.menus]);

  const totalBulan = tren.reduce((n, t) => n + t.nilai, 0);
  const bulanIni = tren[tren.length - 1];
  const bulanLalu = tren[tren.length - 2];
  const trenTeks =
    bulanIni === undefined || bulanLalu === undefined || bulanLalu.nilai === 0
      ? { arah: 'datar' as const, teks: '—' }
      : {
          arah: (bulanIni.nilai >= bulanLalu.nilai ? 'naik' : 'turun') as 'naik' | 'turun' | 'datar',
          teks: `${Math.abs(Math.round(((bulanIni.nilai - bulanLalu.nilai) / bulanLalu.nilai) * 100))}% vs bulan lalu`,
        };

  const eksporPiutang = () => {
    const daftar = data.pesanan
      .filter((p) => pesananAktif(p) && sisaBayar(p) > 0)
      .map((p) => ({ nama: p.namaPelanggan, kode: p.kode, tanggal: p.tanggalAcara, umur: selisihHari(p.tanggalAcara, hariIni), sisa: sisaBayar(p) }))
      .sort((a, b) => b.umur - a.umur);
    unduhTeks(namaBerkasTanggal('piutang', hariIni), piutangKeCSV(daftar));
    beriNotifikasi(`${daftar.length} baris piutang diekspor.`);
  };

  return (
    <div className="tumpuk">
      <section className="metrik-grid">
        <Metrik label="Nilai pesanan aktif" nilai={rupiahRingkas(metrik.nilai)} sisa={`${angka(metrik.pesananAktif)} pesanan · ${angka(metrik.porsi)} porsi`} nada="merek" ikon={<TrendingUp size={13} />} />
        <Metrik label="Rata-rata per pesanan" nilai={rupiahRingkas(metrik.rataRataPesanan)} sisa="Tanpa pesanan batal" />
        <Metrik
          label="Piutang berjalan"
          nilai={rupiahRingkas(metrik.tertagih)}
          sisa={`${angka(piutang.total)} pesanan belum lunas`}
          nada={piutang.total === 0 ? 'sukses' : 'peringatan'}
        />
        <Metrik
          label="Laba kotor"
          nilai={laba.adaResep ? rupiahRingkas(laba.laba) : '—'}
          sisa={laba.adaResep ? `Margin ${laba.margin}%` : 'Isi resep menu untuk menghitung'}
          nada={laba.adaResep ? 'sukses' : 'netral'}
        />
      </section>

      <div className="dua-kolom">
        <Kartu judul="Pendapatan per bulan" sub="Enam bulan terakhir, pesanan aktif saja">
          <GrafikGaris data={tren.map((t) => ({ label: t.label.split(' ')[0] ?? t.label, nilai: t.nilai }))} format={(n) => rupiahRingkas(n)} judul="Pendapatan per bulan" />
          <div className="kaki-catatan" style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap', fontSize: 'var(--t-xs)', color: 'var(--redup)' }}>
            <span>
              Total 6 bulan <b style={{ color: 'var(--tinta)' }}>{rupiah(totalBulan)}</b>
            </span>
            <span className={`teks-${trenTeks.arah}`}>
              Bulan terakhir {trenTeks.arah === 'naik' ? 'naik' : trenTeks.arah === 'turun' ? 'turun' : 'flat'} {trenTeks.teks}
            </span>
          </div>
        </Kartu>

        <Kartu judul="Alur pesanan" sub="Semua status yang pernah dipakai">
          <BarisPersentase
            data={corong.map((c, i) => ({ label: c.label, nilai: c.jumlah, warna: warnaSeri(i), meta: rupiahRingkas(c.nilai) }))}
            format={(n) => `${angka(n)} pesanan`}
          />
        </Kartu>
      </div>

      <div className="dua-kolom">
        <Kartu judul="Porsi per tanggal" sub="Dua minggu ke depan, termasuk hari ini">
          <GrafikBar
            data={beban.map((b) => ({
              label: tanggalPendekBulan(b.tanggal),
              nilai: b.porsi,
              meta: `${b.pesanan} pesanan · ${b.bebanPersen}% beban`,
            }))}
            format={(n) => `${angka(n)} porsi`}
            judul="Porsi per tanggal"
          />
        </Kartu>

        <Kartu
          judul="Umur piutang"
          sub={piutang.terlama === null ? 'Tidak ada tunggakan' : `Terlama: ${piutang.terlamaHari} hari`}
          aksi={
            <button type="button" className="tombol kecil datar" onClick={eksporPiutang}>
              <Download size={14} aria-hidden="true" />
              CSV
            </button>
          }
        >
          {piutang.total === 0 ? (
            <div style={{ display: 'grid', placeItems: 'center', padding: '18px 0' }}>
              <Cincin nilai={100} label="Semua pesanan lunas" warna="var(--sukses)" />
              <p className="kecil redup" style={{ marginTop: 10 }}>
                Tidak ada tagihan berjalan.
              </p>
            </div>
          ) : (
            <BarisPersentase
              data={piutang.keranjang.filter((k) => k.jumlah > 0).map((k, i) => ({ label: k.label, nilai: k.nilai, warna: warnaSeri(i + 3), meta: `${k.jumlah} pesanan` }))}
              format={(n) => rupiahRingkas(n)}
            />
          )}
        </Kartu>
      </div>

      <div className="dua-kolom">
        <Kartu judul="Menu paling laku" sub="90 hari terakhir, berdasarkan porsi">
          {komposisi.length === 0 ? (
            <p className="petunjuk">Belum ada pesanan aktif untuk dianalisis.</p>
          ) : (
            <BarisPersentase
              data={komposisi.slice(0, 8).map((b) => ({ label: b.nama, nilai: b.porsi, meta: b.margin > 0 ? `margin ${b.margin}%` : undefined }))}
              format={(n) => `${angka(n)} porsi`}
            />
          )}
        </Kartu>

        <Kartu judul="Pola pemesanan" sub="Nama hari tersibuk dan jam acara">
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <p className="kecil redup" style={{ marginBottom: 6 }}>
                Pesanan per nama hari
              </p>
              <BarisPersentase data={pola.map((h) => ({ label: h.hari, nilai: h.porsi }))} format={(n) => `${angka(n)} porsi`} />
            </div>
            <div>
              <p className="kecil redup" style={{ marginBottom: 6 }}>
                Jam acara tersibuk
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {jam.length === 0 ? (
                  <span className="petunjuk">Belum ada data.</span>
                ) : (
                  jam.map((j, i) => (
                    <span key={j.jam} className="kartu" style={{ padding: '8px 12px', minWidth: 90 }}>
                      <p className="kecil redup">{j.label}</p>
                      <p className="tebal" style={{ fontSize: 'var(--t-lg)', fontVariantNumeric: 'tabular-nums' }}>
                        {j.pesanan}
                      </p>
                      <span
                        style={{
                          display: 'block',
                          height: 3,
                          borderRadius: 99,
                          marginTop: 4,
                          background: warnaSeri(i),
                          width: `${Math.min(100, j.pesanan * 22)}%`,
                        }}
                      />
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </Kartu>
      </div>
    </div>
  );
}
