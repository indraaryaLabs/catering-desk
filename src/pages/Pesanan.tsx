import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ChevronRight,
  Download,
  Eye,
  Filter,
  Pencil,
  Plus,
  Repeat2,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type { Pesanan, StatusPesanan } from '../types';
import { LABEL_STATUS, ULUTAN_STATUS } from '../types';
import { useToko } from '../state/toko';
import {
  FILTER_AWAL,
  LABEL_URUTAN,
  daftarPengantar,
  filterAktif,
  filterDanUrutkan,
  ringkasHasil,
} from '../lib/filter';
import type { FilterPesanan, UrutanPesanan } from '../lib/filter';
import type { StatusPembayaran } from '../lib/pesanan';
import { LABEL_PEMBAYARAN, aksiUtama, sisaBayar, statusPembayaranPesanan, totalPorsi, totalPesanan } from '../lib/pesanan';
import { namaBerkasTanggal, pesananKeCSV, ringkasEkspor, unduhTeks } from '../lib/csv';
import { angka, rupiah, rupiahRingkas } from '../lib/format';
import { labelRelatif, tanggalPendek } from '../lib/tanggal';
import { Avatar, Kartu, Kosong, LencanaBayar, LencanaStatus } from '../components/atom';
import { useKirimNotif } from '../components/Notifikasi';
import { useKonfirmasi } from '../components/Konfirmasi';

interface Properti {
  bukaDetail: (p: Pesanan) => void;
  bukaForm: (awal: Pesanan | null) => void;
  ubahStatus: (id: string, s: StatusPesanan) => void;
  ubahStatusBanyak: (perubahan: Array<{ id: string; status: StatusPesanan }>) => void;
  hapusBanyak: (ids: string[]) => void;
  ulang: (p: Pesanan) => void;
}

