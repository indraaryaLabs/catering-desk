import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowUpRight, Repeat2, Search, Sparkles, Users } from 'lucide-react';
import { useToko } from '../state/toko';
import {
  LABEL_HUBUNGAN,
  perluDifollowUp,
  pesananAcuan,
  profilPelanggan,
  statusHubungan,
} from '../lib/pelanggan';
import type { ProfilPelanggan } from '../lib/pelanggan';
import { angka, rupiah, rupiahRingkas, normalisasi } from '../lib/format';
import { labelRelatif, tanggalRingkas } from '../lib/tanggal';
import { Avatar, Kartu, Kosong, Lencana, Metrik, type Nada } from '../components/atom';

interface Properti {
  ulang: (profil: ProfilPelanggan) => void;
}

export function HalamanPelanggan({ ulang }: Properti): ReactNode {
  const { data, hariIni } = useToko();
  const [q, setQ] = useState('');

  const semua = useMemo(() => profilPelanggan(data.pesanan), [data.pesanan]);
  const daftar = useMemo(() => {
    const k = normalisasi(q);
    if (k === '') return semua;
    return semua.filter((p) => normalisasi(`${p.nama} ${p.kontak} ${p.alamat}`).includes(k));
  }, [semua, q]);

  const perluDijaga = useMemo(() => perluDifollowUp(semua, 45), [semua]);
  const totalNilai = semua.reduce((n, p) => n + p.totalNilai, 0);
  const berulang = semua.filter((p) => p.totalPesanan >= 2).length;
  const rateBerulang = semua.length === 0 ? 0 : Math.round((berulang / semua.length) * 100);

  return (
    <div className="tumpuk">
      <section className="metrik-grid">
        <Metrik label="Total pelanggan" nilai={angka(semua.length)} sisa="Dihitung dari pesanan" ikon={<Users size={13} />} nada="merek" />
        <Metrik label="Pelanggan berulang" nilai={angka(berulang)} sisa={`${rateBerulang}% dari total`} />
        <Metrik
          label="Nilai seumur hidup"
          nilai={rupiahRingkas(totalNilai)}
          sisa="Total pesanan aktif per pelanggan"
        />
        <Metrik
          label="Perlu dijaga"
          nilai={angka(perluDijaga.length)}
          sisa={perluDijaga.length === 0 ? 'Semua pelanggan aktif' : '≥45 hari tidak memesan'}
          nada={perluDijaga.length === 0 ? 'sukses' : 'peringatan'}
        />
      </section>

      {perluDijaga.length > 0 && (
        <Kartu
          judul="Pelanggan yang perlu dijaga"
          sub="Pernah memesan, tetapi sudah lama tidak ada order. Sambungi kembali sebelum mereka lupa."
          aksi={
            <Sparkles size={16} aria-hidden="true" style={{ color: 'var(--merek)' }} />
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {perluDijaga.slice(0, 6).map((p) => (
              <div
                key={p.kunci}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: '9px 11px',
                  border: '1px solid var(--garis)',
                  borderRadius: 'var(--r-sm)',
                  background: 'var(--permukaan-2)',
                }}
              >
                <Avatar nama={p.nama} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p className="tebal kecil">{p.nama}</p>
                  <p className="kecil redup">{p.hariSejakPesanTerakhir} hari lalu · {p.totalPesanan}× pesan</p>
                </div>
                <button type="button" className="tombol kecil datar" onClick={() => ulang(p)}>
                  <ArrowUpRight size={13} aria-hidden="true" />
                  Pesan lagi
                </button>
              </div>
            ))}
          </div>
        </Kartu>
      )}

      <Kartu
        judul="Semua pelanggan"
        sub="Profil diturunkan langsung dari riwayat pesanan — tidak ada data duplikat."
        aksi={
          <div style={{ position: 'relative' }}>
            <Search size={14} aria-hidden="true" style={{ position: 'absolute', left: 9, top: 11, color: 'var(--redup-2)' }} />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari pelanggan…"
              aria-label="Cari pelanggan"
              style={{ width: 220, paddingLeft: 28 }}
            />
          </div>
        }
        tanpaPad
      >
        {daftar.length === 0 ? (
          <Kosong
            ikon={<Users size={22} />}
            judul={semua.length === 0 ? 'Belum ada data pelanggan' : 'Pelanggan tidak ditemukan'}
            pesan={
              semua.length === 0
                ? 'Profil pelanggan muncul otomatis setelah ada pesanan yang tercatat.'
                : 'Coba nama atau nomor kontak lain.'
            }
          />
        ) : (
          <div className="gulir">
            <table className="tabel">
              <thead>
                <tr>
                  <th scope="col">Pelanggan</th>
                  <th scope="col">Hubungan</th>
                  <th scope="col" className="kanan">
                    Pesanan
                  </th>
                  <th scope="col" className="kanan">
                    Total porsi
                  </th>
                  <th scope="col" className="kanan">
                    Nilai
                  </th>
                  <th scope="col" className="kanan">
                    Rata-rata
                  </th>
                  <th scope="col">Pesan terakhir</th>
                  <th scope="col">Menu favorit</th>
                  <th scope="col">
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {daftar.map((p) => {
                  const hubungan = statusHubungan(p);
                  const tone: Nada =
                    hubungan === 'terbawa' ? 'bahaya' : hubungan === 'aktif' ? 'sukses' : hubungan === 'berulang' ? 'merek' : 'netral';
                  const acuan = pesananAcuan(p);
                  return (
                    <tr key={p.kunci}>
                      <td data-label="Pelanggan">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar nama={p.nama} merek={hubungan === 'berulang'} />
                          <div style={{ minWidth: 0 }}>
                            <p className="tebal">{p.nama}</p>
                            <p className="kecil redup">{p.kontak === '' ? 'tanpa kontak' : p.kontak}</p>
                          </div>
                        </div>
                      </td>
                      <td data-label="Hubungan">
                        <Lencana nada={tone}>{LABEL_HUBUNGAN[hubungan]}</Lencana>
                      </td>
                      <td data-label="Pesanan" className="kanan num">
                        {p.totalPesanan}
                      </td>
                      <td data-label="Total porsi" className="kanan num">
                        {angka(p.totalPorsi)}
                      </td>
                      <td data-label="Nilai" className="kanan num">
                        {rupiah(p.totalNilai)}
                      </td>
                      <td data-label="Rata-rata" className="kanan num redup">
                        {rupiahRingkas(p.rataRataPesanan)}
                      </td>
                      <td data-label="Pesan terakhir" className="nowrap">
                        {p.terakhirPesan === null ? (
                          <span className="redup-2">—</span>
                        ) : (
                          <>
                            {tanggalRingkas(p.terakhirPesan)}
                            <p className="kecil redup">{labelRelatif(p.terakhirPesan, hariIni)}</p>
                          </>
                        )}
                      </td>
                      <td data-label="Menu favorit">
                        {p.menuFavorit.length === 0 ? (
                          <span className="redup-2">—</span>
                        ) : (
                          <span className="kecil">
                            {p.menuFavorit[0].nama}
                            {p.menuFavorit.length > 1 && (
                              <span className="redup-2"> +{p.menuFavorit.length - 1}</span>
                            )}
                          </span>
                        )}
                      </td>
                      <td data-label="Aksi">
                        <div className="grup-aksi" style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          {p.tertagih > 0 && (
                            <span className="kecil nowrap" style={{ color: 'var(--bahaya)' }}>
                              sisa {rupiahRingkas(p.tertagih)}
                            </span>
                          )}
                          <button
                            type="button"
                            className="tombol kecil datar"
                            onClick={() => acuan !== null && ulang(p)}
                            disabled={acuan === null}
                            aria-label={`Pesan lagi untuk ${p.nama}`}
                          >
                            <Repeat2 size={13} aria-hidden="true" />
                            Pesan lagi
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

      <p className="catatan">
        <Search size={13} aria-hidden="true" />
        <span>
          Data pelanggan tidak disimpan terpisah — semuanya dihitung dari pesanan. Menghapus pesanan
          ikut menghapus riwayatnya.
        </span>
      </p>
    </div>
  );
}


