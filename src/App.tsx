import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Bot, Database, Keyboard, Plus, Rows3, Receipt, RotateCcw } from 'lucide-react';
import type { MenuItem, Pesanan, StatusPesanan } from './types';
import { LABEL_STATUS } from './types';
import { TokoProvider, useToko } from './state/toko';
import { NotifikasiProvider, useKirimNotif } from './components/Notifikasi';
import { KonfirmasiProvider, useKonfirmasi } from './components/Konfirmasi';
import { AppShell } from './components/AppShell';
import { PaletPerintah } from './components/PaletPerintah';
import type { Perintah } from './components/PaletPerintah';
import { Dialog } from './components/Dialog';
import { FormPesanan } from './components/FormPesanan';
import { FormMenu } from './components/FormMenu';
import { DetailPesanan } from './components/DetailPesanan';
import { HalamanRingkasan } from './pages/Ringkasan';
import { HalamanPesanan } from './pages/Pesanan';
import { HalamanPelanggan } from './pages/Pelanggan';
import { HalamanMenu } from './pages/Menu';
import { HalamanProduksi } from './pages/Produksi';
import { HalamanLaporan } from './pages/Laporan';
import { HalamanOtomasi } from './pages/Otomasi';
import { HalamanData } from './pages/Data';
import { HALAMAN, useHashRute } from './lib/router';
import type { Halaman } from './lib/router';
import { pesananAcuan } from './lib/pelanggan';
import type { ProfilPelanggan } from './lib/pelanggan';
import { totalPesanan } from './lib/pesanan';
import { namaBerkasTanggal, pesananKeCSV, unduhTeks } from './lib/csv';
import { tanggalPendek } from './lib/tanggal';

