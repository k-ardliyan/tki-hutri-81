/** Konten website HUT RI ke-81
 * Disusun dari technical_rundown.md, technical_book_peserta.md,
 * dan technical_book_panitia.md.

Tipografi: Saira Semi Condensed
Tema: "Indonesia Berdaulat, Adil, dan Makmur"
*/

export const eventMeta = {
  title: 'HUT RI ke-81',
  org: 'PT TKI x PT FTP',
  year: 2026,
  theme: 'Indonesia Berdaulat, Adil, dan Makmur',
  peakDateLabel: 'Kamis, 13 Agustus 2026',
  peakTimeLabel: '12.45 WIB',
  peakTarget: '2026-08-13T12:45:00',
  eventEndTarget: '2026-08-13T17:00:00',
  awardTarget: '2026-08-28T13:00:00',
  awardEndTarget: '2026-08-28T17:00:00',
  awardDateLabel: 'Jumat, 28 Agustus 2026',
  awardNote: 'Setelah kajian Jumat',
  tagline:
    'Rayakan kemerdekaan lewat lomba, kreativitas, dan kebersamaan dalam semangat HUT RI ke-81.',
};

/** Ruangan peserta lomba dekorasi dan 5R */
export const roomAreas = [
  { id: 'implementator', name: 'CS & Implementator', icon: 'fa-gears' },
  {
    id: 'hardware-finance',
    name: 'Hardware, Finance & Legal',
    icon: 'fa-microchip',
  },
  { id: 'sales', name: 'Sales Marketing', icon: 'fa-handshake' },
  { id: 'it-dalam', name: 'IT Dalam', icon: 'fa-server' },
  { id: 'it-luar', name: 'IT Luar', icon: 'fa-network-wired' },
];

export const keyDates = [
  {
    id: 'sosialisasi',
    when: 'Senin, 3 Agustus 2026',
    title: 'Sosialisasi lomba',
    detail: 'Kenali aturan, jadwal, dan alur setiap lomba.',
  },
  {
    id: 'dekor',
    when: '4-7 Agustus 2026',
    title: 'Dekorasi ruangan',
    detail: 'Hias ruangan di area masing-masing, dari Selasa hingga Jumat.',
  },
  {
    id: 'nilai',
    when: '10-27 Agustus 2026',
    title: 'Penilaian 5R',
    detail: 'Penilaian dilakukan melalui sidak pada hari kerja.',
  },
  {
    id: 'puncak',
    when: '13 Agustus 2026',
    title: 'Hari puncak',
    detail: 'Sambutan, estafet balon, istirahat, dan estafet air.',
  },
  {
    id: 'hadiah',
    when: '28 Agustus 2026',
    title: 'Pengumuman pemenang',
    detail: 'Pemenang diumumkan dan hadiah dibagikan setelah kajian Jumat.',
  },
];

export const rundown = [
  {
    id: 'phase-kickoff',
    phase: 'Sosialisasi',
    items: [
      {
        time: 'Senin, 3 Agustus',
        title: 'Penjelasan aturan lomba',
        note: 'Peserta akan mendapat penjelasan mengenai alur lomba, ketentuan teknis, dan aturan penggunaan fasilitas.',
      },
    ],
  },
  {
    id: 'phase-dekor',
    phase: 'Dekorasi Ruangan',
    items: [
      {
        time: 'Selasa-Jumat, 4-7 Agustus',
        title: 'Pemasangan dekorasi',
        note: 'Dekorasi dipasang menggunakan foam tape. Paku dan cat dinding tidak diperbolehkan. Dekorasi harus dipasang di tempat yang tidak menghalangi pandangan CCTV.',
      },
    ],
  },
  {
    id: 'phase-nilai',
    phase: 'Penilaian 5R',
    items: [
      {
        time: '10-27 Agustus · hari kerja',
        title: 'Sidak dan penilaian 5R',
        note: 'Juri menilai penerapan Ringkas, Rapi, Resik, Rawat, dan Rajin di setiap ruangan.',
      },
    ],
  },
  {
    id: 'phase-peak',
    phase: 'Hari Puncak · 13 Agustus',
    highlight: true,
    items: [
      {
        time: '12.45-13.05',
        title: 'Sambutan dan doa',
        note: 'Acara dibuka dengan sambutan CEO dan Ketua Panitia, lalu dilanjutkan dengan doa.',
      },
      {
        time: '13.05-15.00',
        title: 'Estafet Balon Tanpa Tangan',
        note: 'Babak penyisihan dan final berlangsung terpisah untuk kategori Putra dan Putri.',
      },
      {
        time: '15.00-15.30',
        title: 'Istirahat dan salat',
        note: 'Waktu istirahat dan salat Asar sekaligus persiapan area untuk lomba berikutnya.',
      },
      {
        time: '15.30-17.00',
        title: 'Estafet Air Gelas Bocor',
        note: 'Setiap sesi berlangsung selama 3 menit. Pemenang ditentukan dari volume air terbanyak.',
      },
    ],
  },
  {
    id: 'phase-award',
    phase: 'Pengumuman',
    items: [
      {
        time: 'Jumat, 28 Agustus',
        title: 'Pengumuman dan pembagian hadiah',
        note: 'Pemenang setiap lomba dan kategori diumumkan setelah kajian Jumat.',
      },
    ],
  },
];

