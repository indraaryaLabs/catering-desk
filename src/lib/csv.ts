import type { AturanOtomasi, MenuItem, Pesanan, Tugas } from '../types';
import { LABEL_STATUS } from '../types';
import { angka, desimal, rupiah } from './format';
import { sisaBayar, statusPembayaranPesanan, totalPorsi, totalPesanan } from './pesanan';
import type { KebutuhanBahan, RingkasanProduksi } from './pesanan';
import { tanggalRingkas } from './tanggal';

/** Satu sel CSV: selalu diapit tanda kutip; teks berisiko formula dilindungi. */
function sel(nilai: string | number): string {
  const angkaMentah = typeof nilai === 'number';
  let teks = angkaMentah ? String(nilai) : nilai;
  if (!angkaMentah && /^[=+\-@\t\r]/.test(teks)) teks = `'${teks}`;
  return `"${teks.replace(/"/g, '""')}"`;
}

export function barisCSV(baris: Array<string | number>): string {
  return baris.map(sel).join(',');
}

export const BOM = '\uFEFF';

export function namaBerkas(nama: string, ekstensi: string): string {
  return `catering-desk-${nama}.${ekstensi}`;
}

/** Unduh teks sebagai berkas. Tidak ada jaringan; hanya Blob lokal. */
export function unduhTeks(namaFile: string, isi: string, tipe = 'text/csv;charset=utf-8'): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob([BOM + isi], { type: tipe });
  const url = URL.createObjectURL(blob);
  const tautan = document.createElement('a');
  tautan.href = url;
  tautan.download = namaFile;
  tautan.style.display = 'none';
  document.body.appendChild(tautan);
  tautan.click();
  document.body.removeChild(tautan);
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function unduhJSON(namaFile: string, data: unknown): void {
  unduhTeks(namaFile, JSON.stringify(data, null, 2), 'application/json;charset=utf-8');
}

export function bacaBerkasTeks(berkas: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const pembaca = new FileReader();
    pembaca.onload = () => resolve(String(pembaca.result ?? ''));
    pembaca.onerror = () => reject(new Error('Berkas tidak bisa dibaca.'));
    pembaca.readAsText(berkas);
  });
}

const LABEL_BAYAR: Record<string, string> = {
  belum: 'Belum bayar',
  sebagian: 'DP sebagian',
  lunas: 'Lunas',
};

/* ------------------------------ pesanan ------------------------------ */

const KOLOM_PESANAN = [
  'Kode', 'Pelanggan', 'Kontak', 'Jenis Acara', 'Tanggal Acara', 'Jam', 'Alamat',
  'Pengantar', 'Menu', 'Jumlah Porsi', 'Total', 'DP', 'Sisa Bayar', 'Status',
  'Pembayaran', 'Sumber', 'Catatan', 'Catatan Pengiriman',
];

export function pesananKeCSV(daftar: Pesanan[]): string {
  const baris = [barisCSV(KOLOM_PESANAN)];
  for (const p of daftar) {
    baris.push(
      barisCSV([
        p.kode,
        p.namaPelanggan,
        p.kontak,
        p.jenisAcara,
        p.tanggalAcara,
        p.jamAcara,
        p.alamat,
        p.pengantar,
        p.items.map((i) => `${i.namaMenu} (${i.jumlahPorsi} porsi)`).join(' | '),
        totalPorsi(p),
        totalPesanan(p),
        p.dp,
        sisaBayar(p),
        LABEL_STATUS[p.status],
        LABEL_BAYAR[statusPembayaranPesanan(p)],
        p.sumber,
        p.catatan,
        p.catatanAntar,
      ]),
    );
  }
  return baris.join('\r\n');
}

/* ----------------------------- produksi ------------------------------ */

const KOLOM_PRODUKSI = [
  'Tanggal', 'Menu', 'Kategori', 'Harga per Porsi', 'Total Porsi',
  'Jumlah Pesanan', 'Waktu Masak (menit)', 'Nomor Pesanan',
];

export function produksiKeCSV(r: RingkasanProduksi): string {
  const baris = [barisCSV(KOLOM_PRODUKSI)];
  for (const b of r.baris) {
    baris.push(
      barisCSV([
        r.tanggal,
        b.namaMenu,
        b.kategori,
        b.hargaPerPorsi,
        b.totalPorsi,
        b.jumlahPesanan,
        b.waktuMasak,
        b.kodePesanan.join(' '),
      ]),
    );
  }
  baris.push(
    barisCSV(['', 'TOTAL', '', '', r.totalPorsi, r.totalPesananAktif, r.menitKerja, r.kodePesanan.join(' ')]),
  );
  return baris.join('\r\n');
}

