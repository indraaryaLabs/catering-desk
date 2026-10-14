import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { BookOpen, Download, Pencil, Plus, TrendingDown, TrendingUp } from 'lucide-react';
import type { KategoriMenu, MenuItem } from '../types';
import { KATEGORI_MENU, LABEL_KATEGORI } from '../types';
import { useToko } from '../state/toko';
import { adaResep, hppPerPorsi, labaPerPorsi, marginPersen, menuDipakaiDiPesanan } from '../lib/pesanan';
import { komposisiMenu } from '../lib/analitik';
import { menuKeCSV, namaBerkasTanggal, unduhTeks } from '../lib/csv';
import { angka, desimal, rupiah, normalisasi } from '../lib/format';
import { Kartu, Kosong, Lencana, type Nada } from '../components/atom';
import { BarisPersentase } from '../components/Grafik';
import { Cincin } from '../components/Grafik';

interface Properti {
  bukaForm: (awal: MenuItem | null) => void;
  ubahMenu: (menu: MenuItem) => void;
  hapusMenu: (menu: MenuItem) => void;
}

export function HalamanMenu({ bukaForm, ubahMenu, hapusMenu }: Properti): ReactNode {
  const { data, hariIni, beriNotifikasi } = useToko();
  const [q, setQ] = useState('');
  const [kategori, setKategori] = useState<KategoriMenu | 'semua'>('semua');
  const [hanyaTersedia, setHanyaTersedia] = useState(false);
  const [terpilih, setTerpilih] = useState<string | null>(null);

  const dipakai = useMemo(() => menuDipakaiDiPesanan(data.pesanan), [data.pesanan]);

  const hasil = useMemo(() => {
    const k = normalisasi(q);
    return data.menus
      .filter((m) => {
        if (kategori !== 'semua' && m.kategori !== kategori) return false;
        if (hanyaTersedia && !m.tersedia) return false;
        if (k === '') return true;
        return normalisasi(`${m.nama} ${m.deskripsi} ${LABEL_KATEGORI[m.kategori]}`).includes(k);
      })
      .sort(
        (a, b) =>
          LABEL_KATEGORI[a.kategori].localeCompare(LABEL_KATEGORI[b.kategori], 'id') ||
          a.nama.localeCompare(b.nama, 'id'),
      );
  }, [data.menus, q, kategori, hanyaTersedia]);

  const komposisi = useMemo(() => komposisiMenu(data.pesanan, data.menus, hariIni), [data.pesanan, data.menus, hariIni]);

  // Rata-rata dihitung hanya dari menu yang resepnya sudah lengkap. Menu
  // tanpa resep tidak boleh dihitung sebagai HPP nol, karena itu membuat
  // margin katalog tampak lebih baik daripada kenyataannya.
  const denganResep = hasil.filter((m) => adaResep(m));
  const totalHPP = useMemo(
    () => denganResep.reduce((n, m) => n + hppPerPorsi(m), 0),
    [denganResep],
  );
  const totalJual = denganResep.reduce((n, m) => n + m.hargaPerPorsi, 0);
  const marginRata =
    totalJual === 0 ? 0 : Math.round(((totalJual - totalHPP) / totalJual) * 100);

  const diBawahHPP = data.menus.filter((mn) => mn.bahan.length > 0 && mn.hargaPerPorsi < hppPerPorsi(mn)).length;
  const tanpaResep = data.menus.filter((m) => m.bahan.length === 0).length;

  const ekspor = () => {
    const peta = new Map(data.menus.map((m) => [m.id, hppPerPorsi(m)]));
    unduhTeks(namaBerkasTanggal('menu', hariIni), menuKeCSV(data.menus, peta));
    beriNotifikasi(`${angka(data.menus.length)} menu diekspor ke CSV.`);
  };

  return (
    <div className="tumpuk">
      <section className="dua-kolom" style={{ display: 'grid' }}>
        <Kartu
          judul="Ringkasan katalog"
          sub={`${angka(data.menus.length)} menu · ${angka(data.menus.filter((m) => m.tersedia).length)} tersedia`}
          aksi={
            <button type="button" className="tombol datar" onClick={ekspor}>
              <Download size={15} aria-hidden="true" />
              Ekspor CSV
            </button>
          }
        >
          <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <Cincin nilai={marginRata} label="Margin rata-rata katalog" ukuran={104} tebal={10} />
            <div style={{ display: 'grid', gap: 8, flex: 1, minWidth: 200 }}>
              <div>
                <p className="kecil redup">Harga jual rata-rata / porsi</p>
                <p className="tebal" style={{ fontSize: 'var(--t-lg)' }}>
                  {denganResep.length === 0 ? '—' : rupiah(Math.round(totalJual / denganResep.length))}
                </p>
              </div>
              <div>
                <p className="kecil redup">HPP rata-rata / porsi</p>
                <p className="tebal" style={{ fontSize: 'var(--t-lg)' }}>
                  {denganResep.length === 0 ? '—' : rupiah(Math.round(totalHPP / denganResep.length))}
                </p>
              </div>
              {diBawahHPP > 0 && (
                <Lencana nada="bahaya">
                  <TrendingDown size={12} aria-hidden="true" />
                  {diBawahHPP} menu dijual di bawah HPP
                </Lencana>
              )}
              {tanpaResep > 0 && (
                <Lencana nada="netral">
                  <BookOpen size={12} aria-hidden="true" />
                  {tanpaResep} menu belum punya resep bahan
                </Lencana>
              )}
            </div>
          </div>
        </Kartu>

        <Kartu judul="Porsi per menu" sub="90 hari terakhir, dari pesanan aktif">
          <BarisPersentase
            data={komposisi.slice(0, 7).map((b) => ({
              label: b.nama,
              nilai: b.porsi,
              meta: `${b.porsiPersen}% nilai`,
            }))}
            format={(n) => `${angka(n)} porsi`}
          />
        </Kartu>
      </section>

      <Kartu
        judul="Daftar menu"
        sub="Harga jual, HPP, dan margin setiap menu"
        className="panel-lembut"
        aksi={
          <button type="button" className="tombol utama" onClick={() => bukaForm(null)}>
            <Plus size={15} aria-hidden="true" />
            Menu baru
          </button>
        }
      >
        <div className="filter-bar">
          <div className="medan cari">
            <label htmlFor="m-cari">Cari menu</label>
            <input id="m-cari" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nama atau deskripsi…" />
          </div>
          <div className="medan sempit">
            <label htmlFor="m-kat">Kategori</label>
            <select id="m-kat" value={kategori} onChange={(e) => setKategori(e.target.value as KategoriMenu | 'semua')}>
              <option value="semua">Semua kategori</option>
              {KATEGORI_MENU.map((k) => (
                <option key={k} value={k}>
                  {LABEL_KATEGORI[k]}
                </option>
              ))}
            </select>
          </div>
          <label className="centang" htmlFor="m-tersedia" style={{ paddingBottom: 8 }}>
            <input id="m-tersedia" type="checkbox" checked={hanyaTersedia} onChange={(e) => setHanyaTersedia(e.target.checked)} />
            <span>Hanya yang tersedia</span>
          </label>
        </div>
      </Kartu>

      <Kartu tanpaPad>
        {hasil.length === 0 ? (
          <Kosong
            ikon={<BookOpen size={22} />}
            judul="Menu tidak ditemukan"
            pesan="Tidak ada menu yang cocok dengan filter. Ubah pencarian atau tambahkan menu baru."
            aksi={
              <button type="button" className="tombol utama" onClick={() => bukaForm(null)}>
                <Plus size={15} aria-hidden="true" />
                Tambah menu
              </button>
            }
          />
        ) : (
          <div className="gulir">
            <table className="tabel">
              <thead>
                <tr>
                  <th scope="col">Menu</th>
                  <th scope="col">Kategori</th>
                  <th scope="col" className="kanan">
                    Harga jual
                  </th>
                  <th scope="col" className="kanan">
                    HPP
                  </th>
                  <th scope="col" className="kanan">
                    Margin
                  </th>
                  <th scope="col" className="kanan">
                    Dipakai
                  </th>
                  <th scope="col">Status</th>
                  <th scope="col">
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {hasil.map((m) => {
                  const hpp = hppPerPorsi(m);
                  const adaResepMenu = adaResep(m);
                  const margin = marginPersen(m);
                  const tone: Nada = !adaResepMenu ? 'netral' : margin >= 55 ? 'sukses' : margin >= 30 ? 'peringatan' : 'bahaya';
                  const bawah = adaResepMenu && m.hargaPerPorsi < hpp;
                  return (
                    <tr key={m.id}>
                      <td data-label="Menu">
                        <button type="button" className="sumber-teks tebal" onClick={() => setTerpilih(terpilih === m.id ? null : m.id)}>
                          {m.nama}
                        </button>
                        <p className="kecil redup mobile-saja">{m.waktuMasak} menit masak</p>
                        {terpilih === m.id && (
                          <ul style={{ marginTop: 6, fontSize: 'var(--t-xs)' }}>
                            {m.bahan.length === 0 && <li className="redup">Belum ada resep bahan.</li>}
                            {m.bahan.map((b) => (
                              <li key={b.id} className="redup">
                                {b.nama}: {desimal(b.jumlah, 2)} {b.satuan} × {rupiah(b.hargaSatuan)} ={' '}
                                {rupiah(b.jumlah * b.hargaSatuan)}
                              </li>
                            ))}
                            {adaResepMenu && (
                              <li className="tebal" style={{ marginTop: 4 }}>
                                Total HPP {rupiah(hpp)} · laba {rupiah(labaPerPorsi(m))}/porsi
                              </li>
                            )}
                          </ul>
                        )}
                      </td>
                      <td data-label="Kategori">{LABEL_KATEGORI[m.kategori]}</td>
                      <td data-label="Harga jual" className="kanan num tebal">
                        {rupiah(m.hargaPerPorsi)}
                      </td>
                      <td data-label="HPP" className="kanan num redup">
                        {adaResepMenu ? rupiah(hpp) : '—'}
                      </td>
                      <td data-label="Margin">
                        <Lencana nada={tone}>
                          {bawah && <TrendingDown size={12} aria-hidden="true" />}
                          {!bawah && adaResepMenu && margin >= 55 && <TrendingUp size={12} aria-hidden="true" />}
                          {adaResepMenu ? `${margin}%` : '—'}
                        </Lencana>
                      </td>
                      <td data-label="Dipakai" className="kanan num">
                        {dipakai.get(m.id) === undefined ? <span className="redup-2">—</span> : dipakai.get(m.id)}
                      </td>
                      <td data-label="Status">
                        <Lencana nada={m.tersedia ? 'sukses' : 'netral'}>{m.tersedia ? 'Tersedia' : 'Tidak tersedia'}</Lencana>
                      </td>
                      <td data-label="Aksi">
                        <div className="grup-aksi" style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="tombol kecil datar"
                            onClick={() => ubahMenu({ ...m, tersedia: !m.tersedia })}
                          >
                            {m.tersedia ? 'Tandai habis' : 'Tandai tersedia'}
                          </button>
                          <button type="button" className="ikon-tombol" onClick={() => bukaForm(m)} aria-label={`Ubah ${m.nama}`}>
                            <Pencil size={15} aria-hidden="true" />
                          </button>
                          <button type="button" className="ikon-tombol" onClick={() => hapusMenu(m)} aria-label={`Hapus ${m.nama}`}>
                            <span className="sr-only">Hapus {m.nama}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Kartu>
    </div>
  );
}
