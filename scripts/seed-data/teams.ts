/**
 * Seed data: teams, team_members
 *
 * Model employee-centric: team_members = junction (teamId, employeeId).
 * Teams: 18 = 10 putra + 7 putri + 1 panitia. kode = isi QR gelang.
 * Tim Putra 9-10 + Tim Putri 6-7 = tim PKL (anggota di-acak dari attendance-PKL TKI 070826.xlsx).
 *
 * teamMembersSeed di-rebuild di scripts/seed.ts dari mapping employee (by nama/nip).
 */

export interface TeamSeed {
  kategori: 'putra' | 'putri' | 'panitia';
  nomor: number | null;
  nama: string;
  kode: string;
}

export const teamsSeed: TeamSeed[] = [
  // ── Putra ──
  { kategori: 'putra', nomor: 1, nama: 'Tim Putra 1', kode: 'PUTRA-1' },
  { kategori: 'putra', nomor: 2, nama: 'Tim Putra 2', kode: 'PUTRA-2' },
  { kategori: 'putra', nomor: 3, nama: 'Tim Putra 3', kode: 'PUTRA-3' },
  { kategori: 'putra', nomor: 4, nama: 'Tim Putra 4', kode: 'PUTRA-4' },
  { kategori: 'putra', nomor: 5, nama: 'Tim Putra 5', kode: 'PUTRA-5' },
  { kategori: 'putra', nomor: 6, nama: 'Tim Putra 6', kode: 'PUTRA-6' },
  { kategori: 'putra', nomor: 7, nama: 'Tim Putra 7', kode: 'PUTRA-7' },
  { kategori: 'putra', nomor: 8, nama: 'Tim Putra 8', kode: 'PUTRA-8' },
  // ── PKL Putra (acak dari attendance-PKL TKI 070826.xlsx, 11 orang = 6+5) ──
  { kategori: 'putra', nomor: 9, nama: 'Tim Putra 9', kode: 'PUTRA-9' },
  { kategori: 'putra', nomor: 10, nama: 'Tim Putra 10', kode: 'PUTRA-10' },
  // ── Putri ──
  { kategori: 'putri', nomor: 1, nama: 'Tim Putri 1', kode: 'PUTRI-1' },
  { kategori: 'putri', nomor: 2, nama: 'Tim Putri 2', kode: 'PUTRI-2' },
  { kategori: 'putri', nomor: 3, nama: 'Tim Putri 3', kode: 'PUTRI-3' },
  { kategori: 'putri', nomor: 4, nama: 'Tim Putri 4', kode: 'PUTRI-4' },
  { kategori: 'putri', nomor: 5, nama: 'Tim Putri 5', kode: 'PUTRI-5' },
  // ── PKL Putri (acak dari attendance-PKL TKI 070826.xlsx, 12 orang = 6+6) ──
  { kategori: 'putri', nomor: 6, nama: 'Tim Putri 6', kode: 'PUTRI-6' },
  { kategori: 'putri', nomor: 7, nama: 'Tim Putri 7', kode: 'PUTRI-7' },
  // ── Panitia ──
  { kategori: 'panitia', nomor: null, nama: 'Tim Panitia', kode: 'PANITIA' },
];

/**
 * Team member names (per team) — mapping lama (nama), di-rebuild ke employeeId di seed.ts.
 * Urutan sesuai sortOrder.
 */