export function HalamanPesanan({
  bukaDetail,
  bukaForm,
  ubahStatus,
  ubahStatusBanyak,
  hapusBanyak,
  ulang,
}: Properti): ReactNode {
  const { data, hariIni } = useToko();
  const notif = useKirimNotif();
  const { konfirmasi } = useKonfirmasi();
  const [filter, setFilter] = useState<FilterPesanan>(FILTER_AWAL);
  const [dipilih, setDipilih] = useState<string[]>([]);

  const pengantar = useMemo(() => daftarPengantar(data.pesanan), [data.pesanan]);
  const hasil = useMemo(() => filterDanUrutkan(data.pesanan, filter), [data.pesanan, filter]);
  const ringkas = useMemo(() => ringkasHasil(hasil), [hasil]);

  const ganti = (perubahan: Partial<FilterPesanan>) => {
    setFilter((s) => ({ ...s, ...perubahan }));
    setDipilih([]);
  };

  const semuaTerpilih = hasil.length > 0 && hasil.every((p) => dipilih.includes(p.id));
  const cekSemua = (nyala: boolean) => setDipilih(nyala ? hasil.map((p) => p.id) : []);

  const ekspor = () => {
    if (hasil.length === 0) {
      notif('Tidak ada pesanan pada filter ini.', 'peringatan');
      return;
    }
    unduhTeks(namaBerkasTanggal('pesanan', hariIni), pesananKeCSV(hasil));
    notif(`${ringkasEkspor(hasil.length, ringkas.nilai)} diekspor ke CSV.`);
  };

  const aksiMassal = async (aksi: 'hapus' | 'lanjut') => {
    if (dipilih.length === 0) return;
    const boleh = await konfirmasi({
      judul: aksi === 'hapus' ? `Hapus ${dipilih.length} pesanan?` : `Ubah status ${dipilih.length} pesanan?`,
      pesan:
        aksi === 'hapus'
          ? 'Pesanan terpilih akan dihapus dari peramban ini.'
          : 'Hanya pesanan yang transisinya diizinkan yang akan berubah.',
      merusak: aksi === 'hapus',
      labelYa: aksi === 'hapus' ? 'Ya, hapus' : 'Ya, terapkan',
    });
    if (!boleh) return;

    if (aksi === 'hapus') {
      hapusBanyak(dipilih);
    } else {
      ubahStatusBanyak(
        dipilih.map((id) => {
          const p = data.pesanan.find((x) => x.id === id);
          const next = p === undefined ? undefined : aksiUtama(p.status);
          return { id, status: next?.status ?? p?.status };
        }).filter((x): x is { id: string; status: StatusPesanan } => x.status !== undefined),
      );
    }
    setDipilih([]);
  };

  return (
    <div className="tumpuk">
      <Kartu
        className="panel-lembut"
        aksi={
          filterAktif(filter) ? (
            <button type="button" className="tombol kecil datar" onClick={() => ganti(FILTER_AWAL)}>
              <RotateCcw size={14} aria-hidden="true" />
              Bersihkan filter
            </button>
          ) : undefined
        }
      >
        <div className="filter-bar">
          <div className="medan cari">
            <label htmlFor="f-cari">
              <Search size={13} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
              Cari
            </label>
            <input
              id="f-cari"
              type="search"
              value={filter.q}
              placeholder="Nama pelanggan, kode, menu, alamat…"
              onChange={(e) => ganti({ q: e.target.value })}
            />
          </div>
          <div className="medan sempit">
            <label htmlFor="f-status">Status</label>
            <select id="f-status" value={filter.status} onChange={(e) => ganti({ status: e.target.value as FilterPesanan['status'] })}>
              <option value="semua">Semua status</option>
              {ULUTAN_STATUS.map((s) => (
                <option key={s} value={s}>
                  {LABEL_STATUS[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="medan sempit">
            <label htmlFor="f-bayar">Pembayaran</label>
            <select id="f-bayar" value={filter.pembayaran} onChange={(e) => ganti({ pembayaran: e.target.value as FilterPesanan['pembayaran'] })}>
              <option value="semua">Semua</option>
              {(Object.keys(LABEL_PEMBAYARAN) as StatusPembayaran[]).map((s) => (
                <option key={s} value={s}>
                  {LABEL_PEMBAYARAN[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="medan sempit">
            {/* Awalan "saring-" memisahkan id filter dari id form dialog,
                sehingga tidak ada dua elemen berbagi id yang sama. */}
            <label htmlFor="saring-tanggal">Tanggal acara</label>
            <input
              id="saring-tanggal"
              type="date"
              value={filter.tanggal}
              onChange={(e) => ganti({ tanggal: e.target.value })}
            />
          </div>
          <div className="medan sempit">
            <label htmlFor="f-pengantar">Pengantar</label>
            <select id="f-pengantar" value={filter.pengantar} onChange={(e) => ganti({ pengantar: e.target.value })}>
              <option value="semua">Semua</option>
              {pengantar.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="medan sempit">
            <label htmlFor="f-urut">Urutkan</label>
            <select id="f-urut" value={filter.urut} onChange={(e) => ganti({ urut: e.target.value as UrutanPesanan })}>
              {(Object.keys(LABEL_URUTAN) as UrutanPesanan[]).map((u) => (
                <option key={u} value={u}>
                  {LABEL_URUTAN[u]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--garis)' }}>
          <label className="centang" style={{ padding: 0 }}>
            <input
              type="checkbox"
              checked={semuaTerpilih}
              onChange={(e) => cekSemua(e.target.checked)}
              aria-label="Pilih semua pesanan yang tampil"
            />
            <span>
              {dipilih.length > 0
                ? `${dipilih.length} dipilih`
                : `${angka(hasil.length)} pesanan · ${rupiahRingkas(ringkas.nilai)}`}
            </span>
          </label>
          <button type="button" className="tombol datar" onClick={ekspor}>
            <Download size={15} aria-hidden="true" />
            Ekspor CSV
          </button>
        </div>
      </Kartu>

      {dipilih.length > 0 && (
        <div className="kartu" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', borderColor: 'var(--merek-garis)', background: 'var(--merek-lembut)' }}>
          <Filter size={15} aria-hidden="true" style={{ color: 'var(--merek-tua)' }} />
          <span className="kecil" style={{ color: 'var(--merek-tua)', fontWeight: 600 }}>
            {dipilih.length} pesanan dipilih
          </span>
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
            <button type="button" className="tombol kecil datar" onClick={() => void aksiMassal('lanjut')}>
              <ChevronRight size={14} aria-hidden="true" />
              Majukan status
            </button>
            <button type="button" className="tombol kecil bahaya datar" onClick={() => void aksiMassal('hapus')}>
              <Trash2 size={14} aria-hidden="true" />
              Hapus
            </button>
            <button type="button" className="ikon-tombol" onClick={() => setDipilih([])} aria-label="Batalkan pilihan">
              <X size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <Kartu tanpaPad>
        {hasil.length === 0 ? (
          <Kosong
            ikon={<Filter size={22} />}
            judul={data.pesanan.length === 0 ? 'Belum ada pesanan' : 'Tidak ada yang cocok'}
            pesan={
              data.pesanan.length === 0
                ? 'Mulai dari pesanan pertama Anda, atau muat ulang data contoh dari halaman Data & Cadangan.'
                : 'Coba longgarkan kata kunci atau bersihkan filter yang aktif.'
            }
            aksi={
              <button type="button" className="tombol utama" onClick={() => (data.pesanan.length === 0 ? bukaForm(null) : ganti(FILTER_AWAL))}>
                {data.pesanan.length === 0 ? 'Buat pesanan' : 'Bersihkan filter'}
              </button>
            }
          />
        ) : (
          <div className="gulir">
            <table className="tabel">
              <thead>
                <tr>
                  <th scope="col" style={{ width: 34 }}>
                    <span className="sr-only">Pilih</span>
                  </th>
                  <th scope="col">Pelanggan</th>
                  <th scope="col">Jadwal</th>
                  <th scope="col">Menu</th>
                  <th scope="col" className="kanan">
                    Porsi
                  </th>
                  <th scope="col" className="kanan">
                    Total
                  </th>
                  <th scope="col" className="kanan">
                    Sisa
                  </th>
                  <th scope="col">Bayar</th>
                  <th scope="col">Status</th>
                  <th scope="col">
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {hasil.map((p) => {
                  const sisa = sisaBayar(p);
                  const lanjut = aksiUtama(p.status);
                  const terpilih = dipilih.includes(p.id);
                  return (
                    <tr key={p.id} data-dipilih={terpilih}>
                      <td data-label="Pilih">
                        <input
                          type="checkbox"
                          checked={terpilih}
                          onChange={(e) =>
                            setDipilih((s) => (e.target.checked ? [...s, p.id] : s.filter((x) => x !== p.id)))
                          }
                          aria-label={`Pilih ${p.kode}`}
                          style={{ width: 15, height: 15, accentColor: 'var(--merek)', cursor: 'pointer' }}
                        />
                      </td>
                      <td data-label="Pelanggan">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar nama={p.namaPelanggan} />
                          <div style={{ minWidth: 0 }}>
                            <button
                              type="button"
                              className="sumber-teks"
                              onClick={() => bukaDetail(p)}
                              style={{ fontWeight: 600 }}
                            >
                              {p.namaPelanggan}
                            </button>
                            <p className="kecil redup">{p.kode}</p>
                          </div>
                        </div>
                      </td>
                      <td data-label="Jadwal" className="nowrap">
                        {tanggalPendek(p.tanggalAcara)}
                        <p className="kecil redup">
                          {p.jamAcara} · {labelRelatif(p.tanggalAcara, hariIni)}
                        </p>
                      </td>
                      <td data-label="Menu">
                        {p.items.length === 1 ? p.items[0].namaMenu : `${p.items[0].namaMenu} +${p.items.length - 1}`}
                        <p className="kecil redup mobile-saja">{p.jenisAcara}</p>
                      </td>
                      <td data-label="Porsi" className="kanan num">
                        {angka(totalPorsi(p))}
                      </td>
                      <td data-label="Total" className="kanan num">
                        {rupiah(totalPesanan(p))}
                      </td>
                      <td data-label="Sisa" className="kanan num">
                        {sisa === 0 ? <span className="redup-2">—</span> : rupiah(sisa)}
                      </td>
                      <td data-label="Bayar">
                        <LencanaBayar status={statusPembayaranPesanan(p)} />
                      </td>
                      <td data-label="Status">
                        <LencanaStatus status={p.status} />
                      </td>
                      <td data-label="Aksi">
                        <div className="grup-aksi" style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          {lanjut !== undefined && (
                            <button type="button" className="tombol kecil datar" onClick={() => ubahStatus(p.id, lanjut.status)}>
                              {lanjut.label}
                            </button>
                          )}
                          <button type="button" className="ikon-tombol" onClick={() => ulang(p)} aria-label={`Ulangi pesanan ${p.kode}`} title="Pesan lagi">
                            <Repeat2 size={15} aria-hidden="true" />
                          </button>
                          <button type="button" className="ikon-tombol" onClick={() => bukaDetail(p)} aria-label={`Lihat detail ${p.kode}`}>
                            <Eye size={15} aria-hidden="true" />
                          </button>
                          <button type="button" className="ikon-tombol" onClick={() => bukaForm(p)} aria-label={`Ubah ${p.kode}`}>
                            <Pencil size={15} aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4}>Total {angka(hasil.length)} pesanan</td>
                  <td className="kanan num tebal">{angka(ringkas.porsi)}</td>
                  <td className="kanan num tebal">{rupiah(ringkas.nilai)}</td>
                  <td className="kanan num tebal">{rupiah(ringkas.sisa)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Kartu>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" className="tombol utama" onClick={() => bukaForm(null)}>
          <Plus size={15} aria-hidden="true" />
          Pesanan baru
        </button>
      </div>
    </div>
  );
}