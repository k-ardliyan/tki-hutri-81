/**
 * Seed data: teams, team_members
 *
 * Source: src/data/kelompok.js dataKelompok array
 * 13 teams: 8 putra + 5 putri, 73 total members
 */

// ─── Teams (13 rows) ───
// id is auto-generated (serial); member references use 1-based insertion order
export const teamsSeed: Array<{ kategori: 'putra' | 'putri'; nomor: number; nama: string }> = [
  { kategori: 'putra', nomor: 1, nama: 'Tim Putra 1' },
  { kategori: 'putra', nomor: 2, nama: 'Tim Putra 2' },
  { kategori: 'putra', nomor: 3, nama: 'Tim Putra 3' },
  { kategori: 'putra', nomor: 4, nama: 'Tim Putra 4' },
  { kategori: 'putra', nomor: 5, nama: 'Tim Putra 5' },
  { kategori: 'putra', nomor: 6, nama: 'Tim Putra 6' },
  { kategori: 'putra', nomor: 7, nama: 'Tim Putra 7' },
  { kategori: 'putra', nomor: 8, nama: 'Tim Putra 8' },
  { kategori: 'putri', nomor: 1, nama: 'Tim Putri 1' },
  { kategori: 'putri', nomor: 2, nama: 'Tim Putri 2' },
  { kategori: 'putri', nomor: 3, nama: 'Tim Putri 3' },
  { kategori: 'putri', nomor: 4, nama: 'Tim Putri 4' },
  { kategori: 'putri', nomor: 5, nama: 'Tim Putri 5' },
]

