import type { AturanOtomasi, DataAplikasi, ItemPesanan, MenuItem, Pesanan, StatusPesanan, Tugas } from '../types';
import { KATEGORI_MENU, LABEL_KATEGORI, PREFSI_BAWAAN, VERSI_SKEMA } from '../types';
import { geserHari, hariIni, stempelWaktu } from './tanggal';

function b(
  id: string,
  nama: string,
  jumlah: number,
  satuan: string,
  hargaSatuan: number,
): MenuItem['bahan'][number] {
  return { id, nama, jumlah, satuan, hargaSatuan };
}

/** Resep bahan → HPP per porsi → margin. Angka memakai harga pasar Kantor. */
export function buatMenuContoh(): MenuItem[] {
  return [
    {
      id: 'mn-ayam-bakar',
      nama: 'Nasi Kotak Ayam Bakar Madura',
      kategori: 'makanan',
      hargaPerPorsi: 32_000,
      waktuMasak: 45,
      tersedia: true,
      deskripsi: 'Ayam bakar bumbu kecap Madura, nasi putih, sambal terasi, lalapan.',
      bahan: [
        b('b1', 'Ayam broiler', 0.22, 'kg', 36_000),
        b('b2', 'Beras premium', 0.09, 'kg', 16_000),
        b('b3', 'Bumbu marinade', 0.03, 'porsi', 1_200),
        b('b4', 'Kemasan rice box', 1, 'pcs', 2_800),
        b('b5', 'Sayur lalapan', 0.06, 'porsi', 900),
      ],
    },
    {
      id: 'mn-iga-sapi',
      nama: 'Nasi Kotak Iga Sapi Lada Hitam',
      kategori: 'makanan',
      hargaPerPorsi: 48_000,
      waktuMasak: 60,
      tersedia: true,
      deskripsi: 'Iga sapi panggang saus lada hitam, kentang panggang, nasi pandan.',
      bahan: [
        b('b1', 'Iga sapi', 0.25, 'kg', 78_000),
        b('b2', 'Beras premium', 0.09, 'kg', 16_000),
        b('b3', 'Saus lada hitam', 0.04, 'porsi', 2_400),
        b('b4', 'Kentang beku', 0.08, 'kg', 22_000),
        b('b5', 'Kemasan rice box', 1, 'pcs', 2_800),
      ],
    },
    {
      id: 'mn-ayam-gepuk',
      nama: 'Nasi Ayam Gepuk Sambal Matah',
      kategori: 'makanan',
      hargaPerPorsi: 35_000,
      waktuMasak: 40,
      tersedia: true,
      deskripsi: 'Ayam gepuk crispy dengan sambal matah segar dan nasi liwet.',
      bahan: [
        b('b1', 'Ayam potong', 0.24, 'kg', 38_000),
        b('b2', 'Beras premium', 0.09, 'kg', 16_000),
        b('b3', 'Tepung terigu', 0.04, 'kg', 14_000),
        b('b4', 'Bawang merah', 0.05, 'kg', 32_000),
        b('b5', 'Kemasan rice box', 1, 'pcs', 2_800),
      ],
    },
    {
      id: 'mn-tumpeng',
      nama: 'Tumpeng Nasi Kuning Komplit',
      kategori: 'paket',
      hargaPerPorsi: 38_000,
      waktuMasak: 90,
      tersedia: true,
      deskripsi: 'Nasi kuning, ayam goreng, perkedel, orek tempe, urap, sambal goreng ati.',
      bahan: [
        b('b1', 'Beras premium', 0.12, 'kg', 16_000),
        b('b2', 'Ayam potong', 0.2, 'kg', 38_000),
        b('b3', 'Kentang', 0.09, 'kg', 18_000),
        b('b4', 'Tempe', 0.04, 'kg', 28_000),
        b('b5', 'Kunyit dan santan', 0.05, 'porsi', 1_500),
        b('b6', 'Pandan daun', 0.01, 'kg', 60_000),
      ],
    },
    {
      id: 'mn-sate-ayam',
      nama: 'Sate Ayam Madura (10 tusuk)',
      kategori: 'snack',
      hargaPerPorsi: 45_000,
      waktuMasak: 50,
      tersedia: true,
      deskripsi: 'Sate ayam bumbu kacang, bawang merah, cabai rawit, lontong.',
      bahan: [
        b('b1', 'Daging ayam fillet', 0.25, 'kg', 58_000),
        b('b2', 'Tusuk sate', 10, 'pcs', 250),
        b('b3', 'Bumbu kacang', 0.05, 'porsi', 1_800),
        b('b4', 'Kemasan box catering', 1, 'pcs', 4_500),
      ],
    },
    {
      id: 'mn-pastel',
      nama: 'Pastel Isi Sayur & Telur',
      kategori: 'snack',
      hargaPerPorsi: 12_000,
      waktuMasak: 25,
      tersedia: true,
      deskripsi: 'Pastel goreng isi bihun, wortel, telur, dan daun bawang.',
      bahan: [
        b('b1', 'Tepung terigu', 0.06, 'kg', 14_000),
        b('b2', 'Bihun', 0.02, 'kg', 24_000),
        b('b3', 'Telur ayam', 0.4, 'butir', 1_800),
        b('b4', 'Minyak goreng', 0.02, 'l', 17_000),
      ],
    },
    {
      id: 'mn-risoles',
      nama: 'Risoles Mayo Ragout',
      kategori: 'snack',
      hargaPerPorsi: 11_000,
      waktuMasak: 25,
      tersedia: true,
      deskripsi: 'Risoles berisi ragout ayam, wortel, dan jamur, disajikan dengan mayonesa.',
      bahan: [
        b('b1', 'Kulit risoles', 2, 'pcs', 1_200),
        b('b2', 'Ayam fillet', 0.05, 'kg', 58_000),
        b('b3', 'Jamur', 0.03, 'kg', 26_000),
        b('b4', 'Mayonnaise', 0.03, 'porsi', 900),
      ],
    },
    {
      id: 'mn-es-teh',
      nama: 'Es Teh Manis Segar',
      kategori: 'minuman',
      hargaPerPorsi: 6_000,
      waktuMasak: 5,
      tersedia: true,
      deskripsi: 'Teh tubruk manis dingin, cup 220 ml.',
      bahan: [b('b1', 'Daun teh', 0.004, 'kg', 48_000), b('b2', 'Gula pasir', 0.02, 'kg', 18_000), b('b3', 'Cup 220 ml', 1, 'pcs', 650), b('b4', 'Es batu', 0.06, 'kg', 4_000)],
    },
    {
      id: 'mn-es-jeruk',
      nama: 'Es Jeruk Peras',
      kategori: 'minuman',
      hargaPerPorsi: 9_000,
      waktuMasak: 8,
      tersedia: true,
      deskripsi: 'Jeruk peras murni tanpa pemanis buatan, cup 250 ml.',
      bahan: [b('b1', 'Jeruk peras', 0.35, 'kg', 16_000), b('b2', 'Cup 250 ml', 1, 'pcs', 850), b('b3', 'Es batu', 0.08, 'kg', 4_000)],
    },
    {
      id: 'mn-kopi-aren',
      nama: 'Kopi Tubruk Gula Aren',
      kategori: 'minuman',
      hargaPerPorsi: 10_000,
      waktuMasak: 6,
      tersedia: true,
      deskripsi: 'Kopi tubruk robusta dengan gula aren cair, cup 200 ml.',
      bahan: [b('b1', 'Biji kopi', 0.015, 'kg', 120_000), b('b2', 'Gula aren', 0.02, 'kg', 42_000), b('b3', 'Cup 200 ml', 1, 'pcs', 700)],
    },
    {
      id: 'mn-puding',
      nama: 'Puding Lumut Cokelat',
      kategori: 'dessert',
      hargaPerPorsi: 12_000,
      waktuMasak: 35,
      tersedia: true,
      deskripsi: 'Puding cokelat lembut dengan lapisan santan, potong 100 gram.',
      bahan: [
        b('b1', 'Susu cair', 0.12, 'l', 18_000),
        b('b2', 'Coklat bubuk', 0.01, 'kg', 68_000),
        b('b3', 'Agar-agar', 0.003, 'kg', 90_000),
        b('b4', 'Cup plastik 150 ml', 1, 'pcs', 1_100),
      ],
    },
    {
      id: 'mn-lapis',
      nama: 'Lapis Legit Pandan (potongan)',
      kategori: 'dessert',
      hargaPerPorsi: 18_000,
      waktuMasak: 70,
      tersedia: false,
      deskripsi: 'Lapis legit premium rasa pandan, diproduksi terbatas setiap hari.',
      bahan: [
        b('b1', 'Susu segar', 0.25, 'l', 20_000),
        b('b2', 'Tepung terigu', 0.03, 'kg', 14_000),
        b('b3', 'Gula pasir', 0.04, 'kg', 18_000),
        b('b4', 'Pandan pasta', 0.002, 'kg', 180_000),
      ],
    },
  ];
}

