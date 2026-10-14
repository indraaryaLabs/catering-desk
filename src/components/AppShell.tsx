import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  BarChart3,
  BookOpen,
  Bot,
  ChefHat,
  ChevronLeft,
  CircleCheck,
  Database,
  History,
  LayoutGrid,
  Menu as IkonMenu,
  Moon,
  RotateCcw,
  Rows3,
  Search,
  Sun,
  Users,
} from 'lucide-react';
import { HALAMAN, useHashRute } from '../lib/router';
import type { Halaman } from '../lib/router';
import { useToko } from '../state/toko';
import { waktuLokal } from '../lib/tanggal';

const IKON: Record<string, ReactNode> = {
  ringkasan: <LayoutGrid size={17} aria-hidden="true" />,
  pesanan: <ChefHat size={17} aria-hidden="true" />,
  pelanggan: <Users size={17} aria-hidden="true" />,
  menu: <BookOpen size={17} aria-hidden="true" />,
  produksi: <Rows3 size={17} aria-hidden="true" />,
  laporan: <BarChart3 size={17} aria-hidden="true" />,
  otomasi: <Bot size={17} aria-hidden="true" />,
  data: <Database size={17} aria-hidden="true" />,
};

function isMac(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
}

interface Properti {
  onBukaPalet: () => void;
  onResetDemo: () => void;
  topbarAksi?: ReactNode;
  children: ReactNode;
}

export function AppShell({ onBukaPalet, onResetDemo, topbarAksi, children }: Properti): ReactNode {
  const { data, setPreferensi } = useToko();
  const { halaman, definisi, buka } = useHashRute();
  // Di bawah AMBANG_LACI navigasi menjadi laci yang menutupi layar; di atas itu
  // sidebar selalu terlihat sebagai kolom tetap dan tidak pernah perlu tirai.
  // Nilai ini harus sama dengan breakpoint di stylesheet.
  const AMBANG_LACI = 1024;

  const [mobile, setMobile] = useState(() => window.innerWidth < AMBANG_LACI);

  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < AMBANG_LACI);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const [sidebarTutup, setSidebarTutup] = useState(() => window.innerWidth < AMBANG_LACI);

  // Saat berpindah antara mode laci dan mode kolom, navigasi kembali ke
  // keadaan yang wajar: tertutup di layar kecil, terbuka di layar lebar.
  useEffect(() => {
    setSidebarTutup(mobile);
  }, [mobile]);

  const inquiry = useMemo(() => data.pesanan.filter((p) => p.status === 'inquiry').length, [data.pesanan]);
  const tugasAktif = useMemo(() => data.tugas.filter((t) => !t.selesai).length, [data.tugas]);

  const gantiTema = useCallback(() => {
    const urutan = ['terang', 'gelap', 'sistem'] as const;
    const berikutnya = urutan[(urutan.indexOf(data.preferensi.tema) + 1) % urutan.length];
    setPreferensi({ ...data.preferensi, tema: berikutnya });
  }, [data.preferensi, setPreferensi]);

  const gelapAktif = useMemo(() => {
    if (data.preferensi.tema === 'sistem') {
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches === true;
    }
    return data.preferensi.tema === 'gelap';
  }, [data.preferensi.tema]);

  const IkonTema = gelapAktif ? Moon : Sun;

  const lencana = (rute: Halaman): { nilai: number; judul: string } | null => {
    if (rute === 'pesanan' && inquiry > 0) return { nilai: inquiry, judul: `${inquiry} inquiry menunggu konfirmasi` };
    if (rute === 'otomasi' && tugasAktif > 0) return { nilai: tugasAktif, judul: `${tugasAktif} tugas aktif` };
    return null;
  };

  return (
    <div className="kerangka-app" data-sidebar={sidebarTutup ? 'tutup' : 'buka'}>
      {mobile && !sidebarTutup && (
        <button
          type="button"
          className="tirai"
          aria-label="Tutup navigasi"
          onClick={() => setSidebarTutup(true)}
        />
      )}

      <aside className="sidebar" aria-label="Navigasi utama">
        <div className="sidebar-merek">
          <span className="logo" aria-hidden="true">
            <ChefHat size={19} strokeWidth={2.1} />
          </span>
          <span className="merek-teks">
            <b>Catering Desk</b>
            <small>SatuArah Labs</small>
          </span>
          {!sidebarTutup && (
            <button
              type="button"
              className="ikon-tombol"
              style={{ marginLeft: 'auto' }}
              onClick={() => setSidebarTutup(true)}
              aria-label="Sembunyikan navigasi"
            >
              <ChevronLeft size={17} aria-hidden="true" />
            </button>
          )}
        </div>

        <nav className="nav">
          <p className="nav-label">Ruang kerja</p>
          <ul>
            {HALAMAN.map((h) => {
              const rute = h.rute as Halaman;
              const n = lencana(rute);
              return (
                <li key={h.rute}>
                  <button
                    type="button"
                    className="nav-item"
                    aria-current={h.rute === halaman ? 'page' : undefined}
                    onClick={() => {
                      buka(rute);
                      if (window.innerWidth < 1024) setSidebarTutup(true);
                    }}
                  >
                    {IKON[h.ikon]}
                    <span>{h.label}</span>
                    {n !== null && (
                      <span className="nav-badge" title={n.judul}>
                        {n.nilai}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="sidebar-kaki">
          <button type="button" className="tombol datar penuh" onClick={onBukaPalet} style={{ justifyContent: 'flex-start', gap: 8 }}>
            <Search size={15} aria-hidden="true" />
            Cari perintah
            <span className="kbd" style={{ marginLeft: 'auto' }}>
              {isMac() ? '⌘' : 'Ctrl'}K
            </span>
          </button>

          <button
            type="button"
            className="tombol datar penuh"
            onClick={gantiTema}
            style={{ justifyContent: 'flex-start', gap: 8 }}
            aria-label={`Tema ${data.preferensi.tema}. Klik untuk mengganti tema.`}
          >
            <IkonTema size={15} aria-hidden="true" />
            Tema {data.preferensi.tema}
          </button>

          {data.contoh && (
            <p className="tip-bar" style={{ alignItems: 'flex-start' }}>
              <CircleCheck size={14} aria-hidden="true" style={{ marginTop: 1, flex: '0 0 auto' }} />
              <span>Data contoh aktif — tersimpan di peramban ini saja.</span>
            </p>
          )}

          <button
            type="button"
            className="tombol halus penuh"
            onClick={onResetDemo}
            style={{ justifyContent: 'flex-start', gap: 8 }}
          >
            <RotateCcw size={15} aria-hidden="true" />
            Reset ke data contoh
          </button>

          <p className="catatan" style={{ padding: '2px 2px 0' }}>
            <History size={13} aria-hidden="true" />
            <span>Tersimpan {waktuLokal(data.disimpanPada)}</span>
          </p>
        </div>
      </aside>

      <div className="isi">
        <header className="topbar">
          {sidebarTutup && (
            <button
              type="button"
              className="ikon-tombol hanya-mobile"
              onClick={() => setSidebarTutup(false)}
              aria-label="Buka navigasi"
            >
              <IkonMenu size={19} aria-hidden="true" />
            </button>
          )}
          <div className="topbar-teks">
            <h1>{definisi.judul}</h1>
            <p>{definisi.sub}</p>
          </div>
          {topbarAksi !== undefined && <div className="topbar-aksi tanpa-cetak">{topbarAksi}</div>}
        </header>
        <main className="konten" id="konten-utama">
          {children}
        </main>
      </div>
    </div>
  );
}