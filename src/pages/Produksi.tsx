import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  CalendarDays,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Package,
  Printer,
  ShoppingBasket,
  Undo2,
} from 'lucide-react';
import type { Pesanan } from '../types';
import { useToko } from '../state/toko';
import { petaWaktuMasak, produksiUntuk } from '../state/reducer';
import { daftarBelanja, pesananAktif, tingkatBeban, LABEL_BEBAN } from '../lib/pesanan';
import { dariMenit, geserHari, hariIni as hariIniFungsi, labelRelatif, tanggalPanjang, tanggalPendekBulan, dariISO } from '../lib/tanggal';
import { desimal, angka, rupiah, rupiahRingkas } from '../lib/format';
import { belanjaKeCSV, namaBerkasTanggal, produksiKeCSV, unduhTeks } from '../lib/csv';
import { Avatar, Bilah, Kartu, Kosong, Lencana, LencanaStatus, Metrik } from '../components/atom';
import { useKirimNotif } from '../components/Notifikasi';

interface Properti {
  bukaDetail: (p: Pesanan) => void;
}

export function HalamanProduksi({ bukaDetail }: Properti): ReactNode {
  const { data } = useToko();
  const notif = useKirimNotif();
  const hariIni = hariIniFungsi();
  const [tanggal, setTanggal] = useState(hariIni);

  const ringkas = useMemo(() => produksiUntuk(data, tanggal), [data, tanggal]);
  const belanja = useMemo(() => daftarBelanja(data.pesanan, tanggal, data.menus), [data.pesanan, tanggal, data.menus]);

  const tanggalProduksi = useMemo(() => {
    const set = new Set(data.pesanan.filter(pesananAktif).map((p) => p.tanggalAcara));
    return [...set].sort();
  }, [data.pesanan]);

  const pesananHari = useMemo(
    () =>
      data.pesanan
        .filter((p) => p.tanggalAcara === tanggal)
        .sort((a, b) => (a.status === 'dibatalkan' ? 1 : 0) - (b.status === 'dibatalkan' ? 1 : 0) || a.jamAcara.localeCompare(b.jamAcara)),
    [data.pesanan, tanggal],
  );

  const aktif = pesananHari.filter(pesananAktif);
  const batal = pesananHari.filter((p) => !pesananAktif(p));

  const level = tingkatBeban(ringkas.totalPorsi, data.preferensi.ambangBeban);
  const persenBeban = Math.round((ringkas.totalPorsi / Math.max(1, data.preferensi.ambangBeban)) * 100);

  /** Jadwal masak: setiap pesanan harus selesai sebelum jam acaranya. */
  const jadwal = useMemo(() => {
    const peta = petaWaktuMasak(data.menus);
    return aktif
      .map((p) => {
        const mulai = Math.max(
          5 * 60,
          hitungMenit(p.jamAcara) - p.items.reduce((n, i) => n + (peta.get(i.menuId) ?? 30), 0) - 30,
        );
        return { pesanan: p, mulai, selesai: hitungMenit(p.jamAcara) };
      })
      .sort((a, b) => a.mulai - b.mulai);
  }, [aktif, data.menus]);

  const eksporProduksi = () => {
    if (ringkas.baris.length === 0) {
      notif('Tidak ada menu untuk diekspor pada tanggal ini.', 'peringatan');
      return;
    }
    unduhTeks(namaBerkasTanggal(`produksi-${tanggal}`, hariIni), produksiKeCSV(ringkas));
    notif(`Daftar produksi ${tanggalPendekBulan(tanggal)} diekspor.`);
  };

  const eksporBelanja = () => {
    if (belanja.length === 0) {
      notif('Belum ada resep bahan pada tanggal ini.', 'peringatan');
      return;
    }
    unduhTeks(namaBerkasTanggal(`belanja-${tanggal}`, hariIni), belanjaKeCSV(tanggal, belanja));
    notif(`Daftar belanja ${tanggalPendekBulan(tanggal)} diekspor.`);
  };

  const totalBiaya = belanja.reduce((n, b) => n + b.biaya, 0);

  return (
    <div className="tumpuk">
      <Kartu
        judul={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <CalendarDays size={16} aria-hidden="true" />
            {tanggalPanjang(tanggal)}
          </span> as never
        }
        sub={`${labelRelatif(tanggal, hariIni)} · ${ringkas.totalPesananAktif} pesanan aktif`}
        aksi={
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button type="button" className="ikon-tombol" onClick={() => setTanggal(geserHari(tanggal, -1))} aria-label="Hari sebelumnya">
              <ChevronLeft size={17} aria-hidden="true" />
            </button>
            <input
              type="date"
              value={tanggal}
              aria-label="Pilih tanggal produksi"
              onChange={(e) => e.target.value !== '' && setTanggal(e.target.value)}
              style={{ width: 'auto' }}
            />
            <button type="button" className="ikon-tombol" onClick={() => setTanggal(geserHari(tanggal, 1))} aria-label="Hari berikutnya">
              <ChevronRight size={17} aria-hidden="true" />
            </button>
            <button type="button" className="tombol kecil datar" onClick={() => setTanggal(hariIni)} disabled={tanggal === hariIni}>
              <Undo2 size={14} aria-hidden="true" />
              Hari ini
            </button>
          </div>
        }
      >
        {tanggalProduksi.length > 0 && (
          <div className="deret-tanggal" style={{ paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid var(--garis)' }}>
            <span className="kecil redup" style={{ marginRight: 4 }}>
              Ada produksi:
            </span>
            {tanggalProduksi.slice(0, 10).map((t) => (
              <button key={t} type="button" className={`cip${t === tanggal ? ' aktif' : ''}`} onClick={() => setTanggal(t)}>
                {dariISO(t).getDate()}/{dariISO(t).getMonth() + 1}
              </button>
            ))}
          </div>
        )}

        <div className="metrik-grid">
          <Metrik label="Pesanan aktif" nilai={angka(ringkas.totalPesananAktif)} sisa={`${angka(ringkas.totalPesananDibatalkan)} batal tidak dihitung`} ikon={<Package size={13} />} />
          <Metrik label="Total porsi" nilai={angka(ringkas.totalPorsi)} sisa={`${angka(ringkas.baris.length)} menu dimasak`} ikon={<ChefHat size={13} />} nada="sukses" />
          <Metrik label="Beban kerja" nilai={`${angka(Math.round(ringkas.menitKerja / 60))} jam`} sisa="Porsi × waktu masak" ikon={<Clock size={13} />} />
          <Metrik label="Nilai produksi" nilai={rupiahRingkas(ringkas.totalNilai)} sisa="Estimasi pesanan aktif" />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <Bilah persen={persenBeban} nada={level} label={`Beban ${persenBeban} persen dari ambang`} />
          </div>
          <Lencana nada={level === 'ringan' ? 'sukses' : level === 'sedang' ? 'info' : level === 'berat' ? 'peringatan' : 'bahaya'}>
            Beban {LABEL_BEBAN[level]} · {persenBeban}% dari {angka(data.preferensi.ambangBeban)} porsi
          </Lencana>
        </div>
      </Kartu>

      <div className="dua-kolom-kiri">
        <Kartu
          judul="Daftar masak per menu"
          sub="Agregasi porsi dari seluruh pesanan aktif pada tanggal ini"
          aksi={
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" className="tombol kecil datar" onClick={eksporProduksi}>
                <Download size={14} aria-hidden="true" />
                CSV
              </button>
              <button type="button" className="tombol kecil utama" onClick={() => window.print()}>
                <Printer size={14} aria-hidden="true" />
                Cetak tiket
              </button>
            </div>
          }
          tanpaPad
        >
          {ringkas.baris.length === 0 ? (
            <Kosong
              ikon={<ChefHat size={22} />}
              judul="Tidak ada yang perlu dimasak"
              pesan="Belum ada pesanan aktif pada tanggal ini. Pilih tanggal lain atau buat pesanan baru."
            />
          ) : (
            <>
              <div className="cetak-halaman" style={{ display: 'contents' }}>
                <div style={{ padding: '14px 16px 0' }} className="tanpa-cetak">
                  <p className="petunjuk">
                    <strong>Tiket dapur · {tanggalPanjang(tanggal)}</strong>
                  </p>
                  <p className="kecil redup">
                    {ringkas.totalPesananAktif} pesanan · {angka(ringkas.totalPorsi)} porsi · {angka(ringkas.baris.length)} menu
                  </p>
                </div>
              </div>
              <div className="gulir">
                <table className="tabel">
                  <thead>
                    <tr>
                      <th scope="col">Menu</th>
                      <th scope="col" className="kanan">
                        Porsi
                      </th>
                      <th scope="col" className="kanan">
                        Pesanan
                      </th>
                      <th scope="col" className="kanan">
                        Waktu
                      </th>
                      <th scope="col" className="kanan">
                        Subtotal
                      </th>
                      <th scope="col">Kode pesanan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ringkas.baris.map((b) => (
                      <tr key={b.menuId}>
                        <td data-label="Menu" className="tebal">
                          {b.namaMenu}
                        </td>
                        <td data-label="Porsi" className="kanan num tebal" style={{ fontSize: 'var(--t-md)' }}>
                          {angka(b.totalPorsi)}
                        </td>
                        <td data-label="Pesanan" className="kanan num">
                          {b.jumlahPesanan}
                        </td>
                        <td data-label="Waktu" className="kanan num redup">
                          ≈ {b.waktuMasak} m
                        </td>
                        <td data-label="Subtotal" className="kanan num">
                          {rupiah(b.totalPorsi * b.hargaPerPorsi)}
                        </td>
                        <td data-label="Kode pesanan" className="kecil redup">
                          {b.kodePesanan.join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th scope="row">Total</th>
                      <td className="kanan num tebal">{angka(ringkas.totalPorsi)}</td>
                      <td className="kanan num tebal">{angka(ringkas.totalPesananAktif)}</td>
                      <td className="kanan num">≈ {Math.round(ringkas.menitKerja / 60)} jam</td>
                      <td className="kanan num tebal">{rupiah(ringkas.totalNilai)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </Kartu>

        <div className="tumpuk">
          <Kartu
            judul="Jadwal masak"
            sub="Kapan mulai untuk selesai sebelum jam acara"
            aksi={<Clock size={15} aria-hidden="true" style={{ color: 'var(--redup)' }} />}
          >
            {jadwal.length === 0 ? (
              <p className="petunjuk">Tidak ada jadwal untuk tanggal ini.</p>
            ) : (
              <ul className="daftar">
                {jadwal.map((j) => (
                  <li className="daftar-baris" key={j.pesanan.id}>
                    <Avatar nama={j.pesanan.namaPelanggan} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="tebal kecil">{j.pesanan.namaPelanggan}</p>
                      <p className="kecil redup">{j.pesanan.kode}</p>
                    </div>
                    <span className="kecil nowrap" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {dariMenit(j.mulai)} → {dariMenit(j.selesai)}
                    </span>
                    <button type="button" className="tombol kecil datar" onClick={() => bukaDetail(j.pesanan)}>
                      Detail
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="catatan" style={{ marginTop: 10 }}>
              <Clock size={13} aria-hidden="true" />
              <span>Anggaran 30 menit untuk pengemasan dan transit.</span>
            </p>
          </Kartu>

          {batal.length > 0 && (
            <Kartu judul="Tidak dimasak" sub="Pesanan batal pada tanggal ini">
              <ul className="daftar">
                {batal.map((p) => (
                  <li className="daftar-baris" key={p.id}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="kecil" style={{ textDecoration: 'line-through', color: 'var(--redup)' }}>
                        {p.namaPelanggan} · {p.kode}
                      </p>
                    </div>
                    <LencanaStatus status={p.status} />
                  </li>
                ))}
              </ul>
            </Kartu>
          )}
        </div>
      </div>

      <Kartu
        judul="Daftar belanja"
        sub={
          data.menus.some((m) => m.bahan.length > 0)
            ? 'Dihitung otomatis dari resep bahan × porsi'
            : 'Tambahkan resep bahan pada menu untuk mengaktifkan daftar ini'
        }
        aksi={
          belanjaTersedia ? (
            <button type="button" className="tombol kecil datar" onClick={eksporBelanja}>
              <Download size={14} aria-hidden="true" />
              CSV
            </button>
          ) : undefined
        }
        tanpaPad
      >
        {belanja.length === 0 ? (
          <Kosong
            ikon={<ShoppingBasket size={22} />}
            judul="Belum ada kebutuhan bahan"
            pesan="Setiap menu harus punya resep bahan terlebih dahulu agar daftar belanja bisa dihitung."
          />
        ) : (
          <>
            <div className="gulir">
              <table className="tabel">
                <thead>
                  <tr>
                    <th scope="col">Bahan</th>
                    <th scope="col" className="kanan">
                      Kebutuhan
                    </th>
                    <th scope="col" className="kanan">
                      Estimasi biaya
                    </th>
                    <th scope="col">Dipakai untuk</th>
                  </tr>
                </thead>
                <tbody>
                  {belanja.map((b) => (
                    <tr key={`${b.nama}-${b.satuan}`}>
                      <td data-label="Bahan" className="tebal">
                        {b.nama}
                      </td>
                      <td data-label="Kebutuhan" className="kanan num tebal">
                        {desimal(b.jumlah, 2)} {b.satuan}
                      </td>
                      <td data-label="Estimasi biaya" className="kanan num">
                        {rupiah(b.biaya)}
                      </td>
                      <td data-label="Dipakai untuk" className="kecil redup">
                        {b.dariMenu.join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row">Total</th>
                    <td />
                    <td className="kanan num tebal">{rupiah(totalBiaya)}</td>
                    <td className="kecil redup">{`HPP ${rupiahRingkas(totalBiaya)} · ${totalBiaya === 0 || ringkas.totalNilai === 0 ? '—' : `${Math.round((totalBiaya / ringkas.totalNilai) * 100)} persen`} dari nilai produksi`}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="catatan" style={{ padding: '10px 16px 14px' }}>
              <ShoppingBasket size={13} aria-hidden="true" />
              <span>
                Harga bahan memakai harga yang Anda isi di resep menu. Ini perkiraan belanja, bukan
                pesanan ke pemasok — aplikasi tidak mengirim apa pun ke luar.
              </span>
            </p>
          </>
        )}
      </Kartu>
    </div>
  );
}

function hitungMenit(jam: string): number {
  const [j, m] = jam.split(':').map(Number);
  return (j ?? 0) * 60 + (m ?? 0);
}

const belanjaTersedia = true;