// ─── Team Members (73 rows) ───
// teamId references teams by sortOrder (1–13): putra 1–8 → teamId 1–8, putri 1–5 → teamId 9–13
export const teamMembersSeed = [
  // ── Tim Putra 1 (teamId: 1) ──
  { teamId: 1, nama: 'Arif Arinto', sortOrder: 1 },
  { teamId: 1, nama: 'Inung Pratama', sortOrder: 2 },
  { teamId: 1, nama: 'Farras Afifni Zakki', sortOrder: 3 },
  { teamId: 1, nama: 'Nur Wahyudi', sortOrder: 4 },
  { teamId: 1, nama: 'Yazid Ihsan', sortOrder: 5 },
  { teamId: 1, nama: 'Beryl Galih Ardiansyah', sortOrder: 6 },
  { teamId: 1, nama: 'Dian Kurnia Widya Buana', sortOrder: 7 },

  // ── Tim Putra 2 (teamId: 2) ──
  { teamId: 2, nama: 'Irfan Kurnia', sortOrder: 1 },
  { teamId: 2, nama: 'Rifandi Dwi Sulistiyo', sortOrder: 2 },
  { teamId: 2, nama: 'Ibrahim', sortOrder: 3 },
  { teamId: 2, nama: 'Nuur Zakki Zamani Pamungkas', sortOrder: 4 },
  { teamId: 2, nama: 'Yogo Ari Nugroho', sortOrder: 5 },
  { teamId: 2, nama: 'Daffa Exa Fawwaz', sortOrder: 6 },

  // ── Tim Putra 3 (teamId: 3) ──
  { teamId: 3, nama: 'Kristriyanto', sortOrder: 1 },
  { teamId: 3, nama: 'Agung Burhanudin Yusuf', sortOrder: 2 },
  { teamId: 3, nama: 'Ilham Dwi Atmojo', sortOrder: 3 },
  { teamId: 3, nama: 'Phepbi Muhammad', sortOrder: 4 },
  { teamId: 3, nama: 'Yudi Kurniawan', sortOrder: 5 },
  { teamId: 3, nama: 'Fajar Utama', sortOrder: 6 },

  // ── Tim Putra 4 (teamId: 4) ──
  { teamId: 4, nama: 'Muhamad Ali Mustofa', sortOrder: 1 },
  { teamId: 4, nama: 'Aji Setiawan', sortOrder: 2 },
  { teamId: 4, nama: 'Ilham Izdhihar', sortOrder: 3 },
  { teamId: 4, nama: 'Sindu Kisna Indracahya', sortOrder: 4 },
  { teamId: 4, nama: 'Zainal Abidin', sortOrder: 5 },
  { teamId: 4, nama: 'Ikmal Kholis', sortOrder: 6 },

  // ── Tim Putra 5 (teamId: 5) ──
  { teamId: 5, nama: 'Wuntat Wiranto', sortOrder: 1 },
  { teamId: 5, nama: 'Andrea Prahita Janardana', sortOrder: 2 },
  { teamId: 5, nama: 'Indra Kurniawan', sortOrder: 3 },
  { teamId: 5, nama: 'Taufik Rahmad Hidayanto', sortOrder: 4 },
  { teamId: 5, nama: 'Zulkarnain Miranda', sortOrder: 5 },
  { teamId: 5, nama: 'Mochamad Yusuf Qardafi', sortOrder: 6 },

  // ── Tim Putra 6 (teamId: 6) ──
  { teamId: 6, nama: 'Ferry Adi Setyawan', sortOrder: 1 },
  { teamId: 6, nama: 'Arief Raihan Syauqie', sortOrder: 2 },
  { teamId: 6, nama: 'Joko Makruf', sortOrder: 3 },
  { teamId: 6, nama: 'Tegar Sanubari', sortOrder: 4 },
  { teamId: 6, nama: 'Adi Mas Rizal Fadillah', sortOrder: 5 },
  { teamId: 6, nama: 'Muhamad Azim Mustajib', sortOrder: 6 },

  // ── Tim Putra 7 (teamId: 7) ──
  { teamId: 7, nama: 'Adi Arisman', sortOrder: 1 },
  { teamId: 7, nama: 'Arik Riko Prasetya', sortOrder: 2 },
  { teamId: 7, nama: 'Moh.Irvan Andriansyah', sortOrder: 3 },
  { teamId: 7, nama: 'Teguh Wahyu Saputro', sortOrder: 4 },
  { teamId: 7, nama: 'Agung Putro Setiawan', sortOrder: 5 },
  { teamId: 7, nama: 'Muhammad Kastoni', sortOrder: 6 },

  // ── Tim Putra 8 (teamId: 8) ──
  { teamId: 8, nama: 'Dedy Himawan Setyadi', sortOrder: 1 },
  { teamId: 8, nama: 'Aprela Agif Sofyan', sortOrder: 2 },
  { teamId: 8, nama: 'Muhammad Budiana Eka Faruqi', sortOrder: 3 },
  { teamId: 8, nama: 'Warto Nur Prasetyo', sortOrder: 4 },
  { teamId: 8, nama: 'Akbar Adji Pradana', sortOrder: 5 },
  { teamId: 8, nama: 'Nur Udin Syahroni', sortOrder: 6 },

  // ── Tim Putri 1 (teamId: 9) ──
  { teamId: 9, nama: 'Monna Marissa', sortOrder: 1 },
  { teamId: 9, nama: 'Serly Hartina', sortOrder: 2 },
  { teamId: 9, nama: 'Aisyah Nimas Adara', sortOrder: 3 },
  { teamId: 9, nama: 'Ervina Fauziah', sortOrder: 4 },
  { teamId: 9, nama: 'Sandrika', sortOrder: 5 },
  { teamId: 9, nama: 'Ella', sortOrder: 6 },

  // ── Tim Putri 2 (teamId: 10) ──
  { teamId: 10, nama: 'Annisa Febriani', sortOrder: 1 },
  { teamId: 10, nama: 'Lutfah Fadilah', sortOrder: 2 },
  { teamId: 10, nama: 'Azizah Wismaningsih', sortOrder: 3 },
  { teamId: 10, nama: 'Kurnia Sari', sortOrder: 4 },
  { teamId: 10, nama: 'Umi Khoiriyah', sortOrder: 5 },
  { teamId: 10, nama: 'Armitha Sekar Prastita', sortOrder: 6 },

  // ── Tim Putri 3 (teamId: 11) ──
  { teamId: 11, nama: 'Diah Ayu Wulandari', sortOrder: 1 },
  { teamId: 11, nama: 'Raden Roro Dwi Irawati', sortOrder: 2 },
  { teamId: 11, nama: 'Afifah Widyastuti', sortOrder: 3 },
  { teamId: 11, nama: 'Mei Ambarwati', sortOrder: 4 },
  { teamId: 11, nama: 'Vika Alpiana', sortOrder: 5 },
  { teamId: 11, nama: 'Dian Nur Widyaningrum', sortOrder: 6 },

  // ── Tim Putri 4 (teamId: 12) ──
  { teamId: 12, nama: 'Idza Nur Haida', sortOrder: 1 },
  { teamId: 12, nama: 'Siti Khumairoh', sortOrder: 2 },
  { teamId: 12, nama: 'Ipok Diva Nain', sortOrder: 3 },
  { teamId: 12, nama: 'Asyella Veratia Azahra Putri Qodri', sortOrder: 4 },
  { teamId: 12, nama: 'Aliciea Bunga Septania', sortOrder: 5 },
  { teamId: 12, nama: 'Pandita Ardiningrum Arifianto', sortOrder: 6 },

  // ── Tim Putri 5 (teamId: 13) ──
  { teamId: 13, nama: 'Risda Ningrum', sortOrder: 1 },
  { teamId: 13, nama: 'Vina Putri Nemiramas', sortOrder: 2 },
  { teamId: 13, nama: 'Amelia Friska Pertiwi', sortOrder: 3 },
  { teamId: 13, nama: 'Martisa Rina Rahayu', sortOrder: 4 },
  { teamId: 13, nama: 'Istiana', sortOrder: 5 },
  { teamId: 13, nama: 'Ika Rosidah', sortOrder: 6 },
]