function Aplikasi(): ReactNode {
  const {
    data,
    hariIni,
    kirim,
    kirimOtomatis,
    undo,
    redo,
    bisaUndo,
    labelUndo,
    resetDemo,
  } = useToko();
  const notif = useKirimNotif();
  const { konfirmasi } = useKonfirmasi();
  const { halaman, buka } = useHashRute();

  const [detailId, setDetailId] = useState<string | null>(null);
  const [formPesanan, setFormPesanan] = useState<{ awal: Pesanan | null } | null>(null);
  const [formMenu, setFormMenu] = useState<{ awal: MenuItem | null } | null>(null);
  const [paletTerbuka, setPaletTerbuka] = useState(false);
  const [bantuanTerbuka, setBantuanTerbuka] = useState(false);

  const pesananDetail = data.pesanan.find((p) => p.id === detailId) ?? null;

  /* --------------------------------- tema -------------------------------- */
  useEffect(() => {
    const terapkan = () => {
      const gelap =
        data.preferensi.tema === 'gelap' ||
        (data.preferensi.tema === 'sistem' &&
          window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.dataset.tema = gelap ? 'gelap' : 'terang';
    };
    terapkan();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', terapkan);
    return () => mq.removeEventListener('change', terapkan);
  }, [data.preferensi.tema]);

  /* -------------------------------- aksi --------------------------------- */
  const bukaDetail = useCallback((p: Pesanan) => setDetailId(p.id), []);
  const bukaFormPesanan = useCallback((awal: Pesanan | null) => setFormPesanan({ awal }), []);
  const bukaFormMenu = useCallback((awal: MenuItem | null) => setFormMenu({ awal }), []);

  const idPesananDiubah = formPesanan?.awal?.id ?? null;
  const pesananSedangDiubah =
    idPesananDiubah === null
      ? null
      : (data.pesanan.find((p) => p.id === idPesananDiubah) ?? formPesanan?.awal ?? null);
  const menuSedangDiubah = formMenu?.awal ?? null;

  const ubahStatus = useCallback(
    (id: string, status: StatusPesanan) => {
      const p = data.pesanan.find((x) => x.id === id);
      if (p === undefined || p.status === status) return;
      kirimOtomatis({ tipe: 'pesanan/status', id, status });
      notif(
        `${p.kode} kini berstatus ${LABEL_STATUS[status]}.`,
        status === 'dibatalkan' ? 'peringatan' : 'sukses',
      );
    },
    [data.pesanan, kirimOtomatis, notif],
  );

  const simpanPesanan = useCallback(
    (p: Pesanan) => {
      const baru = data.pesanan.every((x) => x.id !== p.id);
      kirimOtomatis(
        { tipe: baru ? 'pesanan/tambah' : 'pesanan/ubah', pesanan: p },
        baru ? 'pesanan-ditambahkan' : 'pesanan-diubah',
      );
      setFormPesanan(null);
      setDetailId(null);
      notif(
        baru
          ? `Pesanan ${p.kode} untuk ${p.namaPelanggan} disimpan.`
          : `Perubahan pesanan ${p.kode} tersimpan.`,
      );
    },
    [data.pesanan, kirimOtomatis, notif],
  );

  const hapusPesanan = useCallback(
    async (p: Pesanan) => {
      const boleh = await konfirmasi({
        judul: `Hapus pesanan ${p.kode}?`,
        pesan: `Pesanan milik ${p.namaPelanggan} akan dihapus dari peramban ini.`,
        detail: 'Anda masih dapat membatalkannya dengan Ctrl+Z setelah ini.',
        merusak: true,
        labelYa: 'Ya, hapus pesanan',
      });
      if (!boleh) {
        notif('Penghapusan dibatalkan.', 'info');
        return;
      }
      kirim({ tipe: 'pesanan/hapus', id: p.id });
      setDetailId(null);
      setFormPesanan(null);
      notif(`Pesanan ${p.kode} dihapus. Tekan Ctrl+Z untuk membatalkannya.`, 'peringatan');
    },
    [konfirmasi, kirim, notif],
  );

  const hapusBanyak = useCallback(
    (ids: string[]) => {
      for (const id of ids) kirim({ tipe: 'pesanan/hapus', id });
      notif(`${ids.length} pesanan dihapus. Tekan Ctrl+Z untuk membatalkannya.`, 'peringatan');
    },
    [kirim, notif],
  );

  /** "Pesan lagi": salin pesanan lama ke tanggal hari ini dengan status kembali ke inquiry. */
  const ulangkan = useCallback(
    (sumber: Pesanan | ProfilPelanggan) => {
      const dasar = 'items' in sumber ? sumber : pesananAcuan(sumber);
      if (dasar === null) return;
      setFormPesanan({
        awal: {
          ...dasar,
          id: '',
          kode: '',
          tanggalAcara: hariIni,
          status: 'inquiry',
          dp: 0,
          sumber: 'ulangan',
          items: dasar.items.map((i) => ({ ...i })),
          catatanAntar: '',
        },
      });
      notif(`Salinan pesanan ${dasar.kode} dibuka. Tentukan tanggal acara lalu simpan.`, 'info');
    },
    [hariIni, notif],
  );

  const simpanMenu = useCallback(
    (m: MenuItem) => {
      const baru = data.menus.every((x) => x.id !== m.id);
      kirim({ tipe: baru ? 'menu/tambah' : 'menu/ubah', menu: m });
      setFormMenu(null);
      notif(baru ? `Menu ${m.nama} ditambahkan.` : `Menu ${m.nama} diperbarui.`);
    },
    [data.menus, kirim, notif],
  );

  const hapusMenu = useCallback(
    async (m: MenuItem) => {
      const dipesan = data.pesanan.filter(
        (p) => p.items.some((i) => i.menuId === m.id) && p.status !== 'dibatalkan',
      ).length;
      const boleh = await konfirmasi({
        judul: `Hapus menu ${m.nama}?`,
        pesan:
          dipesan === 0
            ? 'Menu ini akan dihapus dari katalog.'
            : `Menu ini dipakai di ${dipesan} pesanan aktif. Pesanan lama tetap menyimpan nama dan harga saat dibuat.`,
        merusak: true,
        labelYa: 'Ya, hapus menu',
      });
      if (!boleh) {
        notif('Penghapusan dibatalkan.', 'info');
        return;
      }
      kirim({ tipe: 'menu/hapus', id: m.id });
      setFormMenu(null);
      notif(`Menu ${m.nama} dihapus.`, 'peringatan');
    },
    [data.pesanan, konfirmasi, kirim, notif],
  );

  const toggleTugas = useCallback((id: string) => kirim({ tipe: 'tugas/toggle', id }), [kirim]);

  const resetDenganKonfirmasi = useCallback(async () => {
    const boleh = await konfirmasi({
      judul: 'Reset ke data contoh?',
      pesan: 'Semua pesanan, menu, tugas, dan aturan Anda akan diganti dengan data contoh bawaan.',
      merusak: true,
      labelYa: 'Ya, reset sekarang',
    });
    if (!boleh) {
      notif('Reset dibatalkan.', 'info');
      return;
    }
    resetDemo();
    notif('Data contoh berhasil dimuat ulang.');
  }, [konfirmasi, resetDemo, notif]);

  const ringkasanTeks = useCallback(() => {
    const aktif = data.pesanan.filter((p) => p.status !== 'dibatalkan');
    const menunggak = aktif.filter((p) => totalPesanan(p) > p.dp);
    return [
      `Ringkasan Catering Desk - ${tanggalPendek(hariIni)}`,
      `Pesanan aktif: ${aktif.length}`,
      `Nilai total: ${aktif.reduce((n, p) => n + totalPesanan(p), 0).toLocaleString('id-ID')} rupiah`,
      `Belum lunas: ${menunggak.length} pesanan`,
    ].join('\n');
  }, [data.pesanan, hariIni]);

  /* ---------------------------- palet perintah -------------------------- */
  const perintah = useMemo<Perintah[]>(() => {
    const daftar: Perintah[] = HALAMAN.map((h) => ({
      id: `nav-${h.rute}`,
      label: `Buka ${h.label}`,
      grup: 'Navigasi',
      cari: h.judul,
      jalankan: () => buka(h.rute as Halaman),
    }));

    daftar.push(
      {
        id: 'aksi-pesanan',
        label: 'Pesanan baru',
        grup: 'Aksi',
        ikon: <Plus size={14} />,
        pintasan: 'N',
        jalankan: () => bukaFormPesanan(null),
      },
      {
        id: 'aksi-ekspor',
        label: 'Ekspor semua pesanan ke CSV',
        grup: 'Aksi',
        ikon: <Receipt size={14} />,
        jalankan: () => {
          unduhTeks(namaBerkasTanggal('pesanan', hariIni), pesananKeCSV(data.pesanan));
          notif(`${data.pesanan.length} pesanan diekspor.`);
        },
      },
      {
        id: 'aksi-tiket',
        label: 'Cetak tiket dapur hari ini',
        grup: 'Aksi',
        ikon: <Rows3 size={14} />,
        jalankan: () => {
          buka('produksi');
          window.setTimeout(() => window.print(), 350);
        },
      },
      {
        id: 'aksi-undo',
        label: bisaUndo ? `Batalkan: ${labelUndo ?? ''}` : 'Batalkan aksi (tidak ada yang perlu dibatalkan)',
        grup: 'Aksi',
        ikon: <RotateCcw size={14} />,
        pintasan: 'Ctrl Z',
        jalankan: () => {
          undo();
          notif('Aksi terakhir dibatalkan.', 'info');
        },
      },
      { id: 'aksi-redo', label: 'Ulangi aksi yang dibatalkan', grup: 'Aksi', jalankan: redo },
      {
        id: 'aksi-palet',
        label: 'Palet perintah',
        grup: 'Aksi',
        ikon: <Keyboard size={14} />,
        pintasan: 'Ctrl K',
        jalankan: () => setPaletTerbuka(true),
      },
      { id: 'aksi-bantuan', label: 'Daftar pintasan keyboard', grup: 'Bantuan', jalankan: () => setBantuanTerbuka(true) },
    );

    for (const p of data.pesanan.filter((x) => x.status === 'inquiry').slice(0, 6)) {
      daftar.push({
        id: `pesanan-${p.id}`,
        label: `${p.kode} - ${p.namaPelanggan}`,
        grup: 'Inquiry menunggu',
        cari: `${p.jenisAcara} ${p.alamat}`,
        jalankan: () => bukaDetail(p),
      });
    }

    return daftar;
  }, [buka, bukaFormPesanan, bukaDetail, data.pesanan, hariIni, notif, undo, redo, bisaUndo, labelUndo]);

  /* --------------------------- pintasan keyboard ------------------------ */
  useEffect(() => {
    const padaTombol = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const mengetik =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable === true;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletTerbuka((v) => !v);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mengetik || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === '/') {
        const cari = document.getElementById('f-cari');
        if (cari !== null) {
          e.preventDefault();
          cari.focus();
        }
        return;
      }
      if (e.key === '?') {
        e.preventDefault();
        setBantuanTerbuka(true);
        return;
      }
      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        bukaFormPesanan(null);
      }
    };
    window.addEventListener('keydown', padaTombol);
    return () => window.removeEventListener('keydown', padaTombol);
  }, [undo, redo, bukaFormPesanan]);

  /* ------------------------------ topbar aksi ---------------------------- */
  const topbarAksi = useMemo(() => {
    if (halaman === 'menu') {
      return (
        <button type="button" className="tombol utama" onClick={() => bukaFormMenu(null)}>
          <Plus size={15} aria-hidden="true" />
          Menu baru
        </button>
      );
    }
    if (halaman === 'otomasi') {
      return (
        <button type="button" className="tombol datar" onClick={() => buka('data')}>
          <Database size={15} aria-hidden="true" />
          Data
        </button>
      );
    }
    if (halaman === 'laporan') {
      return (
        <button type="button" className="tombol datar" onClick={() => void navigator.clipboard?.writeText(ringkasanTeks())}>
          <Bot size={15} aria-hidden="true" />
          Salin ringkasan
        </button>
      );
    }
    return (
      <button type="button" className="tombol utama" onClick={() => bukaFormPesanan(null)}>
        <Plus size={15} aria-hidden="true" />
        Pesanan baru
      </button>
    );
  }, [halaman, buka, bukaFormMenu, bukaFormPesanan, ringkasanTeks]);

  return (
    <>
      <AppShell
        onBukaPalet={() => setPaletTerbuka(true)}
        onResetDemo={() => void resetDenganKonfirmasi()}
        topbarAksi={topbarAksi}
      >
        {halaman === 'ringkasan' && (
          <HalamanRingkasan
            bukaDetail={bukaDetail}
            bukaForm={bukaFormPesanan}
            ubahStatus={ubahStatus}
            toggleTugas={toggleTugas}
            keLaporan={() => buka('laporan')}
          />
        )}
        {halaman === 'pesanan' && (
          <HalamanPesanan
            bukaDetail={bukaDetail}
            bukaForm={bukaFormPesanan}
            ubahStatus={ubahStatus}
            ubahStatusBanyak={(perubahan) => {
              kirim({ tipe: 'pesanan/status-banyak', perubahan });
              notif(`Status ${perubahan.length} pesanan diperbarui.`);
            }}
            hapusBanyak={hapusBanyak}
            ulang={ulangkan}
          />
        )}
        {halaman === 'pelanggan' && <HalamanPelanggan ulang={ulangkan} />}
        {halaman === 'menu' && (
          <HalamanMenu
            bukaForm={bukaFormMenu}
            ubahMenu={(m) => {
              kirim({ tipe: 'menu/ubah', menu: m });
              notif(`${m.nama} ditandai ${m.tersedia ? 'tersedia' : 'tidak tersedia'}.`, 'info');
            }}
            hapusMenu={(m) => void hapusMenu(m)}
          />
        )}
        {halaman === 'produksi' && <HalamanProduksi bukaDetail={bukaDetail} />}
        {halaman === 'laporan' && <HalamanLaporan />}
        {halaman === 'otomasi' && <HalamanOtomasi />}
        {halaman === 'data' && <HalamanData onBukaBantuan={() => setBantuanTerbuka(true)} />}
      </AppShell>

      <PaletPerintah terbuka={paletTerbuka} perintah={perintah} tutup={() => setPaletTerbuka(false)} />

      <DetailPesanan
        pesanan={pesananDetail}
        menus={data.menus}
        hariIni={hariIni}
        tutup={() => setDetailId(null)}
        onUbah={bukaFormPesanan}
        onStatus={ubahStatus}
        onHapus={(p) => void hapusPesanan(p)}
        onUlang={ulangkan}
      />

      {formPesanan !== null && (
        <FormPesanan
          terbuka
          awal={pesananSedangDiubah}
          menus={data.menus}
          pesanan={data.pesanan}
          tanggalDefault={formPesanan.awal?.tanggalAcara ?? hariIni}
          tutup={() => setFormPesanan(null)}
          simpan={simpanPesanan}
        />
      )}

      {formMenu !== null && (
        <FormMenu terbuka awal={menuSedangDiubah} tutup={() => setFormMenu(null)} simpan={simpanMenu} />
      )}

      <Dialog
        terbuka={bantuanTerbuka}
        judul="Pintasan keyboard"
        sub="Aplikasi ini bisa dipakai tanpa mouse."
        ukuran="kecil"
        tutup={() => setBantuanTerbuka(false)}
        kaki={
          <button
            type="button"
            className="tombol utama"
            style={{ marginLeft: 'auto' }}
            onClick={() => setBantuanTerbuka(false)}
          >
            Mengerti
          </button>
        }
      >
        <div style={{ display: 'grid', gap: 8 }}>
          {[
            ['Ctrl / Cmd + K', 'Palet perintah'],
            ['N', 'Pesanan baru'],
            ['/', 'Fokus ke kolom pencarian'],
            ['Ctrl / Cmd + Z', 'Batalkan aksi terakhir'],
            ['Ctrl / Cmd + Shift + Z', 'Ulangi aksi'],
            ['Esc', 'Tutup dialog'],
            ['?', 'Buka daftar ini'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 'var(--t-sm)' }}>
              <span className="kbd" style={{ minWidth: 132 }}>
                {k}
              </span>
              <span className="redup">{v}</span>
            </div>
          ))}
        </div>
      </Dialog>
    </>
  );
}

export default function App(): ReactNode {
  return (
    <TokoProvider>
      <NotifikasiProvider>
        <KonfirmasiProvider>
          <Aplikasi />
        </KonfirmasiProvider>
      </NotifikasiProvider>
    </TokoProvider>
  );
}