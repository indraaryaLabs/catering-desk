import type { MenuItem, Pesanan } from '../types';
import { LABEL_STATUS } from '../types';
import { rupiah, rupiahRingkas } from './format';
import { sisaBayar, statusPembayaranPesanan, totalPesanan } from './pesanan';
import { tanggalPanjang } from './tanggal';

export type JenisDraf =
  | 'konfirmasi'
  | 'pengingat-h-1'
  | 'dp-belum-lunas'
  | 'terima-kasih'
  | 'ubah-jadwal';

export interface DrafPesan {
  jenis: JenisDraf;
  judul: string;
  isi: string;
  /** Nama tombol aksi; memb WWF clarifies this is a draft, not an auto-send. */
  aksi: string;
}

export const LABEL_DRAF: Record<JenisDraf, string> = {
  konfirmasi: 'Konfirmasi Pesanan',
  'pengingat-h-1': 'Pengingat H-1',
  'dp-belum-lunas': 'Pengingat Pembayaran',
  'terima-kasih': 'Ucapan Terima Kasih',
  'ubah-jadwal': 'Konfirmasi Perubahan Jadwal',
};

function barisPesanan(p: Pesanan): string {
  return p.items.map((i) => `• ${i.namaMenu} — ${i.jumlahPorsi} porsi`).join('\n');
}

function namaPelanggan(p: Pesanan): string {
  const bagian = p.namaPelanggan.trim().split(/\s+/);
  return bagian.length >= 2 ? bagian[0] : p.namaPelanggan;
}

/**
 * Menyusun draf pesan pelanggan.
 *
 * PENTING: fungsi ini hanya menghasilkan teks. Aplikasi tidak pernah mengirim
 * pesan; pengguna menyalin sendiri atau membuka tautan WhatsApp.
 */
export function susunDraf(jenis: JenisDraf, p: Pesanan, menus: MenuItem[] = []): DrafPesan {
  const nama = namaPelanggan(p);
  const jadwal = `${tanggalPanjang(p.tanggalAcara)} pukul ${p.jamAcara}`;
  void menus;

  switch (jenis) {
    case 'konfirmasi':
      return {
        jenis,
        judul: 'Konfirmasi pesanan',
        aksi: 'Salin draf konfirmasi',
        isi: [
          `Halo ${nama}, terima kasih sudah memesan di Catering Desk.`,
          '',
          `Pesanan: ${p.kode}`,
          `Acara: ${p.jenisAcara}`,
          `Waktu: ${jadwal}`,
          `Lokasi: ${p.alamat}`,
          '',
          'Menu yang kami siapkan:',
          barisPesanan(p),
          '',
          `Total ${rupiah(totalPesanan(p))}${p.dp > 0 ? ` (DP ${rupiah(p.dp)})` : ''}.`,
          '',
          'Pesanan sudah kami masukkan ke daftar produksi. Silakan balas pesan ini bila ada yang perlu disesuaikan.',
        ].join('\n'),
      };

    case 'pengingat-h-1':
      return {
        jenis,
        judul: 'Pengingat H-1',
        aksi: 'Salin pengingat',
        isi: [
          `Halo ${nama}, pengingat bahwa acara Anda besok.`,
          '',
          `Waktu: ${jadwal}`,
          `Jumlah porsi: ${p.items.reduce((n, i) => n + i.jumlahPorsi, 0)}`,
          `Lokasi: ${p.alamat}`,
          '',
          p.catatan !== '' ? `Catatan dapur: ${p.catatan}` : 'Silakan konfirmasi bila ada perubahan.',
        ].join('\n'),
      };

    case 'dp-belum-lunas': {
      const kurang = sisaBayar(p);
      return {
        jenis,
        judul: 'Pengingat pembayaran',
        aksi: 'Salin pengingat',
        isi: [
          `Halo ${nama}, pengingat halus soal pembayaran pesanan ${p.kode}.`,
          '',
          `Total: ${rupiah(totalPesanan(p))}`,
          `Sudah DP: ${rupiah(p.dp)}`,
          `Sisa yang perlu dilunasi: ${rupiah(kurang)}`,
          '',
          'Pembayaran bisa dicatat kapan saja melalui aplikasi kami. Mohon informasikan metode pembayarannya.',
        ].join('\n'),
      };
    }

    case 'terima-kasih':
      return {
        jenis,
        judul: 'Ucapan terima kasih',
        aksi: 'Salin ucapan',
        isi: [
          `Terima kasih ${nama}, semoga acara Anda berjalan lancar.`,
          `Total pesanan ${p.kode}: ${rupiah(totalPesanan(p))} · ${p.items.reduce((n, i) => n + i.jumlahPorsi, 0)} porsi.`,
          '',
          'Pintu kami selalu terbuka untuk pesanan berikutnya kapan saja.',
        ].join('\n'),
      };

    case 'ubah-jadwal':
      return {
        jenis,
        judul: 'Konfirmasi perubahan jadwal',
        aksi: 'Salin draf',
        isi: [
          `Halo ${nama}, terkait permintaan perubahan jadwal untuk pesanan ${p.kode}.`,
          '',
          `Jadwal baru yang kami catat: ${jadwal}`,
          `Status saat ini: ${LABEL_STATUS[p.status]}.`,
          '',
          'Mohon konfirmasi agar produksi kami atur ulang. Terima kasih.',
        ].join('\n'),
      };

    default:
      return { jenis, judul: 'Draf', aksi: 'Salin', isi: '' };
  }
}

