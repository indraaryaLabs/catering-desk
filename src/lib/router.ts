import { useCallback, useEffect, useState } from 'react';

export type Halaman = 'ringkasan' | 'pesanan' | 'pelanggan' | 'menu' | 'produksi' | 'laporan' | 'otomasi' | 'data';

export interface DefinisiHalaman {
  rute: string;
  label: string;
  judul: string;
  sub: string;
  ikon: string;
}

export const HALAMAN: DefinisiHalaman[] = [
  { rute: 'ringkasan', label: 'Ringkasan', judul: 'Ringkasan', sub: 'Satu layar untuk tahu apa yang perlu dikerjakan hari ini.', ikon: 'ringkasan' },
  { rute: 'pesanan', label: 'Pesanan', judul: 'Pesanan', sub: 'Semua order masuk, dari inquiry sampai selesai.', ikon: 'pesanan' },
  { rute: 'pelanggan', label: 'Pelanggan', judul: 'Pelanggan', sub: 'Riwayat, pola pesan, dan pelanggan yang perlu dijaga.', ikon: 'pelanggan' },
  { rute: 'menu', label: 'Menu', judul: 'Katalog Menu', sub: 'Harga jual, resep bahan, dan margin setiap menu.', ikon: 'menu' },
  { rute: 'produksi', label: 'Produksi', judul: 'Produksi Harian', sub: 'Rencana masak, daftar belanja, dan tiket dapur.', ikon: 'produksi' },
  { rute: 'laporan', label: 'Laporan', judul: 'Laporan', sub: 'Tren pendapatan, komposisi menu, dan umur piutang.', ikon: 'laporan' },
  { rute: 'otomasi', label: 'Otomasi', judul: 'Otomasi', sub: 'Aturan yang dikerjakan aplikasi untuk Anda.', ikon: 'otomasi' },
  { rute: 'data', label: 'Data', judul: 'Data & Cadangan', sub: 'Ekspor, impor, preferensi, dan reset data contoh.', ikon: 'data' },
];

function bacaHash(): Halaman {
  const mentah = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  const ketemu = HALAMAN.find((h) => h.rute === mentah);
  return ketemu?.rute === undefined ? 'ringkasan' : (ketemu.rute as Halaman);
}

export interface Rute {
  halaman: Halaman;
  definisi: DefinisiHalaman;
  buka: (halaman: Halaman) => void;
}

export function useHashRute(): Rute {
  const [halaman, setHalaman] = useState<Halaman>(bacaHash);

  useEffect(() => {
    const ubah = () => setHalaman(bacaHash());
    window.addEventListener('hashchange', ubah);
    return () => window.removeEventListener('hashchange', ubah);
  }, []);

  const buka = useCallback((tujuan: Halaman) => {
    if (window.location.hash !== `#/${tujuan}`) window.location.hash = `#/${tujuan}`;
    setHalaman(tujuan);
  }, []);

  const definisi = HALAMAN.find((h) => h.rute === halaman) ?? HALAMAN[0];
  return { halaman, definisi, buka };
}

/** Salin teks ke papan klip dengan fallback execCommand untuk peramban lama. */
export async function salinKePapanKlip(teks: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText !== undefined) {
      await navigator.clipboard.writeText(teks);
      return true;
    }
  } catch {
    /* lanjut ke metode cadangan */
  }
  try {
    const area = document.createElement('textarea');
    area.value = teks;
    area.setAttribute('readonly', 'true');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const berhasil = document.execCommand('copy');
    document.body.removeChild(area);
    return berhasil;
  } catch {
    return false;
  }
}