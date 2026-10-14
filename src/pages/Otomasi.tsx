import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Bot, Plus, Power, Trash2, Zap, History } from 'lucide-react';
import type { AturanOtomasi, Kondisi, Tindakan } from '../types';
import { KATEGORI_MENU, LABEL_BIDANG, LABEL_OPERATOR, LABEL_PEMICU, LABEL_STATUS, LABEL_TINDAKAN, ULUTAN_STATUS } from '../types';
import { useToko } from '../state/toko';
import { aturanBaru, ringkasAturan, validasiAturan } from '../lib/otomasi';
import { waktuLokal, tanggalPanjang } from '../lib/tanggal';
import { Kartu, Kosong, Lencana, Metrik } from '../components/atom';
import { Dialog } from '../components/Dialog';
import { useKirimNotif } from '../components/Notifikasi';
import { useKonfirmasi } from '../components/Konfirmasi';

export function HalamanOtomasi(): ReactNode {
  const { data, kirim, hariIni } = useToko();
  const notif = useKirimNotif();
  const { konfirmasi } = useKonfirmasi();
  const [editor, setEditor] = useState<AturanOtomasi | null>(null);

  const totalEksekusi = data.aturan.reduce((n, a) => n + a.eksekusi, 0);
  const tugasOtomasi = data.tugas.filter((t) => t.sumber === 'otomasi').length;
  const aktif = data.aturan.filter((a) => a.aktif).length;

  const toggle = (a: AturanOtomasi) => {
    kirim({ tipe: 'aturan/simpan', aturan: { ...a, aktif: !a.aktif } });
    notif(`Aturan "${a.nama}" ${a.aktif ? 'dimatikan' : 'diaktifkan'}.`, 'info');
  };

  const hapus = async (a: AturanOtomasi) => {
    const boleh = await konfirmasi({
      judul: `Hapus aturan "${a.nama}"?`,
      pesan: 'Aturan ini akan berhenti berjalan. Tugas yang sudah dibuat tidak ikut terhapus.',
      merusak: true,
      labelYa: 'Ya, hapus aturan',
    });
    if (!boleh) return;
    kirim({ tipe: 'aturan/hapus', id: a.id });
    notif(`Aturan "${a.nama}" dihapus.`, 'peringatan');
  };

  const simpan = (a: AturanOtomasi) => {
    const galat = validasiAturan(a);
    if (galat.length > 0) {
      notif(galat[0].pesan, 'galat');
      return;
    }
    kirim({ tipe: 'aturan/simpan', aturan: a });
    setEditor(null);
    notif(`Aturan "${a.nama}" disimpan.`);
  };

  return (
    <div className="tumpuk">
      <section className="metrik-grid">
        <Metrik label="Aturan aktif" nilai={`${aktif}/${data.aturan.length}`} sisa="Dijalankan otomatis di peramban" ikon={<Power size={13} />} nada="merek" />
        <Metrik label="Total eksekusi" nilai={`${totalEksekusi}`} sisa=" sejak aplikasi dibuka ulang" ikon={<Zap size={13} />} />
        <Metrik label="Tugas dari mesin" nilai={`${tugasOtomasi}`} sisa="Dibuat oleh aturan" ikon={<Bot size={13} />} />
        <Metrik label="Catatan aktivitas" nilai={`${data.aktivitas.length}`} sisa="Jejak perubahan terakhir" ikon={<History size={13} />} />
      </section>

      <Kartu
        judul="Aturan otomatisasi"
        sub="Aturan berjalan sepenuhnya di peramban ini. Tidak ada layanan luar, tidak ada biaya."
        aksi={
          <button type="button" className="tombol utama" onClick={() => setEditor(aturanBaru())}>
            <Plus size={15} aria-hidden="true" />
            Aturan baru
          </button>
        }
        tanpaPad
      >
        {data.aturan.length === 0 ? (
          <Kosong
            ikon={<Bot size={22} />}
            judul="Belum ada aturan"
            pesan="Buat aturan sederhana, misalnya: setiap pesanan baru dengan DP di atas 50% langsung dinaikkan statusnya, atau setiap hari buat tugas untuk pesanan yang Besok."
            aksi={
              <button type="button" className="tombol utama" onClick={() => setEditor(aturanBaru())}>
                <Plus size={15} aria-hidden="true" />
                Buat aturan pertama
              </button>
            }
          />
        ) : (
          <ul className="daftar" style={{ padding: '0 16px 12px' }}>
            {data.aturan.map((a) => (
              <li className="daftar-baris" key={a.id} style={{ alignItems: 'flex-start', padding: '12px 0' }}>
                <input
                  type="checkbox"
                  checked={a.aktif}
                  onChange={() => toggle(a)}
                  aria-label={`Aktifkan aturan ${a.nama}`}
                  style={{ width: 16, height: 16, accentColor: 'var(--merek)', cursor: 'pointer', marginTop: 3, flex: '0 0 auto' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="tebal">{a.nama}</p>
                  <p className="kecil redup">
                    {LABEL_PEMICU[a.pemicu]} · {ringkasAturan(a)}
                  </p>
                  <div style={{ display: 'flex', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
                    {a.tindakan.map((t) => (
                      <Lencana key={t.id} nada="merek">
                        {LABEL_TINDAKAN[t.jenis]}
                      </Lencana>
                    ))}
                    <Lencana nada={a.aktif ? 'sukses' : 'netral'}>{a.aktif ? 'Aktif' : 'Nonaktif'}</Lencana>
                    {a.eksekusi > 0 && <Lencana nada="netral">{a.eksekusi}× jalan</Lencana>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, flex: '0 0 auto' }}>
                  <button type="button" className="tombol kecil datar" onClick={() => setEditor(a)}>
                    Ubah
                  </button>
                  <button type="button" className="ikon-tombol" onClick={() => void hapus(a)} aria-label={`Hapus aturan ${a.nama}`}>
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Kartu>

      <Kartu judul="Jejak aktivitas" sub="Semua perubahan penting, termasuk yang dilakukan mesin">
        {data.aktivitas.length === 0 ? (
          <p className="petunjuk">Belum ada aktivitas tercatat.</p>
        ) : (
          <ul className="daftar">
            {data.aktivitas.slice(0, 20).map((x) => (
              <li className="daftar-baris" key={x.id}>
                <span className="kecil redup nowrap" style={{ width: 118 }}>
                  {waktuLokal(x.waktu)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="kecil">{x.judul}</p>
                  {x.detail !== '' && <p className="kecil redup-2">{x.detail}</p>}
                </div>
                <Lencana nada={x.oleh === 'otomasi' ? 'merek' : x.oleh === 'sistem' ? 'netral' : 'info'}>
                  {x.oleh === 'otomasi' ? 'Mesin' : x.oleh === 'sistem' ? 'Sistem' : 'Anda'}
                </Lencana>
              </li>
            ))}
          </ul>
        )}
      </Kartu>

      {editor !== null && <EditorAturan aturan={editor} tutup={() => setEditor(null)} simpan={simpan} hariIni={hariIni} />}
    </div>
  );
}

/* ==================================================================== */

function EditorAturan({
  aturan,
  tutup,
  simpan,
  hariIni,
}: {
  aturan: AturanOtomasi;
  tutup: () => void;
  simpan: (a: AturanOtomasi) => void;
  hariIni: string;
}): ReactNode {
  const [draft, setDraft] = useState<AturanOtomasi>(aturan);

  const ubah = (perubahan: Partial<AturanOtomasi>) => setDraft((s) => ({ ...s, ...perubahan }));

  const tambahKondisi = () =>
    ubah({ kondisi: [...draft.kondisi, { id: `k${draft.kondisi.length + 1}`, bidang: 'status', operator: 'samaDengan', nilai: 'inquiry' }] });

  const ubahKondisi = (id: string, perubahan: Partial<Kondisi>) =>
    ubah({ kondisi: draft.kondisi.map((k) => (k.id === id ? { ...k, ...perubahan } : k)) });

  const tambahTindakan = () =>
    ubah({ tindakan: [...draft.tindakan, { id: `t${draft.tindakan.length + 1}`, jenis: 'buat-tugas', parameter: '' }] });

  const ubahTindakan = (id: string, perubahan: Partial<Tindakan>) =>
    ubah({ tindakan: draft.tindakan.map((t) => (t.id === id ? { ...t, ...perubahan } : t)) });

  const galat = useMemo(() => validasiAturan(draft), [draft]);

  const nilaiDefault = (bidang: Kondisi['bidang']): string => {
    switch (bidang) {
      case 'status':
        return 'inquiry';
      case 'kategoriMenu':
        return KATEGORI_MENU[0] ?? 'makanan';
      default:
        return '1';
    }
  };

  return (
    <Dialog
      terbuka
      judul={aturan.eksekusi > 0 ? 'Ubah aturan' : 'Aturan baru'}
      sub="Aturan dievaluasi di peramban setiap kali pesanan berubah."
      ukuran="lebar"
      tutup={tutup}
      kaki={
        <>
          <span className="kecil redup" style={{ marginRight: 'auto' }}>
            {galat.length === 0 ? 'Siap disimpan' : galat[0].pesan}
          </span>
          <div className="grup-kanan" style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="tombol datar" onClick={tutup}>
              Batal
            </button>
            <button type="button" className="tombol utama" onClick={() => simpan(draft)} disabled={galat.length > 0}>
              Simpan aturan
            </button>
          </div>
        </>
      }
    >
      <div className="form">
        <div className="grid-2">
          <div className="medan penuh">
            <label htmlFor="a-nama">Nama aturan</label>
            <input
              id="a-nama"
              value={draft.nama}
              onChange={(e) => ubah({ nama: e.target.value })}
              placeholder="Contoh: Konfirmasi otomatis bila DP masuk"
            />
          </div>
          <div className="medan">
            <label htmlFor="a-pemicu">Pemicu</label>
            <select id="a-pemicu" value={draft.pemicu} onChange={(e) => ubah({ pemicu: e.target.value as AturanOtomasi['pemicu'] })}>
              {(Object.keys(LABEL_PEMICU) as Array<AturanOtomasi['pemicu']>).map((p) => (
                <option key={p} value={p}>
                  {LABEL_PEMICU[p]}
                </option>
              ))}
            </select>
          </div>
          <label className="centang" htmlFor="a-aktif" style={{ alignSelf: 'end', paddingBottom: 8 }}>
            <input id="a-aktif" type="checkbox" checked={draft.aktif} onChange={(e) => ubah({ aktif: e.target.checked })} />
            <span>Aktifkan aturan</span>
          </label>
        </div>

        <fieldset className="form-set">
          <legend>Kondisi (semua harus terpenuhi)</legend>
          {draft.kondisi.length === 0 && (
            <p className="petunjuk">Tanpa kondisi, aturan berlaku untuk semua pesanan yang cocok dengan pemicu.</p>
          )}
          {draft.kondisi.map((k) => (
            <div key={k.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, alignItems: 'center' }}>
              <select value={k.bidang} aria-label="Bidang kondisi" onChange={(e) => ubahKondisi(k.id, { bidang: e.target.value as Kondisi['bidang'], nilai: nilaiDefault(e.target.value as Kondisi['bidang']) })}>
                {(Object.keys(LABEL_BIDANG) as Array<Kondisi['bidang']>).map((b) => (
                  <option key={b} value={b}>
                    {LABEL_BIDANG[b]}
                  </option>
                ))}
              </select>
              <select value={k.operator} aria-label="Operator kondisi" onChange={(e) => ubahKondisi(k.id, { operator: e.target.value as Kondisi['operator'] })}>
                {(Object.keys(LABEL_OPERATOR) as Array<Kondisi['operator']>).map((o) => (
                  <option key={o} value={o}>
                    {LABEL_OPERATOR[o]}
                  </option>
                ))}
              </select>
              {k.bidang === 'status' ? (
                <select value={k.nilai} aria-label="Nilai kondisi" onChange={(e) => ubahKondisi(k.id, { nilai: e.target.value })}>
                  {ULUTAN_STATUS.map((s) => (
                    <option key={s} value={s}>
                      {LABEL_STATUS[s]}
                    </option>
                  ))}
                </select>
              ) : k.bidang === 'kategoriMenu' ? (
                <select value={k.nilai} aria-label="Nilai kondisi" onChange={(e) => ubahKondisi(k.id, { nilai: e.target.value })}>
                  {KATEGORI_MENU.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              ) : (
                <input value={k.nilai} aria-label="Nilai kondisi" onChange={(e) => ubahKondisi(k.id, { nilai: e.target.value })} placeholder="nilai" />
              )}
              <button type="button" className="ikon-tombol" onClick={() => ubah({ kondisi: draft.kondisi.filter((x) => x.id !== k.id) })} aria-label="Hapus kondisi">
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </div>
          ))}
          <button type="button" className="tombol datar" onClick={tambahKondisi} style={{ alignSelf: 'flex-start' }}>
            <Plus size={15} aria-hidden="true" />
            Tambah kondisi
          </button>
        </fieldset>

        <fieldset className="form-set">
          <legend>Tindakan</legend>
          {draft.tindakan.map((t) => (
            <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center' }}>
              <select value={t.jenis} aria-label="Jenis tindakan" onChange={(e) => ubahTindakan(t.id, { jenis: e.target.value as Tindakan['jenis'] })}>
                {(Object.keys(LABEL_TINDAKAN) as Array<Tindakan['jenis']>).map((j) => (
                  <option key={j} value={j}>
                    {LABEL_TINDAKAN[j]}
                  </option>
                ))}
              </select>
              <button type="button" className="ikon-tombol" onClick={() => ubah({ tindakan: draft.tindakan.filter((x) => x.id !== t.id) })} aria-label="Hapus tindakan">
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </div>
          ))}
          <button type="button" className="tombol datar" onClick={tambahTindakan} style={{ alignSelf: 'flex-start' }}>
            <Plus size={15} aria-hidden="true" />
            Tambah tindakan
          </button>
        </fieldset>

        <div className="kartu" style={{ background: 'var(--permukaan-2)', boxShadow: 'none', padding: 12 }}>
          <p className="kecil redup" style={{ marginBottom: 6 }}>
            Pratinjau aturan
          </p>
          <p className="kecil">
            <b>{LABEL_PEMICU[draft.pemicu]}</b>
            {draft.kondisi.length > 0 && <> ketika {draft.kondisi.map((k) => `${LABEL_BIDANG[k.bidang].toLowerCase()} ${LABEL_OPERATOR[k.operator]} ${k.nilai}`).join(' dan ')}</>}
            {' → '}
            {draft.tindakan.length > 0 ? draft.tindakan.map((t) => LABEL_TINDAKAN[t.jenis].toLowerCase()).join(', ') : 'belum ada tindakan'}
            .
          </p>
        </div>

        <p className="catatan">
          <Zap size={13} aria-hidden="true" />
          <span>
            Nilai hari ini saat ini {tanggalPanjang(hariIni)}. Aturan tidak pernah mengirim pesan,
            melakukan pembayaran, atau menghubungi layanan luar.
          </span>
        </p>
      </div>
    </Dialog>
  );
}