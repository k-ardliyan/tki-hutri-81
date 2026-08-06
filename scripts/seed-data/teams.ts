/**
 * Seed data: teams, team_members
 *
 * Model employee-centric: team_members = junction (teamId, employeeId).
 * Teams: 14 = 8 putra + 5 putri + 1 panitia. kode = isi QR gelang.
 *
 * teamMembersSeed di-rebuild di scripts/seed.ts dari mapping employee (by nama/nip).
 */

export interface TeamSeed {
  kategori: 'putra' | 'putri' | 'panitia'
  nomor: number | null
  nama: string
  kode: string
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
  // ── Putri ──
  { kategori: 'putri', nomor: 1, nama: 'Tim Putri 1', kode: 'PUTRI-1' },
  { kategori: 'putri', nomor: 2, nama: 'Tim Putri 2', kode: 'PUTRI-2' },
  { kategori: 'putri', nomor: 3, nama: 'Tim Putri 3', kode: 'PUTRI-3' },
  { kategori: 'putri', nomor: 4, nama: 'Tim Putri 4', kode: 'PUTRI-4' },
  { kategori: 'putri', nomor: 5, nama: 'Tim Putri 5', kode: 'PUTRI-5' },
  // ── Panitia ──
  { kategori: 'panitia', nomor: null, nama: 'Tim Panitia', kode: 'PANITIA' },
]

/**
 * Team member names (per team) — mapping lama (nama), di-rebuild ke employeeId di seed.ts.
 * Urutan sesuai sortOrder.
 */
export const teamMemberNamesSeed: Record<string, string[]> = {
  'Tim Putra 1': ['Arif Arinto', 'Inung Pratama', 'Farras Afifni Zakki', 'Nur Wahyudi', 'Yazid Ihsan', 'Beryl Galih Ardiansyah', 'Dian Kurnia Widya Buana'],
  'Tim Putra 2': ['Irfan Kurnia', 'Rifandi Dwi Sulistiyo', 'Ibrahim', 'Nuur Zakki Zamani Pamungkas', 'Yogo Ari Nugroho', 'Daffa Exa Fawwaz'],
  'Tim Putra 3': ['Kristriyanto', 'Agung Burhanudin Yusuf', 'Ilham Dwi Atmojo', 'Phepbi Muhammad', 'Yudi Kurniawan', 'Fajar Utama'],
  'Tim Putra 4': ['Muhamad Ali Mustofa', 'Aji Setiawan', 'Ilham Izdhihar', 'Sindu Kisna Indracahya', 'Zainal Abidin', 'Ikmal Kholis'],
  'Tim Putra 5': ['Wuntat Wiranto', 'Andrea Prahita Janardana', 'Indra Kurniawan', 'Taufik Rahmad Hidayanto', 'Zulkarnain Miranda', 'Mochamad Yusuf Qardafi'],
  'Tim Putra 6': ['Ferry Adi Setyawan', 'Arief Raihan Syauqie', 'Joko Makruf', 'Tegar Sanubari', 'Adi Mas Rizal Fadillah', 'Muhamad Azim Mustajib'],
  'Tim Putra 7': ['Adi Arisman', 'Arik Riko Prasetya', 'Moh.Irvan Andriansyah', 'Teguh Wahyu Saputro', 'Agung Putro Setiawan', 'Muhammad Kastoni'],
  'Tim Putra 8': ['Dedy Himawan Setyadi', 'Aprela Agif Sofyan', 'Muhammad Budiana Eka Faruqi', 'Warto Nur Prasetyo', 'Akbar Adji Pradana', 'Nur Udin Syahroni'],
  'Tim Putri 1': ['Monna Marissa', 'Serly Hartina', 'Aisyah Nimas Adara', 'Ervina Fauziah', 'Sandrika', 'Ella'],
  'Tim Putri 2': ['Annisa Febriani', 'Lutfah Fadilah', 'Azizah Wismaningsih', 'Kurnia Sari', 'Umi Khoiriyah', 'Armitha Sekar Prastita'],
  'Tim Putri 3': ['Diah Ayu Wulandari', 'Raden Roro Dwi Irawati', 'Afifah Widyastuti', 'Mei Ambarwati', 'Vika Alpiana', 'Dian Nur Widyaningrum'],
  'Tim Putri 4': ['Idza Nur Haida', 'Siti Khumairoh', 'Ipok Diva Nain', 'Asyella Veratia Azahra Putri Qodri', 'Aliciea Bunga Septania', 'Pandita Ardiningrum Arifianto'],
  'Tim Putri 5': ['Risda Ningrum', 'Vina Putri Nemiramas', 'Amelia Friska Pertiwi', 'Martisa Rina Rahayu', 'Istiana', 'Ika Rosidah'],
  'Tim Panitia': ['Rafiu Sidqi', 'Yeni Solikah', 'Kholifatul Ardliyan', 'Ulinuha Dani Fadlan', 'Nabiil Hilmi Makaarim', 'Indah Istiqlallia', 'Muhammad Setiadi Pratama', 'Intan Narulita Budyawan', 'Ogan Oktavianto', 'Lula Leul Mawahib', "M. Miftakul Ma'ruf", 'Zaenudin Ifkhar Nugroho', 'Alfian Dimas Saputra', 'Rohmad Abdul Syakur'],
}

/** 3 superadmin dari data employee (username = nama lowercase tanpa spasi) */
export const superadminNames = ['Kholifatul Ardliyan', 'Rafiu Sidqi', 'Yeni Solikah']