export const competitions = [
  {
    id: 'dekor-5r',
    number: '01',
    short: 'Dekorasi & 5R',
    title: 'Dekorasi Ruangan & Budaya 5R',
    category: 'Umum · per ruangan',
    tone: 'red',
    imageKey: 'dekor-5r',
    summary:
      'Percantik area kerja sekaligus tunjukkan penerapan 5R. Gunakan foam tape, hindari paku atau cat, dan pastikan posisi dekorasi tidak menghalangi pandangan CCTV.',
    rooms: roomAreas,
    workflow: [
      {
        step: 1,
        title: 'Sosialisasi Lomba',
        time: 'Senin, 3 Agustus',
        desc: 'Penjelasan aturan lomba, larangan paku/cat, penggunaan foam tape, dan posisi dekorasi aman dari pandangan CCTV.',
        icon: 'fa-bullhorn',
      },
      {
        step: 2,
        title: 'Pemasangan Dekorasi',
        time: '4-7 Agustus',
        desc: 'Proses menghias area kerja masing-masing menggunakan bahan yang aman dan tidak menutupi kamera CCTV.',
        icon: 'fa-paint-roller',
      },
      {
        step: 3,
        title: 'Penilaian 5R & Sidak',
        time: '10-27 Agustus',
        desc: 'Penilaian berkala budaya 5R (Ringkas, Rapi, Resik, Rawat, Rajin).',
        icon: 'fa-clipboard-check',
      },
      {
        step: 4,
        title: 'Pengumuman Pemenang',
        time: '28 Agustus',
        desc: 'Pemenang dekorasi terbaik & 5R diumumkan setelah kajian Jumat.',
        icon: 'fa-trophy',
      },
    ],
    forPeserta: {
      headline: 'Ketentuan & Tips Peserta',
      points: [
        {
          title: 'Penggunaan Perekat Aman',
          text: 'Wajib menggunakan foam tape. Dilarang keras memakai paku, cat dinding, atau selotip perusak fasilitas.',
        },
        {
          title: 'Posisi Dekorasi Aman (Bebas CCTV)',
          text: 'Dekorasi wajib dipasang di tempat yang tidak menghalangi atau menutupi pandangan kamera CCTV.',
        },
        {
          title: 'Ornamen Tambahan Mandiri',
          text: 'Peserta bebas menambah pernak-pernik dekorasi mandiri selama aman dan tidak mengganggu area lain.',
        },
        {
          title: 'Evaluasi 5R Tanpa Jadwal',
          text: 'Juri menilai kerapian dan kebersihan harian ruangan melalui sidak berkala di hari kerja.',
        },
      ],
      tips: [
        'Pastikan seluruh ornamen hiasan tidak menutupi sudut pandang CCTV ruangan.',
        'Pisahkan barang yang masih digunakan dan yang tidak diperlukan (Ringkas).',
        'Rapikan kabel-kabel kerja menggunakan cable tie (Rapi).',
        'Pastikan sisa bahan dekorasi langsung dibersihkan setelah dipakai (Resik).',
      ],
    },
    forPanitia: {
      headline: 'Panduan & Tugas Panitia',
      points: [
        {
          title: 'Sosialisasi · 3 Agustus',
          text: 'Jelaskan aturan teknis, larangan menggunakan paku, cat, serta penempatan dekorasi di posisi yang tidak menghalangi CCTV.',
        },
        {
          title: 'Pendampingan · 4-7 Agustus',
          text: 'Dampingi proses dekorasi dan pastikan pemasangan tidak menutupi pandangan kamera CCTV serta menggunakan bahan yang aman.',
        },
        {
          title: 'Penilaian · 10-27 Agustus',
          text: 'Lakukan penilaian 5R pada hari kerja dan catat setiap pelanggaran sebagai dasar pengurangan poin atau diskualifikasi.',
        },
      ],
      checklist: [
        'Periksa seluruh ruangan peserta.',
        'Pastikan dekorasi tidak menghalangi sudut pandang kamera CCTV.',
        'Dokumentasikan setiap temuan saat sidak.',
        'Catat pelanggaran fasilitas secara tertulis.',
      ],
    },
  },
  {
    id: 'balon',
    number: '02',
    short: 'Estafet Balon',
    title: 'Estafet Balon Tanpa Tangan',
    category: 'Putra & Putri · juara terpisah',
    tone: 'amber',
    imageKey: 'balon',
    summary:
      'Bawa balon secara berpasangan dari garis start hingga finish tanpa menggunakan tangan. Tim tercepat menjadi pemenang.',
    workflow: [
      {
        step: 1,
        title: 'Persiapan Garis Start',
        time: 'Mulai Lomba',
        desc: 'Pasangan pertama berdiri di garis start dan mengapit balon di bagian dada/perut.',
        icon: 'fa-flag-checkered',
      },
      {
        step: 2,
        title: 'Estafet Tanpa Tangan',
        time: 'Lintasan Lomba',
        desc: 'Berjalan menuju titik estafet dan memindahkan balon ke pasangan berikutnya tanpa tangan.',
        icon: 'fa-people-arrows',
      },
      {
        step: 3,
        title: 'Finish & Catat Waktu',
        time: 'Garis Finish',
        desc: 'Pasangan terakhir menyeberangi garis finish dan waktu total tim dicatat.',
        icon: 'fa-stopwatch',
      },
      {
        step: 4,
        title: 'Babak Final Top 3',
        time: 'Penentuan Juara',
        desc: 'Tiga tim dengan catatan waktu tercepat melaju ke babak final memperebutkan juara 1-3.',
        icon: 'fa-medal',
      },
    ],
    forPeserta: {
      headline: 'Ketentuan & Tips Peserta',
      points: [
        {
          title: 'Aturan Tanpa Tangan',
          text: 'Tangan tidak boleh menyentuh balon selama bergerak maupun saat transfer antar pasangan.',
        },
        {
          title: 'Batas Toleransi Jatuh',
          text: 'Maksimal 3 kali balon jatuh/pecah (harus diulang dari titik jatuh). Jatuh ke-4 berarti gugur.',
        },
        {
          title: 'Kategori Terpisah',
          text: 'Jalur pertandingan dan penentuan juara untuk Putra & Putri dipisah penuh.',
        },
      ],
      tips: [
        'Latih ritme dan langkah berpasangan sebelum pertandingan dimulai.',
        'Jaga posisi dada/perut tetap menekan balon agar tidak mudah meluncur jatuh.',
      ],
    },
    forPanitia: {
      headline: 'Panduan & Tugas Panitia',
      points: [
        {
          title: 'Peralatan',
          text: 'Siapkan balon, peluit, dan stopwatch resmi untuk mencatat waktu.',
        },
        {
          title: 'Format Putra',
          text: 'Penyisihan terdiri dari 3 sesi dengan pembagian 3, 3, dan 2 kelompok. Tiga waktu tercepat maju ke final.',
        },
        {
          title: 'Format Putri',
          text: 'Penyisihan terdiri dari 2 sesi dengan pembagian 3 dan 2 kelompok. Tiga waktu tercepat maju ke final.',
        },
      ],
      tools: ['Balon', 'Peluit', 'Stopwatch'],
      putra: [
        'Penyisihan: 3 sesi dengan pembagian 3, 3, dan 2 kelompok.',
        'Final: 3 kelompok dengan waktu tercepat dari seluruh sesi penyisihan.',
      ],
      putri: [
        'Penyisihan: 2 sesi dengan pembagian 3 dan 2 kelompok.',
        'Final: 3 kelompok dengan waktu tercepat dari seluruh sesi penyisihan.',
      ],
    },
  },
  {
    id: 'air',
    number: '03',
    short: 'Estafet Air',
    title: 'Estafet Air Gelas Bocor',
    category: 'Putra & Putri · juara terpisah',
    tone: 'blue',
    imageKey: 'air',
    summary:
      'Oper gelas bocor melewati atas kepala hingga air terkumpul di galon penampung. Tim dengan volume air terbanyak dalam 3 menit menjadi pemenang.',
    workflow: [
      {
        step: 1,
        title: 'Pengambilan Air',
        time: 'Ember Utama',
        desc: 'Peserta pertama mencedok air dari ember menggunakan gelas bocor.',
        icon: 'fa-bucket',
      },
      {
        step: 2,
        title: 'Estafet Atas Kepala',
        time: 'Barisan Tim',
        desc: 'Gelas dioper ke belakang melewati atas kepala tanpa menengok penuh.',
        icon: 'fa-hands-holding',
      },
      {
        step: 3,
        title: 'Penuangan ke Galon',
        time: 'Timer 3 Menit',
        desc: 'Peserta paling belakang menuangkan air ke galon penampung hingga waktu habis.',
        icon: 'fa-hourglass-half',
      },
      {
        step: 4,
        title: 'Pengukuran Volume Final',
        time: 'Penentuan Juara',
        desc: 'Juri mengukur akumulasi volume air di galon untuk menentukan pemenang.',
        icon: 'fa-flask',
      },
    ],
    forPeserta: {
      headline: 'Ketentuan & Tips Peserta',
      points: [
        {
          title: 'Larangan Menyumbat Lubang',
          text: 'Dilarang menyumbat lubang gelas bocor dengan jari, tangan, atau anggota tubuh lainnya.',
        },
        {
          title: 'Durasi Waktu Tepat 3 Menit',
          text: 'Setiap sesi berjalan selama 3 menit murni. Hasil akhir ditentukan dari volume air di galon.',
        },
        {
          title: 'Toleransi Gelas Jatuh',
          text: 'Toleransi gelas jatuh maksimal 3 kali. Jika jatuh, air diisi ulang dari peserta pertama.',
        },
      ],
      tips: [
        'Fokus pada kestabilan operan di atas kepala daripada terburu-buru.',
        'Area permainan licin & basah, utamakan keselamatan dan gunakan pakaian siap basah.',
      ],
    },
    forPanitia: {
      headline: 'Panduan & Tugas Panitia',
      points: [
        {
          title: 'Peralatan',
          text: 'Siapkan ember berisi air, gelas bocor, galon penampung kosong, dan timer 3 menit.',
        },
        {
          title: 'Format Putra',
          text: 'Penyisihan terdiri dari 2 sesi dengan masing-masing 4 kelompok. Dua tim terbaik dari setiap sesi maju ke final.',
        },
        {
          title: 'Format Putri',
          text: 'Penyisihan terdiri dari 2 sesi dengan pembagian 3 dan 2 kelompok. Empat volume terbanyak secara keseluruhan maju ke final.',
        },
      ],
      tools: ['Ember berisi air', 'Gelas bocor', 'Galon penampung kosong', 'Timer 3 menit'],
      putra: [
        'Penyisihan: 2 sesi, masing-masing diikuti 4 kelompok.',
        'Final: 2 kelompok dengan volume air terbanyak dari setiap sesi, total 4 kelompok.',
      ],
      putri: [
        'Penyisihan: 2 sesi dengan pembagian 3 dan 2 kelompok.',
        'Final: 4 kelompok dengan volume air terbanyak dari seluruh sesi penyisihan.',
      ],
    },
  },
];

export const landingHighlights = [
  {
    id: 'teams',
    label: 'Tim peserta',
    value: '13',
    hint: '8 Putra · 5 Putri',
  },
  {
    id: 'games',
    label: 'Jenis lomba',
    value: '3',
    hint: 'Dekorasi & 5R · Balon · Air',
  },
  {
    id: 'peak',
    label: 'Hari puncak',
    value: '13 Ags',
    hint: 'Mulai pukul 12.45 WIB',
  },
  {
    id: 'award',
    label: 'Pengumuman',
    value: '28 Ags',
    hint: 'Setelah kajian Jumat',
  },
];