interface BahanPesanan {
  id: string;
  nama: string;
  kontak: string;
  jenisAcara: string;
  offsetHari: number;
  jamAcara: string;
  alamat: string;
  items: Array<[string, number]>;
  catatan: string;
  catatanAntar: string;
  pengantar: string;
  dp: number;
  status: StatusPesanan;
}

const DAFTAR: BahanPesanan[] = [
  {
    id: 'ps-001',
    nama: 'Ratna Kusumawardani',
    kontak: '0812 3456 7890',
    jenisAcara: 'Ulang Tahun Anak',
    offsetHari: -34,
    jamAcara: '18:00',
    alamat: 'Jl. Poros Mandonga Blok C No. 12, Kendari',
    items: [['mn-ayam-bakar', 25], ['mn-es-teh', 25], ['mn-puding', 25]],
    catatan: 'Tanpa cabai untuk anak-anak, sambal dipisah di wadah kecil.',
    catatanAntar: 'Minta antar sebelum jam 17.30.',
    pengantar: 'Ahmad (mitra)',
    dp: 1_250_000,
    status: 'selesai',
  },
  {
    id: 'ps-002',
    nama: 'Andi Pratama',
    kontak: '0853 9876 1122',
    jenisAcara: 'Rapat Kerja Divisi',
    offsetHari: -21,
    jamAcara: '12:30',
    alamat: 'Gedung Sentra Niaga Lt. 3, Jl. MT Haryono, Kendari',
    items: [['mn-iga-sapi', 40], ['mn-es-jeruk', 40]],
    catatan: 'Pengiriman ke lobi, konfirmasi 30 menit sebelum tiba.',
    catatanAntar: 'Titip ke satpam nama Pak Rudi.',
    pengantar: 'Sari (mitra)',
    dp: 2_280_000,
    status: 'selesai',
  },
  {
    id: 'ps-003',
    nama: 'Marlina Ahmad',
    kontak: '0821 2233 4455',
    jenisAcara: 'Pengajian Bulanan',
    offsetHari: -12,
    jamAcara: '19:30',
    alamat: 'Masjid Al-Ikhlas, Jl. Diponegoro No. 5, Kendari',
    items: [['mn-ayam-gepuk', 60], ['mn-kopi-aren', 60]],
    catatan: 'Pesanan dibatalkan karena jadwal acara bergeser.',
    catatanAntar: '',
    pengantar: '',
    dp: 1_000_000,
    status: 'dibatalkan',
  },
  {
    id: 'ps-004',
    nama: 'Karang Taruna Mandonga',
    kontak: '0813 5555 0101',
    jenisAcara: 'Gathering Pemuda',
    offsetHari: -6,
    jamAcara: '15:00',
    alamat: 'Balai Warga Mandonga, Jl. Mandonga Raya, Kendari',
    items: [['mn-sate-ayam', 30], ['mn-pastel', 50], ['mn-es-teh', 80]],
    catatan: 'Sate dimasak setengah matang, dibakar ulang di lokasi acara.',
    catatanAntar: 'Bawa piring & sendok extra 20 set.',
    pengantar: 'Jumadi (mitra)',
    dp: 1_845_000,
    status: 'selesai',
  },
  {
    id: 'ps-005',
    nama: 'Dewi Lestari',
    kontak: '',
    jenisAcara: 'Syukuran Rumah Baru',
    offsetHari: 0,
    jamAcara: '18:00',
    alamat: 'Perum Griya Asri Jl. Merpati No. 8, Kandai, Kendari',
    items: [['mn-tumpeng', 12], ['mn-es-teh', 12]],
    catatan: 'Tumpeng mini 12 porsi, dibawa sendiri oleh pihak keluarga.',
    catatanAntar: 'Ambil sendiri di workshop.',
    pengantar: '',
    dp: 100_000,
    status: 'inquiry',
  },
  {
    id: 'ps-006',
    nama: 'PT Sinar Laut Biru',
    kontak: '0401 300 2211',
    jenisAcara: 'Rapat Direksi Kuartal',
    offsetHari: 0,
    jamAcara: '08:30',
    alamat: 'Kantor Pusat Sinar Laut Biru, Jl. Sambu No. 21, Kendari',
    items: [['mn-iga-sapi', 22], ['mn-es-jeruk', 22]],
    catatan: 'Sertakan piring, sendok, dan tisu untuk setiap kotak.',
    catatanAntar: 'Harus tiba sebelum rapat dimulai.',
    pengantar: 'Ahmad (mitra)',
    dp: 800_000,
    status: 'dikonfirmasi',
  },
  {
    id: 'ps-007',
    nama: 'Keluarga Bapak Sunarto',
    kontak: '0822 9070 5544',
    jenisAcara: 'Khitanan',
    offsetHari: 0,
    jamAcara: '11:00',
    alamat: 'Jl. K.H. Ahmad Dahlan No. 44, Rahandouna, Kendari',
    items: [['mn-ayam-gepuk', 55], ['mn-es-teh', 55]],
    catatan: 'Level sambal matah sedang, pesanan masuk tahap persiapan dapur.',
    catatanAntar: 'Motor 2, antar bertahap pukul 10.30 dan 11.30.',
    pengantar: 'Jumadi (mitra)',
    dp: 2_255_000,
    status: 'persiapan',
  },
  {
    id: 'ps-008',
    nama: 'Yusuf Halim',
    kontak: '0857 6543 2210',
    jenisAcara: 'Arisan RT 04',
    offsetHari: 0,
    jamAcara: '16:00',
    alamat: 'Rumah Ketua RT 04, Jl. Bataraguru No. 9, Baruga, Kendari',
    items: [['mn-ayam-bakar', 30], ['mn-pastel', 30], ['mn-es-jeruk', 30]],
    catatan: 'Paket sudah siap, menunggu dijemput pemesan pukul 16.00.',
    catatanAntar: 'Pemesan ambil sendiri.',
    pengantar: '',
    dp: 500_000,
    status: 'siap',
  },
  {
    id: 'ps-009',
    nama: 'Halimah Yusuf',
    kontak: '0812 7788 9900',
    jenisAcara: 'Ulang Tahun Suami',
    offsetHari: 0,
    jamAcara: '19:00',
    alamat: 'Jl. Sungai Bangek No. 17, Poasia, Kendari',
    catatan: 'Tulis ucapan selamat pada kartu kecil.',
    catatanAntar: '',
    pengantar: 'Sari (mitra)',
    dp: 0,
    status: 'dikonfirmasi',
    items: [['mn-ayam-bakar', 14], ['mn-puding', 14]],
  },
  {
    id: 'ps-010',
    nama: 'Riswan Hakim',
    kontak: '0858 1212 3344',
    jenisAcara: 'Meeting Klien',
    offsetHari: 1,
    jamAcara: '09:00',
    alamat: 'Hotel Grand Sinar, Jl. Sultan Hasanuddin No. 3, Kendari',
    items: [['mn-iga-sapi', 16], ['mn-kopi-aren', 16]],
    catatan: 'Ruang meeting lantai 2, konfirmasi nama pemesan di resepsionis.',
    catatanAntar: 'Tiba di hotel jam 08.30.',
    pengantar: 'Ahmad (mitra)',
    dp: 0,
    status: 'inquiry',
  },
  {
    id: 'ps-011',
    nama: 'Yayasan Harapan Bangsa',
    kontak: '0401 8899 1122',
    jenisAcara: 'Peringatan Hari Guru',
    offsetHari: 1,
    jamAcara: '10:00',
    alamat: 'SMA Negeri 2 Kendari, Jl. Diponegoro No. 61, Kadia, Kendari',
    items: [['mn-ayam-gepuk', 80], ['mn-es-teh', 80], ['mn-puding', 80]],
    catatan: 'Perlu tanda terima tertulis; DP sudah diterima.',
    catatanAntar: 'Masuk gerbang belakang, arah lapangan.',
    pengantar: 'Jumadi (mitra)',
    dp: 2_000_000,
    status: 'dikonfirmasi',
  },
  {
    id: 'ps-012',
    nama: 'Aris Munandar',
    kontak: '0813 4040 2020',
    jenisAcara: 'Reuni Alumni SMAN 1',
    offsetHari: 3,
    jamAcara: '17:30',
    alamat: 'Aula SMAN 1 Kendari, Jl. Slamet Riyadi No. 10, Kendari',
    items: [['mn-tumpeng', 20], ['mn-sate-ayam', 20], ['mn-es-jeruk', 20]],
    catatan: 'Bawa meja lipat untuk tumpeng dan panggung kecil.',
    catatanAntar: 'Butuh 2 armada.',
    pengantar: 'Sari (mitra)',
    dp: 1_840_000,
    status: 'dikonfirmasi',
  },
  {
    id: 'ps-013',
    nama: 'Salma Nurhaliza',
    kontak: '0823 5566 7788',
    jenisAcara: 'Tahlilan Keluarga',
    offsetHari: 6,
    jamAcara: '19:30',
    alamat: 'Jl. Wahyu Asri No. 2, Bende, Kendari',
    items: [['mn-ayam-bakar', 24], ['mn-risoles', 24], ['mn-es-teh', 24]],
    catatan: 'Makanan dibagi setelah acara doa bersama.',
    catatanAntar: '',
    pengantar: '',
    dp: 300_000,
    status: 'inquiry',
  },
  {
    id: 'ps-014',
    nama: 'Dewi Lestari',
    kontak: '0812 5544 3322',
    jenisAcara: 'Arisan Bulanan Rapor',
    offsetHari: 9,
    jamAcara: '11:00',
    alamat: 'Perum Griya Asri Jl. Merpati No. 8, Kandai, Kendari',
    items: [['mn-tumpeng', 10], ['mn-es-teh', 10]],
    catatan: 'Pelanggan berulang, harga sudah disesuaikan untuk volume.',
    catatanAntar: 'Ambil sendiri di workshop.',
    pengantar: '',
    dp: 380_000,
    status: 'inquiry',
  },
  {
    id: 'ps-015',
    nama: 'PT Karya Bahari Sentosa',
    kontak: '0401 4455 6677',
    jenisAcara: 'Town Hall Karyawan',
    offsetHari: 12,
    jamAcara: '08:00',
    alamat: 'Kantor Cabang Kendari, Jl. Adi Buana No. 5, Wuwu, Kendari',
    items: [['mn-iga-sapi', 95], ['mn-es-jeruk', 95]],
    catatan: 'Dua titik pengantaran: auditorium dan area kantin.',
    catatanAntar: 'Armada pertama 07.00, kedua 10.00.',
    pengantar: 'Ahmad (mitra)',
    dp: 3_000_000,
    status: 'dikonfirmasi',
  },
  {
    id: 'ps-016',
    nama: 'Nurhayati Arifin',
    kontak: '0811 9090 4321',
    jenisAcara: 'Pengajian Akbar',
    offsetHari: 19,
    jamAcara: '13:00',
    alamat: 'Lapangan Rwangi, Jl. Pemuda No. 88, Kendari',
    items: [['mn-ayam-gepuk', 120], ['mn-es-teh', 120]],
    catatan: 'Pesanan besar, konfirmasi ketersediaan bahan baku lebih dulu.',
    catatanAntar: 'Perlu 3 armada + 2 trek.',
    pengantar: 'Sari (mitra)',
    dp: 0,
    status: 'inquiry',
  },
];

