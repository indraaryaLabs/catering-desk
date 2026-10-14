import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Plus, Save, Trash2, UserRoundPlus } from 'lucide-react';
import type { ItemPesanan, KategoriMenu, MenuItem, Pesanan } from '../types';
import { KATEGORI_MENU, LABEL_KATEGORI } from '../types';
import type { DraftItem, DraftPesanan } from '../lib/validasi';
import { hitungPorsiDraft, hitungTotalDraft, validasiDraftPesanan } from '../lib/validasi';
import { rupiah } from '../lib/format';
import { hppPerPorsi, marginPersen, totalPesanan as totalPesananOf } from '../lib/pesanan';
import { kodePesananBerikutnya } from '../lib/kode';
import { jamSekarang } from '../lib/tanggal';
import { Dialog } from './Dialog';
import { Lencana } from './atom';

interface Properti {
  terbuka: boolean;
  /** null = membuat pesanan baru. */
  awal: Pesanan | null;
  menus: MenuItem[];
  pesanan: Pesanan[];
  tanggalDefault: string;
  tutup: () => void;
  simpan: (pesanan: Pesanan) => void;
}

function barisKosong(): DraftItem {
  return { id: `it-${Math.random().toString(36).slice(2, 9)}`, menuId: '', jumlahPorsi: '' };
}

function draftAwal(awal: Pesanan | null, tanggalDefault: string): DraftPesanan {
  if (awal !== null) {
    return {
      namaPelanggan: awal.namaPelanggan,
      kontak: awal.kontak,
      jenisAcara: awal.jenisAcara,
      tanggalAcara: awal.tanggalAcara,
      jamAcara: awal.jamAcara,
      alamat: awal.alamat,
      pengantar: awal.pengantar,
      items: awal.items.map((i) => ({ id: i.id, menuId: i.menuId, jumlahPorsi: String(i.jumlahPorsi) })),
      catatan: awal.catatan,
      catatanAntar: awal.catatanAntar,
      dp: awal.dp === 0 ? '' : String(awal.dp),
    };
  }
  return {
    namaPelanggan: '',
    kontak: '',
    jenisAcara: '',
    tanggalAcara: tanggalDefault,
    jamAcara: jamSekarang(),
    alamat: '',
    pengantar: '',
    items: [barisKosong()],
    catatan: '',
    catatanAntar: '',
    dp: '',
  };
}

