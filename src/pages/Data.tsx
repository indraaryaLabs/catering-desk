import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AlertTriangle,
  Database,
  Download,
  FileJson,
  Keyboard,
  Moon,
  RotateCcw,
  Sun,
  Upload,
} from 'lucide-react';
import { useToko } from '../state/toko';
import {
  bacaBerkasTeks,
  aturanKeCSV,
  menuKeCSV,
  namaBerkasTanggal,
  pesananKeCSV,
  tugasKeCSV,
  unduhJSON,
  unduhTeks,
} from '../lib/csv';
import { kunciStorage, ukuranDataTersimpan, versiSkema } from '../lib/storage';
import { keBackup } from '../state/reducer';
import { hppPerPorsi } from '../lib/pesanan';
import { ringkasAturan } from '../lib/otomasi';
import { LABEL_TINDAKAN, PREFSI_BAWAAN } from '../types';
import { validasiBackup } from '../lib/validasi';
import { angka, rupiah } from '../lib/format';
import { tanggalPendek, waktuLokal } from '../lib/tanggal';
import { Kartu, Lencana } from '../components/atom';
import { useKirimNotif } from '../components/Notifikasi';
import { useKonfirmasi } from '../components/Konfirmasi';

export function HalamanData({ onBukaBantuan }: { onBukaBantuan: () => void }): ReactNode {
  const { data, hariIni, imporData, resetDemo, setPreferensi, catatanPemuat, sumberData } = useToko();
  const notif = useKirimNotif();
  const { konfirmasi } = useKonfirmasi();
  const input = useRef<HTMLInputElement>(null);
  const [sibuk, setSibuk] = useState(false);

  const ringkas = {
    menus: data.menus.length,
    pesanan: data.pesanan.length,
    tugas: data.tugas.length,
    aturan: data.aturan.length,
    aktivitas: data.aktivitas.length,
  };

  useEffect(() => {
    document.documentElement.dataset.kepadatan = data.preferensi.kepadatan;
  }, [data.preferensi.kepadatan]);

  const eksporJSON = () => {
    unduhJSON(`catering-desk-cadangan-${hariIni}.json`, keBackup(data));
    notif(`Cadangan ${angka(ringkas.pesanan)} pesanan dan ${angka(ringkas.menus)} menu diunduh.`);
  };

  const eksporPesanan = () => {
    unduhTeks(namaBerkasTanggal('pesanan', hariIni), pesananKeCSV(data.pesanan));
    notif(`${angka(data.pesanan.length)} pesanan diekspor ke CSV.`);
  };

  const eksporMenu = () => {
    const peta = new Map(data.menus.map((m) => [m.id, hppPerPorsi(m)]));
    unduhTeks(namaBerkasTanggal('menu', hariIni), menuKeCSV(data.menus, peta));
    notif(`${angka(data.menus.length)} menu diekspor ke CSV.`);
  };

  const eksporTugas = () => {
    unduhTeks(namaBerkasTanggal('tugas', hariIni), tugasKeCSV(data.tugas));
    notif(`${angka(data.tugas.length)} tugas diekspor.`);
  };

  const eksporAturan = () => {
    unduhTeks(namaBerkasTanggal('aturan', hariIni), aturanKeCSV(data.aturan, ringkasAturan, (j) => LABEL_TINDAKAN[j as keyof typeof LABEL_TINDAKAN] ?? j));
    notif(`${angka(data.aturan.length)} aturan diekspor.`);
  };

  const pilihBerkas = async (berkas: File) => {
    setSibuk(true);
    try {
      const teks = await bacaBerkasTeks(berkas);
      let terurai: unknown;
      try {
        terurai = JSON.parse(teks);
      } catch {
        notif('Berkas bukan JSON yang sah. Data Anda tidak berubah.', 'galat');
        return;
      }
      const hasil = validasiBackup(terurai, versiSkema());
      if (!hasil.ok) {
        notif(`Impor ditolak: ${hasil.pesan}`, 'galat');
        return;
      }
      const boleh = await konfirmasi({
        judul: 'Ganti seluruh data lokal?',
        pesan: `Berkas berisi ${angka(hasil.data.pesanan.length)} pesanan, ${angka(hasil.data.menus.length)} menu, ${angka(hasil.data.tugas.length)} tugas. Data di peramban ini akan ditimpa.`,
        detail: 'Sebaiknya unduh cadangan JSON yang sekarang sebelum melanjutkan.',
        merusak: true,
        labelYa: 'Ya, impor sekarang',
      });
      if (!boleh) {
        notif('Impor dibatalkan; data tidak berubah.', 'info');
        return;
      }
      imporData(hasil.data);
      notif('Data berhasil diimpor dari berkas cadangan.');
    } catch {
      notif('Berkas tidak bisa dibaca. Data Anda tidak berubah.', 'galat');
    } finally {
      setSibuk(false);
      if (input.current !== null) input.current.value = '';
    }
  };

  const reset = async () => {
    const boleh = await konfirmasi({
      judul: 'Reset ke data contoh?',
      pesan: 'Semua pesanan, menu, tugas, dan aturan yang Anda buat akan diganti dengan data contoh bawaan.',
      detail: `Data contoh dibuat ulang berdasarkan tanggal ${tanggalPendek(hariIni)}, sehingga dashboard selalu berisi agenda hari ini.`,
      merusak: true,
      labelYa: 'Ya, reset sekarang',
    });
    if (!boleh) {
      notif('Reset dibatalkan.', 'info');
      return;
    }
    resetDemo();
    notif('Data contoh berhasil dimuat ulang.');
  };

  return (
    <div className="tumpuk">
      {catatanPemuat !== null && (
        <div className="catatan-hati">
          <AlertTriangle size={15} aria-hidden="true" />
          <span>{catatanPemuat}</span>
        </div>
      )}

      <Kartu judul="Penyimpanan lokal" sub="Semua data tinggal di peramban ini. Tidak ada server, tidak ada akun.">
        <div className="statistik">
          <div>
            <dt>Pesanan</dt>
            <dd>{angka(ringkas.pesanan)}</dd>
            <small>{rupiah(data.pesanan.reduce((n, p) => n + p.items.reduce((m, i) => m + i.hargaPerPorsi * i.jumlahPorsi, 0), 0))}</small>
          </div>
          <div>
            <dt>Menu</dt>
            <dd>{angka(ringkas.menus)}</dd>
            <small>{angka(data.menus.filter((m) => m.tersedia).length)} tersedia</small>
          </div>
          <div>
            <dt>Tugas</dt>
            <dd>{angka(ringkas.tugas)}</dd>
            <small>{angka(data.tugas.filter((t) => !t.selesai).length)} terbuka</small>
          </div>
          <div>
            <dt>Aturan</dt>
            <dd>{angka(ringkas.aturan)}</dd>
            <small>{angka(data.aturan.filter((a) => a.aktif).length)} aktif</small>
          </div>
          <div>
            <dt>Versi skema</dt>
            <dd>v{versiSkema()}</dd>
            <small>{kunciStorage()}</small>
          </div>
          <div>
            <dt>Ukuran</dt>
            <dd>±{angka(Math.round(ukuranDataTersimpan() / 1024))} KB</dd>
            <small>{waktuLokal(data.disimpanPada)}</small>
          </div>
        </div>
      </Kartu>

      <div className="dua-kolom">
        <Kartu judul="Ekspor" sub="Unduh salinan data untuk arsip atau dipindah ke perangkat lain">
          <div style={{ display: 'grid', gap: 8 }}>
            <button type="button" className="tombol utama" onClick={eksporJSON}>
              <FileJson size={15} aria-hidden="true" />
              Cadangan JSON lengkap
            </button>
            <button type="button" className="tombol datar" onClick={eksporPesanan}>
              <Download size={15} aria-hidden="true" />
              Pesanan (CSV)
            </button>
            <button type="button" className="tombol datar" onClick={eksporMenu}>
              <Download size={15} aria-hidden="true" />
              Katalog menu & HPP (CSV)
            </button>
            <button type="button" className="tombol datar" onClick={eksporTugas}>
              <Download size={15} aria-hidden="true" />
              Tugas (CSV)
            </button>
            <button type="button" className="tombol datar" onClick={eksporAturan}>
              <Download size={15} aria-hidden="true" />
              Aturan otomatisasi (CSV)
            </button>
          </div>
        </Kartu>

        <Kartu judul="Impor cadangan" sub="Hanya berkas JSON hasil ekspor aplikasi ini">
          <label className="tombol datar penuh" htmlFor="impor" style={{ padding: 12 }}>
            <Upload size={15} aria-hidden="true" />
            {sibuk ? 'Memproses…' : 'Pilih berkas JSON'}
            <input
              id="impor"
              ref={input}
              type="file"
              accept="application/json,.json"
              disabled={sibuk}
              style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
              onChange={(e) => {
                const b = e.target.files?.[0];
                if (b !== undefined) void pilihBerkas(b);
              }}
            />
          </label>
          <p className="catatan" style={{ marginTop: 12 }}>
            <AlertTriangle size={13} aria-hidden="true" />
            <span>
              Berkas diperiksa lebih dahulu. Jika strukturnya salah, impor ditolak dan data lokal Anda
              tidak akan berubah.
            </span>
          </p>
        </Kartu>
      </div>

      <Kartu judul="Preferensi tampilan" sub="Disimpan terpisah agar tetap berlaku setelah reset data">
        <div className="grid-2">
          <div className="medan">
            <label htmlFor="p-tema">Tema</label>
            <select id="p-tema" value={data.preferensi.tema} onChange={(e) => setPreferensi({ ...data.preferensi, tema: e.target.value as 'terang' | 'gelap' | 'sistem' })}>
              <option value="sistem">Ikuti sistem</option>
              <option value="terang">Terang</option>
              <option value="gelap">Gelap</option>
            </select>
          </div>
          <div className="medan">
            <label htmlFor="p-kepadatan">Kepadatan</label>
            <select id="p-kepadatan" value={data.preferensi.kepadatan} onChange={(e) => {
              setPreferensi({ ...data.preferensi, kepadatan: e.target.value as 'nyaman' | 'padat' });
              document.documentElement.dataset.kepadatan = e.target.value === 'padat' ? 'padat' : 'nyaman';
            }}>
              <option value="nyaman">Nyaman</option>
              <option value="padat">Padat</option>
            </select>
          </div>
          <div className="medan penuh">
            <label htmlFor="p-ambang">Ambang beban dapur (porsi/hari)</label>
            <input
              id="p-ambang"
              type="number"
              min={20}
              max={5000}
              step={10}
              value={data.preferensi.ambangBeban}
              onChange={(e) => {
                const n = Number.parseInt(e.target.value, 10);
                if (Number.isFinite(n) && n >= 20) setPreferensi({ ...data.preferensi, ambangBeban: n });
              }}
            />
            <p className="petunjuk">
              Beban harian dihitung terhadap angka ini. Default {angka(PREFSI_BAWAAN.ambangBeban)} porsi.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <Lencana nada="netral">
            <Sun size={12} aria-hidden="true" />
            Terang
          </Lencana>
          <Lencana nada="netral">
            <Moon size={12} aria-hidden="true" />
            Gelap
          </Lencana>
          <Lencana nada="merek">Sumber data: {sumberData}</Lencana>
        </div>
      </Kartu>

      <div className="dua-kolom">
        <Kartu judul="Pintasan keyboard" sub="Aplikasi bisa dipakai tanpa mouse">
          <div style={{ display: 'grid', gap: 6 }}>
            {[
              ['Ctrl / ⌘ + K', 'Buka palet perintah'],
              ['N', 'Pesanan baru'],
              ['/', 'Fokus ke pencarian'],
              ['Ctrl / ⌘ + Z', 'Batalkan aksi terakhir'],
              ['Ctrl / ⌘ + Shift + Z', 'Ulangi aksi'],
              ['?', 'Buka daftar pintasan ini'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 'var(--t-sm)' }}>
                <span className="kbd">{k}</span>
                <span className="redup">{v}</span>
              </div>
            ))}
          </div>
          <button type="button" className="tombol datar penuh" style={{ marginTop: 12 }} onClick={onBukaBantuan}>
            <Keyboard size={15} aria-hidden="true" />
            Tampilkan di aplikasi
          </button>
        </Kartu>

        <Kartu judul="Reset" sub="Kembalikan ke kondisi awal seperti saat pertama dibuka">
          <p className="petunjuk" style={{ marginBottom: 12 }}>
            Reset menghapus seluruh perubahan lokal lalu memuat ulang {angka(DAFTAR_AWAL.pesanan)} pesanan
            dan {angka(DAFTAR_AWAL.menus)} menu contoh yang dibuat ulang mengikuti tanggal hari ini.
          </p>
          <button type="button" className="tombol bahaya" onClick={() => void reset()}>
            <RotateCcw size={15} aria-hidden="true" />
            Reset ke data contoh
          </button>
          <p className="catatan" style={{ marginTop: 12 }}>
            <Database size={13} aria-hidden="true" />
            <span>
              Preferensi tampilan tidak ikut ter-reset. Aksi ini bisa dibatalkan dengan Ctrl+Z selama
              sesi masih terbuka.
            </span>
          </p>
        </Kartu>
      </div>
    </div>
  );
}

/* Nilai contoh dipakai hanya untuk menjelaskan jumlah, bukan sebagai data. */
const DAFTAR_AWAL = { pesanan: 16, menus: 12 };