export function buatPesananContoh(acuan = hariIni()): Pesanan[] {
  const menus = buatMenuContoh();
  const index = new Map(menus.map((m) => [m.id, m]));

  return DAFTAR.map((bahan, nomor) => {
    const tanggalAcara = geserHari(acuan, bahan.offsetHari);
    const items: ItemPesanan[] = bahan.items.map(([menuId, jumlahPorsi], posisi) => {
      const menu = index.get(menuId);
      if (!menu) throw new Error(`Menu contoh "${menuId}" tidak ditemukan.`);
      return {
        id: `${bahan.id}-${posisi}`,
        menuId: menu.id,
        namaMenu: menu.nama,
        kategori: menu.kategori,
        hargaPerPorsi: menu.hargaPerPorsi,
        jumlahPorsi,
      };
    });

    const dibuat = new Date(`${tanggalAcara}T07:30:00`);
    dibuat.setDate(dibuat.getDate() - Math.abs(bahan.offsetHari) - 2);

    return {
      id: bahan.id,
      kode: `ORD-${tanggalAcara.slice(0, 4)}-${String(nomor + 1).padStart(4, '0')}`,
      namaPelanggan: bahan.nama,
      kontak: bahan.kontak,
      jenisAcara: bahan.jenisAcara,
      tanggalAcara,
      jamAcara: bahan.jamAcara,
      alamat: bahan.alamat,
      items,
      catatan: bahan.catatan,
      catatanAntar: bahan.catatanAntar,
      pengantar: bahan.pengantar,
      dp: bahan.dp,
      status: bahan.status,
      sumber: 'contoh' as const,
      dibuatPada: dibuat.toISOString(),
      diperbaruiPada: new Date(`${tanggalAcara}T08:15:00`).toISOString(),
    } satisfies Pesanan;
  });
}