export const teamMemberNamesSeed: Record<string, string[]> = {
  'Tim Putra 1': [
    'Arif Arinto',
    'Inung Pratama',
    'Farras Afifni Zakki',
    'Nur Wahyudi',
    'Yazid Ihsan',
    'Beryl Galih Ardiansyah',
    'Dian Kurnia Widya Buana',
  ],
  'Tim Putra 2': [
    'Irfan Kurnia',
    'Rifandi Dwi Sulistiyo',
    'Ibrahim',
    'Nuur Zakki Zamani Pamungkas',
    'Yogo Ari Nugroho',
    'Daffa Exa Fawwaz',
  ],
  'Tim Putra 3': [
    'Kristriyanto',
    'Agung Burhanudin Yusuf',
    'Ilham Dwi Atmojo',
    'Phepbi Muhammad',
    'Yudi Kurniawan',
    'Fajar Utama',
  ],
  'Tim Putra 4': [
    'Muhamad Ali Mustofa',
    'Aji Setiawan',
    'Ilham Izdhihar',
    'Sindu Kisna Indracahya',
    'Zainal Abidin',
    'Ikmal Kholis',
  ],
  'Tim Putra 5': [
    'Wuntat Wiranto',
    'Andrea Prahita Janardana',
    'Indra Kurniawan',
    'Taufik Rahmad Hidayanto',
    'Zulkarnain Miranda',
    'Mochamad Yusuf Qardafi',
  ],
  'Tim Putra 6': [
    'Ferry Adi Setyawan',
    'Arief Raihan Syauqie',
    'Joko Makruf',
    'Tegar Sanubari',
    'Adi Mas Rizal Fadillah',
    'Muhamad Azim Mustajib',
  ],
  'Tim Putra 7': [
    'Adi Arisman',
    'Arik Riko Prasetya',
    'Moh.Irvan Andriansyah',
    'Teguh Wahyu Saputro',
    'Agung Putro Setiawan',
    'Muhammad Kastoni',
  ],
  'Tim Putra 8': [
    'Dedy Himawan Setyadi',
    'Aprela Agif Sofyan',
    'Muhammad Budiana Eka Faruqi',
    'Warto Nur Prasetyo',
    'Akbar Adji Pradana',
    'Nur Udin Syahroni',
  ],
  'Tim Putri 1': [
    'Monna Marissa',
    'Serly Hartina',
    'Aisyah Nimas Adara',
    'Ervina Fauziah',
    'Sandrika',
    'Ella',
  ],
  'Tim Putri 2': [
    'Annisa Febriani',
    'Lutfah Fadilah',
    'Azizah Wismaningsih',
    'Kurnia Sari',
    'Umi Khoiriyah',
    'Armitha Sekar Prastita',
  ],
  'Tim Putri 3': [
    'Diah Ayu Wulandari',
    'Raden Roro Dwi Irawati',
    'Afifah Widyastuti',
    'Mei Ambarwati',
    'Vika Alpiana',
    'Dian Nur Widyaningrum',
  ],
  'Tim Putri 4': [
    'Idza Nur Haida',
    'Siti Khumairoh',
    'Ipok Diva Nain',
    'Asyella Veratia Azahra Putri Qodri',
    'Aliciea Bunga Septania',
    'Pandita Ardiningrum Arifianto',
  ],
  'Tim Putri 5': [
    'Risda Ningrum',
    'Vina Putri Nemiramas',
    'Amelia Friska Pertiwi',
    'Martisa Rina Rahayu',
    'Istiana',
    'Ika Rosidah',
  ],
  // ── PKL Putra (random seed 20260807) ──
  'Tim Putra 9': [
    'MUHAMMAD RIDWAN ADZAHABI',
    'RAMA SATYO SASONGKO',
    'BARRA RIZKY WIDIYANTO',
    'MUHAMAD DAVA ALGHAZALI',
    'MAHATMA RAFI NAYAKA',
    'BILAL HAMZAH ARDIANSYAH',
  ],
  'Tim Putra 10': [
    'AHMAD FAISAL',
    'ORLANDO KENZO LIONEL PUTRA',
    'HIMAS ARYA RAHMADHANI',
    'MUHAMMAD ALDY WIBISONO',
    'AHMAD AZIZY AFIFUDIN',
  ],
  // ── PKL Putri (random seed 20260807) ──
  'Tim Putri 6': [
    'AUDIA AL FARIZA',
    'KAHNA AYATIN NUJMI',
    'SERLI WULAN SAFITRI',
    'TALITHA ARISTAWATI',
    'CITA CHOTMILLATI',
    'EKA SYIFA NABILAH',
  ],
  'Tim Putri 7': [
    'EKA YULIANTI',
    'AZZAHRA PUTRI DESTITA',
    'ADINDA TIFANI KARUNIA',
    'TIYAS STYANINGRUM',
    "ATSNA MAULIDA QUROTIL 'AINI",
    'DANIAL MAULIDIA',
  ],
  'Tim Panitia': [
    'Rafiu Sidqi',
    'Yeni Solikah',
    'Kholifatul Ardliyan',
    'Ulinuha Dani Fadlan',
    'Nabiil Hilmi Makaarim',
    'Indah Istiqlallia',
    'Muhammad Setiadi Pratama',
    'Intan Narulita Budyawan',
    'Ogan Oktavianto',
    'Lula Leul Mawahib',
    "M. Miftakul Ma'ruf",
    'Zaenudin Ifkhar Nugroho',
    'Alfian Dimas Saputra',
    'Rohmad Abdul Syakur',
  ],
};

/** 3 superadmin + 6 audit dari data employee (username = nama lowercase tanpa spasi) */
export const superadminNames = ['Kholifatul Ardliyan', 'Rafiu Sidqi', 'Yeni Solikah'];
export const auditNames = [
  'Arif Arinto',
  'Ferry Adi Setyawan',
  'Agung Putro Setiawan',
  'Yudi Kurniawan',
  'Raden Roro Dwi Irawati',
  'Wuntat Wiranto',
];