/* ---------------------------- daftar belanja ------------------------- */

const KOLOM_BELANJA = ['Tanggal', 'Bahan', 'Kebutuhan', 'Estimasi Biaya', 'Dipakai Untuk'];

export function belanjaKeCSV(
  tanggal: string,
  kebutuhan: KebutuhanBahan[],
): string {
  const baris = [barisCSV(KOLOM_BELANJA)];
  for (const b of kebutuhan) {
    baris.push(
      barisCSV([
        tanggal,
        b.nama,
        `${desimal(b.jumlah, 2)} ${b.satuan}`,
        Math.round(b.biaya),
        b.dariMenu.join(' | '),
      ]),
    );
  }
  const total = kebutuhan.reduce((n, b) => n + b.biaya, 0);
  baris.push(barisCSV(['', 'TOTAL', '', Math.round(total), '']));
  return baris.join('\r\n');
}

/* ------------------------------- menu -------------------------------- */

const KOLOM_MENU = [
  'Menu', 'Kategori', 'Harga per Porsi', 'HPP per Porsi', 'Margin (%)',
  'Waktu Masak (menit)', 'Tersedia', 'Jumlah Bahan', 'Deskripsi',
];

export function menuKeCSV(daftar: MenuItem[], hpp: Map<string, number>): string {
  const baris = [barisCSV(KOLOM_MENU)];
  for (const m of daftar) {
    const h = hpp.get(m.id) ?? 0;
    const margin = m.hargaPerPorsi <= 0 ? 0 : Math.round(((m.hargaPerPorsi - h) / m.hargaPerPorsi) * 100);
    baris.push(
      barisCSV([
        m.nama,
        m.kategori,
        m.hargaPerPorsi,
        Math.round(h),
        margin,
        m.waktuMasak,
        m.tersedia ? 'Ya' : 'Tidak',
        m.bahan.length,
        m.deskripsi,
      ]),
    );
  }
  return baris.join('\r\n');
}

/* ------------------------------ laporan ------------------------------ */

const KOLOM_PIUTANG = ['Pelanggan', 'Kode', 'Tanggal Acara', 'Umur (hari)', 'Sisa Tagihan'];

export function piutangKeCSV(daftar: Array<{ nama: string; kode: string; tanggal: string; umur: number; sisa: number }>): string {
  const baris = [barisCSV(KOLOM_PIUTANG)];
  for (const p of daftar) {
    baris.push(barisCSV([p.nama, p.kode, p.tanggal, p.umur, p.sisa]));
  }
  baris.push(barisCSV(['TOTAL', '', '', '', daftar.reduce((n, p) => n + p.sisa, 0)]));
  return baris.join('\r\n');
}

/* ------------------------------- tugas ------------------------------- */

const KOLOM_TUGAS = ['Judul', 'Detail', 'Batas Waktu', 'Prioritas', 'Selesai', 'Sumber'];

export function tugasKeCSV(daftar: Tugas[]): string {
  const baris = [barisCSV(KOLOM_TUGAS)];
  for (const t of daftar) {
    baris.push(barisCSV([t.judul, t.detail, t.batasWaktu, t.prioritas, t.selesai ? 'Ya' : 'Belum', t.sumber]));
  }
  return baris.join('\r\n');
}

/* ------------------------------ aturan ------------------------------- */

const KOLOM_ATURAN = ['Nama', 'Aktif', 'Pemicu', 'Kondisi', 'Tindakan', 'Total Eksekusi'];

export function aturanKeCSV(daftar: AturanOtomasi[], ringkas: (a: AturanOtomasi) => string, labelTindakan: (j: string) => string): string {
  const baris = [barisCSV(KOLOM_ATURAN)];
  for (const a of daftar) {
    baris.push(
      barisCSV([
        a.nama,
        a.aktif ? 'Ya' : 'Tidak',
        a.pemicu,
        ringkas(a),
        a.tindakan.map((t) => labelTindakan(t.jenis)).join(' | '),
        a.eksekusi,
      ]),
    );
  }
  return baris.join('\r\n');
}

/* ------------------------------- utils ------------------------------- */

export function ringkasEkspor(jumlah: number, nilai: number): string {
  return `${angka(jumlah)} baris, nilai ${rupiah(nilai)}`;
}

export function namaBerkasTanggal(awalan: string, tanggal: string): string {
  return `catering-desk-${awalan}-${tanggalRingkas(tanggal).replace(/\s+/g, '-')}.csv`;
}