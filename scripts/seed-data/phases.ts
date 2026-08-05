/**
 * Seed data: event_phases
 *
 * Source: src/lib/eventPhase.js getEventPhase function
 * 9 phases hardcoded in the function's return objects
 */

// ─── Event Phases (9 rows) ───
export const phasesSeed = [
  // Phase 1: PRE_EVENT
  {
    phaseKey: 'PRE_EVENT',
    badgeLabel: 'MENYONGSONG HUT RI KE-81',
    badgeColor: 'bg-rose-500/25 text-rose-100 border-rose-300/40',
    statusType: 'upcoming',
    title: 'Persiapan Perayaan Kemerdekaan',
    subtitle: 'Siapkan ruang dan semangat kelompokmu menyambut perlombaan!',
    targetDate: new Date('2026-08-03T09:00:00'),
    targetLabel: 'Menuju Sosialisasi Lomba',
    themeColor: 'red' as const,
    reminders: [
      { icon: 'fa-bullhorn', title: 'Sosialisasi Lomba', text: 'Senin, 3 Agustus 2026 jam 09.00 WIB.' },
      { icon: 'fa-users', title: 'Pembentukan Tim', text: 'Pastikan anggota tim ruanganmu sudah siap.' },
      { icon: 'fa-book-open', title: 'Pelajari Panduan', text: 'Baca aturan teknis lomba di menu Lomba.' },
    ],
    actionLabel: 'Lihat Jadwal Lengkap',
    actionLink: '/rundown',
    sortOrder: 1,
  },

  // Phase 2: SOSIALISASI
  {
    phaseKey: 'SOSIALISASI',
    badgeLabel: 'HARI INI: SOSIALISASI LOMBA',
    badgeColor: 'bg-blue-500/25 text-blue-100 border-blue-300/40',
    statusType: 'active',
    title: 'Sosialisasi & Penjelasan Aturan Lomba',
    subtitle: 'Senin, 3 Agustus 2026 · Simak teknis lomba dan siapkan tim!',
    targetDate: new Date('2026-08-04T00:00:00'),
    targetLabel: 'Mulai Masa Dekorasi (Besok)',
    themeColor: 'blue' as const,
    reminders: [
      { icon: 'fa-clipboard-list', title: 'Aturan Perlombaan', text: 'Pahami syarat & teknis 3 cabang lomba tahun ini.' },
      { icon: 'fa-paint-roller', title: 'Persiapan Bahan Dekor', text: 'Siapkan hiasan aman (foam tape) untuk dekorasi besok.' },
      { icon: 'fa-user-check', title: 'Cek Kelompok', text: 'Pastikan nama kamu terdaftar di daftar tim.' },
    ],
    actionLabel: 'Pelajari Panduan Lomba',
    actionLink: '/lomba',
    sortOrder: 2,
  },

  // Phase 3: DEKORASI
  {
    phaseKey: 'DEKORASI',
    badgeLabel: 'SEDANG BERLANGSUNG: MASA DEKORASI',
    badgeColor: 'bg-amber-400/20 text-amber-200 border-amber-300/40',
    statusType: 'active',
    title: 'Lomba Dekorasi Ruangan (4–7 Agustus)',
    subtitle: 'Hias area kerja ruanganmu sekreatif mungkin bertema HUT RI ke-81!',
    targetDate: new Date('2026-08-07T17:00:00'),
    targetLabel: 'Sisa Waktu Dekorasi Ruangan',
    themeColor: 'amber' as const,
    reminders: [
      { icon: 'fa-tape', title: 'Perekat Aman', text: 'Wajib pakai foam tape. Dilarang keras paku & cat!' },
      { icon: 'fa-video-slash', title: 'Bebas Menutupi CCTV', text: 'Dekorasi TIDAK boleh menghalangi sudut pandang kamera CCTV.' },
      { icon: 'fa-broom', title: 'Jaga Kebersihan (5R)', text: 'Bersihkan sisa sampah hiasan setelah selesai menghias.' },
    ],
    actionLabel: 'Panduan Lomba Dekorasi',
    actionLink: '/lomba/dekor-5r',
    sortOrder: 3,
  },

  // Phase 4: PENILAIAN_5R_AWAL
  {
    phaseKey: 'PENILAIAN_5R_AWAL',
    badgeLabel: 'SEDANG BERLANGSUNG: PENILAIAN 5R',
    badgeColor: 'bg-emerald-400/20 text-emerald-200 border-emerald-300/40',
    statusType: 'active',
    title: 'Masa Sidak Penilaian 5R Harian',
    subtitle: 'Juri melakukan penilaian berkala di setiap ruangan pada hari kerja.',
    targetDate: new Date('2026-08-13T12:45:00'),
    targetLabel: 'Menuju Hari Puncak Lomba',
    themeColor: 'emerald' as const,
    reminders: [
      { icon: 'fa-sparkles', title: '5R Terinci', text: 'Ringkas, Rapi, Resik, Rawat, dan Rajin jaga harian.' },
      { icon: 'fa-clipboard-check', title: 'Sidak Tanpa Pemberitahuan', text: 'Penilaian dilakukan acak saat jam kerja.' },
      { icon: 'fa-plug', title: 'Rapikan Kabel & Meja', text: 'Gunakan cable tie dan susun dokumen meja dengan rapi.' },
    ],
    actionLabel: 'Kriteria Penilaian 5R',
    actionLink: '/lomba/dekor-5r',
    sortOrder: 4,
  },

  // Phase 5: HARI_PUNCAK_PRE
  {
    phaseKey: 'HARI_PUNCAK_PRE',
    badgeLabel: 'HARI INI: HARI PUNCAK LOMBA',
    badgeColor: 'bg-red-500 text-white border-red-300 animate-pulse shadow-md',
    statusType: 'live',
    title: 'Hari Puncak Lomba Kemerdekaan!',
    subtitle: 'Kamis, 13 Agustus 2026 · Perlombaan Estafet Balon & Air di Halaman TKI.',
    targetDate: new Date('2026-08-13T12:45:00'),
    targetLabel: 'Mulai Acara Puncak (12.45 WIB)',
    themeColor: 'red' as const,
    reminders: [
      { icon: 'fa-clock', title: 'Mulai 12.45 WIB', text: 'Kumpul di Halaman TKI tepat waktu.' },
      { icon: 'fa-shirt', title: 'Pakaian Siap Basah', text: 'Gunakan kostum tim/kaos yang nyaman & siap terkena air.' },
      { icon: 'fa-flag-checkered', title: 'Estafet Balon & Air', text: 'Siapkan strategi kelompok Putra & Putri terbaikmu!' },
    ],
    actionLabel: 'Lihat Schedule Puncak',
    actionLink: '/rundown',
    sortOrder: 5,
  },

  // Phase 6: HARI_PUNCAK_LIVE
  {
    phaseKey: 'HARI_PUNCAK_LIVE',
    badgeLabel: 'LIVE: ACARA SEDANG BERLANGSUNG',
    badgeColor: 'bg-emerald-500 text-white border-emerald-300 animate-pulse shadow-md',
    statusType: 'live',
    title: 'Perlombaan Utama Sedang Berlangsung!',
    subtitle: 'Estafet Balon Tanpa Tangan & Estafet Air Gelas Bocor di Halaman TKI.',
    targetDate: new Date('2026-08-13T17:00:00'),
    targetLabel: 'Perkiraan Acara Selesai',
    themeColor: 'emerald' as const,
    reminders: [
      { icon: 'fa-heart-pulse', title: 'Semangat Bertanding!', text: 'Jaga sportifitas dan kebersamaan tim.' },
      { icon: 'fa-shield-halved', title: 'Utamakan Keselamatan', text: 'Hati-hati lantai licin saat estafet air.' },
      { icon: 'fa-bullhorn', title: 'Dukung Timmu', text: 'Beri sorakan terbaik untuk perwakilan kelompokmu!' },
    ],
    actionLabel: 'Panduan Lomba Lapangan',
    actionLink: '/lomba',
    sortOrder: 6,
  },

  // Phase 7: PENILAIAN_5R_LANJUT
  {
    phaseKey: 'PENILAIAN_5R_LANJUT',
    badgeLabel: 'MENUNGGU PENGUMUMAN JUARA',
    badgeColor: 'bg-purple-500/25 text-purple-100 border-purple-300/40',
    statusType: 'active',
    title: 'Lomba Lapangan Selesai · Penilaian 5R Masih Berjalan',
    subtitle: 'Terima kasih atas keseruan hari puncak! Penilaian 5R berlanjut hingga 27 Agustus.',
    targetDate: new Date('2026-08-28T13:00:00'),
    targetLabel: 'Menuju Pengumuman Pemenang',
    themeColor: 'purple' as const,
    reminders: [
      { icon: 'fa-broom', title: 'Pertahankan 5R', text: 'Juri masih merekap poin 5R di setiap ruangan.' },
      { icon: 'fa-trophy', title: 'Pengumuman 28 Agustus', text: 'Pengumuman pemenang dilaksanakan Jumat, 28 Agustus.' },
      { icon: 'fa-mosque', title: 'Lokasi Pengumuman', text: 'Dilaksanakan setelah kajian Jumat di Mushola TKI.' },
    ],
    actionLabel: 'Cek Daftar Tim',
    actionLink: '/tim',
    sortOrder: 7,
  },

  // Phase 8: PENGUMUMAN_DAY (pre-live)
  {
    phaseKey: 'PENGUMUMAN_DAY',
    badgeLabel: 'HARI INI: PENGUMUMAN PEMENANG JUARA',
    badgeColor: 'bg-amber-500 text-white border-amber-300 animate-pulse shadow-md',
    statusType: 'live',
    title: 'Hari Pengumuman Pemenang & Hadiah!',
    subtitle: 'Jumat, 28 Agustus 2026 · Pengumuman dilaksanakan pukul 13.00 WIB (setelah kajian Jumat).',
    targetDate: new Date('2026-08-28T13:00:00'),
    targetLabel: 'Mulai Pengumuman Juara (13.00 WIB)',
    themeColor: 'amber' as const,
    reminders: [
      { icon: 'fa-mosque', title: 'Kajian Jumat', text: 'Ikuti kajian Jumat terlebih dahulu di Mushola TKI.' },
      { icon: 'fa-gift', title: 'Pembagian Hadiah', text: 'Penyerahan trofi & hadiah untuk semua pemenang cabang lomba.' },
      { icon: 'fa-camera', title: 'Foto Bersama', text: 'Sesi dokumentasi bersama seluruh peserta & panitia.' },
    ],
    actionLabel: 'Lihat Detail Rundown',
    actionLink: '/rundown',
    sortOrder: 8,
  },

  // Phase 9: FINISHED
  {
    phaseKey: 'FINISHED',
    badgeLabel: 'RANGKAIAN ACARA TELAH SELESAI',
    badgeColor: 'bg-white/20 text-white border-white/30',
    statusType: 'completed',
    title: 'Terima Kasih Atas Partisipasinya!',
    subtitle:
      'Seluruh rangkaian peringatan HUT RI ke-81 PT TKI x PT FTP telah terlaksana dengan sukses.',
    targetDate: null,
    targetLabel: 'Acara Selesai',
    themeColor: 'slate' as const,
    reminders: [
      { icon: 'fa-heart', title: 'Semangat Kemerdekaan', text: 'Terus jaga kekompakan & kebersihan 5R di tempat kerja.' },
      { icon: 'fa-flag', title: 'Merdeka!', text: 'Indonesia Berdaulat, Adil, dan Makmur.' },
    ],
    actionLabel: 'Lihat Semua Tim',
    actionLink: '/tim',
    sortOrder: 9,
  },
]