export function buatAturanContoh(): AturanOtomasi[] {
  const dibuat = stempelWaktu();
  return [
    {
      id: 'at-dp-lunas',
      nama: 'Otomatis konfirmasi bila DP sudah masuk',
      aktif: true,
      pemicu: 'pesanan-ditambahkan',
      kondisi: [{ id: 'k1', bidang: 'dpPersen', operator: 'lebihDari', nilai: '50' }],
      tindakan: [{ id: 't1', jenis: 'naikkan-status', parameter: '' }],
      dibuatPada: dibuat,
      eksekusi: 0,
    },
    {
      id: 'at-h1',
      nama: 'Ingat cek bahan H-1',
      aktif: true,
      pemicu: 'harian',
      kondisi: [{ id: 'k2', bidang: 'hariMenujuAcara', operator: 'kurangDari', nilai: '1' }],
      tindakan: [{ id: 't2', jenis: 'buat-tugas', parameter: '' }],
      dibuatPada: dibuat,
      eksekusi: 0,
    },
    {
      id: 'at-inquiry',
      nama: 'Tugas konfirmasi untuk inquiry baru',
      aktif: true,
      pemicu: 'pesanan-ditambahkan',
      kondisi: [{ id: 'k3', bidang: 'status', operator: 'samaDengan', nilai: 'inquiry' }],
      tindakan: [{ id: 't3', jenis: 'buat-tugas', parameter: '' }],
      dibuatPada: dibuat,
      eksekusi: 0,
    },
  ];
}