/** Draf mana yang paling relevan untuk sebuah pesanan. */
export function drafDisarankan(p: Pesanan, hariMendatang: number): JenisDraf {
  if (p.status === 'inquiry') return 'konfirmasi';
  if (statusPembayaranPesanan(p) !== 'lunas' && hariMendatang <= 7) return 'dp-belum-lunas';
  if (hariMendatang === 1) return 'pengingat-h-1';
  if (p.status === 'selesai') return 'terima-kasih';
  return 'konfirmasi';
}

export const SEMUA_DRAF: JenisDraf[] = [
  'konfirmasi',
  'pengingat-h-1',
  'dp-belum-lunas',
  'terima-kasih',
  'ubah-jadwal',
];

/** Ringkasan satu baris untuk dipakai di daftar. */
export function ringkasDraf(draf: DrafPesan): string {
  return draf.isi.split('\n')[0] ?? '';
}

/** Tautan wa.me — hanya membuka aplikasi WhatsApp, tidak mengirim apa pun. */
export function tautanWhatsApp(kontak: string, teks: string): string | null {
  const angka = kontak.replace(/\D/g, '');
  if (angka.length < 8) return null;
  const nomor = angka.startsWith('0') ? `62${angka.slice(1)}` : angka;
  return `https://wa.me/${nomor}?text=${encodeURIComponent(teks)}`;
}

/** Ringkasan satu paragraf untuk catatan/internal. */
export function ringkasPesanTeks(p: Pesanan): string {
  return [
    `${p.kode} · ${p.namaPelanggan}`,
    `${p.jenisAcara}, ${tanggalPanjang(p.tanggalAcara)} ${p.jamAcara}`,
    `${p.items.reduce((n, i) => n + i.jumlahPorsi, 0)} porsi · ${rupiahRingkas(totalPesanan(p))}`,
  ].join(' — ');
}

/** Ringkasan singkat nota cetak. */
export function barisNota(p: Pesanan): string[] {
  return [
    `Kode      : ${p.kode}`,
    `Pelanggan : ${p.namaPelanggan}`,
    `Acara     : ${p.jenisAcara}`,
    `Waktu     : ${tanggalPanjang(p.tanggalAcara)}, ${p.jamAcara}`,
    `Lokasi    : ${p.alamat}`,
  ];
}