export function FormPesanan({
  terbuka,
  awal,
  menus,
  pesanan,
  tanggalDefault,
  tutup,
  simpan,
}: Properti): ReactNode {
  const [draft, setDraft] = useState<DraftPesanan>(() => draftAwal(awal, tanggalDefault));
  const [galat, setGalat] = useState<Record<string, string>>({});

  useEffect(() => {
    if (terbuka) {
      setDraft(draftAwal(awal, tanggalDefault));
      setGalat({});
    }
  }, [terbuka, awal, tanggalDefault]);

  const perKategori = useMemo(
    () => new Map(KATEGORI_MENU.map((k) => [k, menus.filter((m) => m.kategori === k)])),
    [menus],
  );

  const total = hitungTotalDraft(draft.items, menus);
  const totalPorsi = hitungPorsiDraft(draft.items);
  const dp = draft.dp.trim() === '' ? 0 : Number.parseInt(draft.dp, 10) || 0;

  const perbarui = (perubahan: Partial<DraftPesanan>) => setDraft((s) => ({ ...s, ...perubahan }));

  const perbaruiItem = (id: string, perubahan: Partial<DraftItem>) =>
    setDraft((s) => ({ ...s, items: s.items.map((i) => (i.id === id ? { ...i, ...perubahan } : i)) }));

  const kirim = (e: FormEvent) => {
    e.preventDefault();
    const hasil = validasiDraftPesanan(draft, menus);
    setGalat(hasil);
    if (Object.keys(hasil).length > 0) {
      document.querySelector<HTMLElement>('.dialog [aria-invalid="true"]')?.focus();
      return;
    }

    const index = new Map(menus.map((m) => [m.id, m]));
    const items: ItemPesanan[] = draft.items
      .filter((i) => i.menuId !== '')
      .map((i) => {
        const menu = index.get(i.menuId);
        return {
          id: i.id,
          menuId: i.menuId,
          namaMenu: menu?.nama ?? 'Menu',
          kategori: menu?.kategori ?? ('makanan' as KategoriMenu),
          hargaPerPorsi: menu?.hargaPerPorsi ?? 0,
          jumlahPorsi: Number.parseInt(i.jumlahPorsi, 10) || 0,
        };
      });

    const sekarang = new Date().toISOString();
    const hasilPesanan: Pesanan = {
      id: awal?.id ?? `ps-${Math.random().toString(36).slice(2, 10)}`,
      kode: awal?.kode ?? '',
      namaPelanggan: draft.namaPelanggan.trim(),
      kontak: draft.kontak.trim(),
      jenisAcara: draft.jenisAcara.trim(),
      tanggalAcara: draft.tanggalAcara,
      jamAcara: draft.jamAcara,
      alamat: draft.alamat.trim(),
      pengantar: draft.pengantar.trim(),
      items,
      catatan: draft.catatan.trim(),
      catatanAntar: draft.catatanAntar.trim(),
      dp,
      status: awal?.status ?? 'inquiry',
      sumber: awal?.sumber ?? 'manual',
      dibuatPada: awal?.dibuatPada ?? sekarang,
      diperbaruiPada: sekarang,
    };
    if (hasilPesanan.kode === '') {
      hasilPesanan.kode = kodePesananBerikutnya([...pesanan, hasilPesanan], hasilPesanan.tanggalAcara);
    }
    simpan(hasilPesanan);
  };

  const galatId = (kunci: string) => (galat[kunci] === undefined ? undefined : `galat-${kunci}`);
  const totalAkhir = totalPesananOf({ items: draft.items.filter((i) => i.menuId !== '').map((i) => ({
    id: i.id,
    menuId: i.menuId,
    namaMenu: '',
    kategori: 'makanan' as KategoriMenu,
    hargaPerPorsi: menus.find((m) => m.id === i.menuId)?.hargaPerPorsi ?? 0,
    jumlahPorsi: Number.parseInt(i.jumlahPorsi, 10) || 0,
  })) });

  return (
    <Dialog
      terbuka={terbuka}
      judul={awal === null ? 'Pesanan baru' : `Ubah ${awal.kode}`}
      sub={
        awal === null
          ? 'Isi detail pelanggan, jadwal acara, dan menu yang dipesan.'
          : 'Perubahan langsung tersimpan di peramban ini dan bisa dibatalkan dengan Ctrl+Z.'
      }
      ukuran="lebar"
      tutup={tutup}
      kaki={
        <>
          <span className="redup kecil" style={{ marginRight: 'auto' }}>
            {totalPorsi.toLocaleString('id-ID')} porsi · {rupiah(totalAkhir)}
          </span>
          <div className="grup-kanan" style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="tombol datar" onClick={tutup}>
              Batal
            </button>
            <button type="submit" form="form-pesanan" className="tombol utama">
              <Save size={15} aria-hidden="true" />
              {awal === null ? 'Simpan pesanan' : 'Simpan perubahan'}
            </button>
          </div>
        </>
      }
    >
      <form id="form-pesanan" className="form" onSubmit={kirim} noValidate>
        <fieldset className="form-set">
          <legend>Pelanggan & acara</legend>
          <div className="grid-2">
            <Medan
              id="f-nama"
              label="Nama pelanggan"
              wajib
              galat={galat.namaPelanggan}
              help={galatId('namaPelanggan')}
              value={draft.namaPelanggan}
              placeholder="Contoh: Ratna Kusumawardani"
              onChange={(v) => perbarui({ namaPelanggan: v })}
            />
            <Medan
              id="f-kontak"
              label="Nomor kontak"
              help={galat.kontak === undefined ? 'Opsional — hanya untuk menghubungi pelanggan.' : galatId('kontak')}
              galat={galat.kontak}
              value={draft.kontak}
              placeholder="Contoh: 0812 3456 7890"
              onChange={(v) => perbarui({ kontak: v })}
            />
            <Medan
              id="f-acara"
              label="Jenis acara"
              wajib
              galat={galat.jenisAcara}
              help={galatId('jenisAcara')}
              value={draft.jenisAcara}
              placeholder="Contoh: Pengajian Bulanan"
              onChange={(v) => perbarui({ jenisAcara: v })}
            />
            <Medan
              id="f-tanggal"
              label="Tanggal acara"
              wajib
              type="date"
              galat={galat.tanggalAcara}
              help={galatId('tanggalAcara')}
              value={draft.tanggalAcara}
              onChange={(v) => perbarui({ tanggalAcara: v })}
            />
            <Medan
              id="f-jam"
              label="Jam acara"
              wajib
              type="time"
              galat={galat.jamAcara}
              help={galatId('jamAcara')}
              value={draft.jamAcara}
              onChange={(v) => perbarui({ jamAcara: v })}
            />
            <Medan
              id="f-pengantar"
              label="Pengantar"
              help="Kosongkan bila pelanggan ambil sendiri."
              value={draft.pengantar}
              placeholder="Contoh: Ahmad (mitra)"
              onChange={(v) => perbarui({ pengantar: v })}
            />
            <Medan
              id="f-alamat"
              label="Alamat pengiriman"
              wajib
              penuh
              galat={galat.alamat}
              help={galatId('alamat')}
              value={draft.alamat}
              placeholder="Contoh: Jl. Poros Mandonga No. 12, Kendari"
              onChange={(v) => perbarui({ alamat: v })}
            />
          </div>
        </fieldset>

        <fieldset className="form-set">
          <legend>Menu dipesan</legend>
          <div className="tabel-item">
            <div className="tabel-item-kepala">
              <span>Menu</span>
              <span>Harga / porsi</span>
              <span>Porsi</span>
              <span className="kanan">Subtotal</span>
              <span className="sr-only">Aksi</span>
            </div>

            {draft.items.map((item, i) => {
              const menu = menus.find((m) => m.id === item.menuId);
              const porsi = Number.parseInt(item.jumlahPorsi, 10);
              const subtotal = Number.isFinite(porsi) && porsi > 0 ? (menu?.hargaPerPorsi ?? 0) * porsi : 0;
              return (
                <div className="tabel-item-baris" key={item.id}>
                  <div>
                    <label className="sr-only" htmlFor={`i-menu-${item.id}`}>
                      Menu baris {i + 1}
                    </label>
                    <select
                      id={`i-menu-${item.id}`}
                      value={item.menuId}
                      onChange={(e) => perbaruiItem(item.id, { menuId: e.target.value })}
                    >
                      <option value="">— Pilih menu —</option>
                      {KATEGORI_MENU.map((kategori) => {
                        const daftar = perKategori.get(kategori) ?? [];
                        if (daftar.length === 0) return null;
                        return (
                          <optgroup key={kategori} label={LABEL_KATEGORI[kategori]}>
                            {daftar.map((m) => (
                              <option key={m.id} value={m.id} disabled={!m.tersedia && m.id !== item.menuId}>
                                {m.nama}
                                {m.tersedia ? '' : ' — tidak tersedia'}
                              </option>
                            ))}
                          </optgroup>
                        );
                      })}
                    </select>
                  </div>

                  <span className="kecil redup">{menu === undefined ? '—' : rupiah(menu.hargaPerPorsi)}</span>

                  <div>
                    <label className="sr-only" htmlFor={`i-porsi-${item.id}`}>
                      Jumlah porsi baris {i + 1}
                    </label>
                    <input
                      id={`i-porsi-${item.id}`}
                      type="number"
                      min={1}
                      step={1}
                      inputMode="numeric"
                      value={item.jumlahPorsi}
                      onChange={(e) => perbaruiItem(item.id, { jumlahPorsi: e.target.value })}
                      placeholder="0"
                    />
                  </div>

                  <span className="kanan tebal">{rupiah(subtotal)}</span>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="ikon-tombol"
                      onClick={() =>
                        setDraft((s) => ({
                          ...s,
                          items:
                            s.items.length === 1
                              ? [barisKosong()]
                              : s.items.filter((x) => x.id !== item.id),
                        }))
                      }
                      aria-label={`Hapus baris menu ${i + 1}`}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {galat.items !== undefined && (
            <p className="galat-teks" role="alert">
              {galat.items}
            </p>
          )}

          <div className="tombol-baris" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="tombol datar" onClick={() => setDraft((s) => ({ ...s, items: [...s.items, barisKosong()] }))}>
              <Plus size={15} aria-hidden="true" />
              Tambah menu
            </button>
            {total > 0 && (
              <Lencana nada="netral">
                Total {rupiah(total)} · sisa {rupiah(Math.max(0, total - dp))}
              </Lencana>
            )}
          </div>
        </fieldset>

        <fieldset className="form-set">
          <legend>Pembayaran & catatan</legend>
          <div className="grid-2">
            <div className="medan">
              <label htmlFor="f-dp">
                DP / uang muka (Rp)
              </label>
              <input
                id="f-dp"
                type="number"
                min={0}
                step={1000}
                inputMode="numeric"
                value={draft.dp}
                aria-invalid={galat.dp !== undefined}
                aria-describedby={galat.dp === undefined ? 'h-dp' : 'galat-dp'}
                onChange={(e) => perbarui({ dp: e.target.value })}
                placeholder="0"
              />
              {galat.dp !== undefined ? (
                <p className="galat-teks" id="galat-dp" role="alert">
                  {galat.dp}
                </p>
              ) : (
                <p className="petunjuk" id="h-dp">
                 Dicatat manual; aplikasi tidak memproses pembayaran.
                </p>
              )}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button type="button" className="tombol kecil datar" onClick={() => perbarui({ dp: String(Math.round(total / 2)) })}>
                  DP 50%
                </button>
                <button type="button" className="tombol kecil datar" onClick={() => perbarui({ dp: String(total) })}>
                  Lunas
                </button>
                <button type="button" className="tombol kecil datar" onClick={() => perbarui({ dp: '' })}>
                  Tanpa DP
                </button>
              </div>
            </div>
            <div className="medan penuh">
              <label htmlFor="f-catatan">Catatan dapur</label>
              <textarea
                id="f-catatan"
                rows={2}
                value={draft.catatan}
                onChange={(e) => perbarui({ catatan: e.target.value })}
                placeholder="Contoh: Sambal dipisah, level PEDAS sedang."
              />
            </div>
            <div className="medan penuh">
              <label htmlFor="f-antar">Catatan pengiriman</label>
              <textarea
                id="f-antar"
                rows={2}
                value={draft.catatanAntar}
                onChange={(e) => perbarui({ catatanAntar: e.target.value })}
                placeholder="Contoh: Masuk gerbang belakang, titip ke satpam."
              />
            </div>
          </div>
        </fieldset>

        <p className="catatan">
          <UserRoundPlus size={13} aria-hidden="true" />
          <span>
            Harga per porsi disimpan sebagai catatan saat pesanan dibuat. Mengubah harga katalog tidak
            mengubah riwayat pesanan lama.
          </span>
        </p>
      </form>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */

interface MedanProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  wajib?: boolean;
  penuh?: boolean;
  galat?: string;
  help?: string;
  placeholder?: string;
  type?: string;
}

function Medan({
  id,
  label,
  value,
  onChange,
  wajib,
  penuh,
  galat,
  help,
  placeholder,
  type = 'text',
}: MedanProps): ReactNode {
  return (
    <div className={`medan${penuh === true ? ' penuh' : ''}`}>
      <label htmlFor={id}>
        {label}
        {wajib === true && <span className="wajib" aria-hidden="true">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        aria-invalid={galat !== undefined}
        aria-describedby={galat !== undefined ? `galat-${id}` : help !== undefined ? `${id}-help` : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {galat !== undefined ? (
        <p className="galat-teks" id={`galat-${id}`} role="alert">
          {galat}
        </p>
      ) : help !== undefined ? (
        <p className="petunjuk" id={`${id}-help`}>
          {help}
        </p>
      ) : null}
    </div>
  );
}

/** Dipakai halaman detail untuk menjelaskan margin sebuah menu. */
export function ringkasMargin(menu: MenuItem): string {
  if (menu.bahan.length === 0) return 'Resep belum diisi';
  return `HPP ${rupiah(hppPerPorsi(menu))} · margin ${marginPersen(menu)}%`;
}