export function buatTugasContoh(acuan = hariIni()): Tugas[] {
  const dibuat = stempelWaktu();
  return [
    {
      id: 'tg-1',
      judul: 'Cek stok ayam broiler untuk 110 porsi hari ini',
      detail: 'Ayam broiler dan beras premium perlu dipesan ulang sebelum besok.',
      batasWaktu: acuan,
      prioritas: 'tinggi',
      selesai: false,
      sumber: 'otomasi',
      dibuatPada: dibuat,
      pesananId: 'ps-007',
    },
    {
      id: 'tg-2',
      judul: 'Cetak tiket dapur untuk hari ini',
      detail: 'Cetak lembar produksi sebelum pukul 09.00 agar dapur punya rencana kerja.',
      batasWaktu: acuan,
      prioritas: 'sedang',
      selesai: false,
      sumber: 'pengguna',
      dibuatPada: dibuat,
      pesananId: null,
    },
  ];
}

export function buatDataContoh(acuan = hariIni()): DataAplikasi {
  return {
    version: VERSI_SKEMA,
    disimpanPada: stempelWaktu(),
    menus: buatMenuContoh(),
    pesanan: buatPesananContoh(acuan),
    tugas: buatTugasContoh(acuan),
    aturan: buatAturanContoh(),
    aktivitas: [
      {
        id: 'ak-1',
        waktu: stempelWaktu(),
        jenis: 'atasReset',
        judul: 'Data contoh dimuat',
        detail: `${DAFTAR.length} pesanan dan ${buatMenuContoh().length} menu contoh dibuat berdasarkan ${acuan}.`,
        oleh: 'sistem',
      },
    ],
    contoh: true,
    preferensi: { ...PREFSI_BAWAAN },
  };
}

export const SEMUA_KATEGORI = KATEGORI_MENU;
export { LABEL_KATEGORI };