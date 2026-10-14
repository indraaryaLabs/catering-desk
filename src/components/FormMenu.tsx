import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import type { KategoriMenu, MenuItem } from '../types';
import { KATEGORI_MENU, LABEL_KATEGORI } from '../types';
import type { DraftMenu } from '../lib/validasi';
import { draftMenuAwal, draftMenuKeMenu, validasiDraftMenu } from '../lib/validasi';
import { desimal, rupiah } from '../lib/format';
import { hppPerPorsi, labaPerPorsi, marginPersen } from '../lib/pesanan';
import { Dialog } from './Dialog';
import { Lencana, type Nada } from './atom';

interface Properti {
  terbuka: boolean;
  awal: MenuItem | null;
  tutup: () => void;
  simpan: (menu: MenuItem) => void;
}

function bahanKosong() {
  return {
    id: `b-${Math.random().toString(36).slice(2, 9)}`,
    nama: '',
    jumlah: '',
    satuan: 'kg',
    hargaSatuan: '',
  };
}

export function FormMenu({ terbuka, awal, tutup, simpan }: Properti): ReactNode {
  const [draft, setDraft] = useState<DraftMenu>(() => draftMenuAwal(awal));
  const [galat, setGalat] = useState<Record<string, string>>({});

  useEffect(() => {
    if (terbuka) {
      setDraft(draftMenuAwal(awal));
      setGalat({});
    }
  }, [terbuka, awal]);

  const hpp = draft.bahan.reduce(
    (n, b) => n + (Number.parseFloat(b.jumlah) || 0) * (Number.parseInt(b.hargaSatuan, 10) || 0),
    0,
  );
  const harga = Number.parseInt(draft.hargaPerPorsi, 10) || 0;
  const margin = harga <= 0 ? 0 : Math.round(((harga - hpp) / harga) * 100);
  const nadaMargin: Nada = margin >= 55 ? 'sukses' : margin >= 30 ? 'peringatan' : draft.bahan.length === 0 ? 'netral' : 'bahaya';

  const kirim = (e: FormEvent) => {
    e.preventDefault();
    const hasil = validasiDraftMenu(draft);
    setGalat(hasil);
    if (Object.keys(hasil).length > 0) {
      document.querySelector<HTMLElement>('.dialog [aria-invalid="true"]')?.focus();
      return;
    }
    simpan(draftMenuKeMenu(draft, awal?.id ?? `mn-${Math.random().toString(36).slice(2, 10)}`));
  };

  const ubahBahan = (id: string, perubahan: Partial<DraftMenu['bahan'][number]>) =>
    setDraft((s) => ({ ...s, bahan: s.bahan.map((b) => (b.id === id ? { ...b, ...perubahan } : b)) }));

  return (
    <Dialog
      terbuka={terbuka}
      judul={awal === null ? 'Menu baru' : `Ubah ${awal.nama}`}
      sub="Harga per porsi dipakai untuk menghitung total pesanan. Resep bahan dipakai untuk HPP dan daftar belanja."
      ukuran="lebar"
      tutup={tutup}
      kaki={
        <>
          <span style={{ marginRight: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <Lencana nada={nadaMargin}>
              {draft.bahan.length === 0 ? 'Belum ada resep' : `Margin ${margin}%`}
            </Lencana>
            {draft.bahan.length > 0 && (
              <span className="kecil redup">
                HPP {rupiah(hpp)} · laba {rupiah(labaPerPorsi({ hargaPerPorsi: harga, bahan: draft.bahan.map((b) => ({ id: b.id, nama: b.nama, jumlah: Number.parseFloat(b.jumlah) || 0, satuan: b.satuan, hargaSatuan: Number.parseInt(b.hargaSatuan, 10) || 0 })) }))} / porsi
              </span>
            )}
          </span>
          <div className="grup-kanan" style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="tombol datar" onClick={tutup}>
              Batal
            </button>
            <button type="submit" form="form-menu" className="tombol utama">
              <Save size={15} aria-hidden="true" />
              Simpan menu
            </button>
          </div>
        </>
      }
    >
      <form id="form-menu" className="form" onSubmit={kirim} noValidate>
        <div className="grid-2">
          <div className="medan penuh">
            <label htmlFor="m-nama">
              Nama menu<span className="wajib">*</span>
            </label>
            <input
              id="m-nama"
              type="text"
              value={draft.nama}
              autoComplete="off"
              placeholder="Contoh: Nasi Kotak Ayam Bakar Madura"
              aria-invalid={galat.nama !== undefined}
              aria-describedby={galat.nama === undefined ? undefined : 'e-nama'}
              onChange={(e) => setDraft((s) => ({ ...s, nama: e.target.value }))}
            />
            {galat.nama !== undefined && (
              <p className="galat-teks" id="e-nama" role="alert">
                {galat.nama}
              </p>
            )}
          </div>

          <div className="medan">
            <label htmlFor="m-kat">Kategori</label>
            <select
              id="m-kat"
              value={draft.kategori}
              onChange={(e) => setDraft((s) => ({ ...s, kategori: e.target.value as KategoriMenu }))}
            >
              {KATEGORI_MENU.map((k) => (
                <option key={k} value={k}>
                  {LABEL_KATEGORI[k]}
                </option>
              ))}
            </select>
          </div>

          <div className="medan">
            <label htmlFor="m-harga">
              Harga per porsi (Rp)<span className="wajib">*</span>
            </label>
            <input
              id="m-harga"
              type="number"
              min={1000}
              step={500}
              inputMode="numeric"
              value={draft.hargaPerPorsi}
              placeholder="32000"
              aria-invalid={galat.hargaPerPorsi !== undefined}
              aria-describedby={galat.hargaPerPorsi === undefined ? 'h-harga' : 'e-harga'}
              onChange={(e) => setDraft((s) => ({ ...s, hargaPerPorsi: e.target.value }))}
            />
            {galat.hargaPerPorsi !== undefined ? (
              <p className="galat-teks" id="e-harga" role="alert">
                {galat.hargaPerPorsi}
              </p>
            ) : (
              <p className="petunjuk" id="h-harga">
                Angka bulat tanpa titik ribuan.
              </p>
            )}
          </div>

          <div className="medan">
            <label htmlFor="m-waktu">
              Waktu masak (menit)<span className="wajib">*</span>
            </label>
            <input
              id="m-waktu"
              type="number"
              min={1}
              max={1440}
              value={draft.waktuMasak}
              aria-invalid={galat.waktuMasak !== undefined}
              aria-describedby={galat.waktuMasak === undefined ? 'h-waktu' : 'e-waktu'}
              onChange={(e) => setDraft((s) => ({ ...s, waktuMasak: e.target.value }))}
            />
            {galat.waktuMasak !== undefined ? (
              <p className="galat-teks" id="e-waktu" role="alert">
                {galat.waktuMasak}
              </p>
            ) : (
              <p className="petunjuk" id="h-waktu">
                Dipakai untuk menghitung beban kerja dapur per hari.
              </p>
            )}
          </div>

          <div className="medan penuh">
            <label htmlFor="m-deskripsi">Deskripsi singkat</label>
            <textarea
              id="m-deskripsi"
              rows={2}
              value={draft.deskripsi}
              onChange={(e) => setDraft((s) => ({ ...s, deskripsi: e.target.value }))}
              placeholder="Contoh: Ayam bakar bumbu kecap Madura, nasi putih, sambal terasi, lalapan."
            />
          </div>
        </div>

        <label className="centang" htmlFor="m-tersedia">
          <input
            id="m-tersedia"
            type="checkbox"
            checked={draft.tersedia}
            onChange={(e) => setDraft((s) => ({ ...s, tersedia: e.target.checked }))}
          />
          <span>Tersedia untuk dipesan</span>
        </label>

        <fieldset className="form-set">
          <legend>Resep bahan (per porsi)</legend>
          <p className="petunjuk">
            Isi kebutuhan dan harga satuannya agar aplikasi bisa menghitung HPP, margin, dan daftar
            belanja produksi. Boleh dikosongkan bila belum tahu.
          </p>

          {draft.bahan.length > 0 && (
            <div className="bahan-baris" style={{ fontSize: 'var(--t-xs)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--redup)', paddingBottom: 4, borderBottom: '1px solid var(--garis)' }}>
              <span>Bahan</span>
              <span>Kebutuhan</span>
              <span>Harga satuan</span>
              <span className="sr-only">Aksi</span>
            </div>
          )}

          {draft.bahan.map((b, i) => (
            <div key={b.id} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div className="bahan-baris">
                <input
                  type="text"
                  value={b.nama}
                  placeholder="Nama bahan"
                  aria-label={`Nama bahan baris ${i + 1}`}
                  onChange={(e) => ubahBahan(b.id, { nama: e.target.value })}
                />
                <div style={{ display: 'flex', gap: 4 }}>
                  <input
                    type="number"
                    step="any"
                    min={0}
                    value={b.jumlah}
                    aria-label={`Kebutuhan ${b.nama || `baris ${i + 1}`}`}
                    placeholder="0"
                    onChange={(e) => ubahBahan(b.id, { jumlah: e.target.value })}
                  />
                  <input
                    type="text"
                    value={b.satuan}
                    aria-label={`Satuan baris ${i + 1}`}
                    onChange={(e) => ubahBahan(b.id, { satuan: e.target.value })}
                    style={{ width: 62, flex: '0 0 auto' }}
                  />
                </div>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={b.hargaSatuan}
                  aria-label={`Harga satuan baris ${i + 1}`}
                  placeholder="0"
                  onChange={(e) => ubahBahan(b.id, { hargaSatuan: e.target.value })}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="ikon-tombol"
                    onClick={() => setDraft((s) => ({ ...s, bahan: s.bahan.filter((x) => x.id !== b.id) }))}
                    aria-label={`Hapus bahan ${b.nama || `baris ${i + 1}`}`}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </div>
              </div>
              {galat[`bahan-${i}`] !== undefined && (
                <p className="galat-teks" role="alert">
                  {galat[`bahan-${i}`]}
                </p>
              )}
            </div>
          ))}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="tombol datar"
              onClick={() => setDraft((s) => ({ ...s, bahan: [...s.bahan, bahanKosong()] }))}
            >
              <Plus size={15} aria-hidden="true" />
              Tambah bahan
            </button>
            {hpp > 0 && (
              <span className="kecil redup">
                Total HPP {rupiah(hpp)} per porsi ({desimal(hpp, 0)} rupiah)
              </span>
            )}
          </div>
        </fieldset>
      </form>
    </Dialog>
  );
}

/** Helper untuk menampilkan ringkasan margin di daftar katalog. */
export function labelMargin(m: MenuItem): { teks: string; nada: Nada } {
  if (m.bahan.length === 0) return { teks: 'Belum ada resep', nada: 'netral' };
  const nilai = marginPersen(m);
  return {
    teks: `${nilai}% · HPP ${rupiah(hppPerPorsi(m))}`,
    nada: nilai >= 55 ? 'sukses' : nilai >= 30 ? 'peringatan' : 'bahaya',
  };
}