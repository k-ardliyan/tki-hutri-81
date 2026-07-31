/**
 * Konten terstruktur dari:
 * - technical_rundown.md
 * - technical_book_peserta.md
 * - technical_book_panitia.md
 *
 * Tipografi resmi HUT RI ke-81: Saira Semi Condensed
 * Tema resmi: "Indonesia Berdaulat, Adil, dan Makmur"
 */

export const eventMeta = {
  title: 'HUT RI ke-81',
  org: 'PT Teknologi Kartu Indonesia',
  year: 2026,
  theme: 'Indonesia Berdaulat, Adil, dan Makmur',
  peakDateLabel: 'Kamis, 13 Agustus 2026',
  peakTimeLabel: '12.45 WIB',
  peakTarget: '2026-08-13T12:45:00',
  awardDateLabel: 'Jumat, 28 Agustus 2026',
  awardNote: 'Setelah kajian Jumat',
  tagline:
    'Rayakan kemerdekaan dengan kerja sama, sportivitas, dan budaya 5R di tempat kerja.',
}

/** Area lomba hias ruangan & 5R (per ruangan) */
export const roomAreas = [
  { id: 'implementator', name: 'Implementator', icon: 'fa-gears' },
  { id: 'hardware-finance', name: 'Hardware & Finance', icon: 'fa-microchip' },
  { id: 'sales', name: 'Sales', icon: 'fa-handshake' },
  { id: 'it-dalam', name: 'IT Dalam', icon: 'fa-server' },
  { id: 'it-luar', name: 'IT Luar', icon: 'fa-network-wired' },
  { id: 'empathy', name: 'Empathy Room', icon: 'fa-heart' },
]

export const keyDates = [
  {
    id: 'sosialisasi',
    when: 'Senin, 3 Agustus 2026',
    title: 'Sosialisasi aturan',
    detail: 'Penjelasan teknis lomba di jam kerja.',
  },
  {
    id: 'dekor',
    when: '4–7 Agustus 2026',
    title: 'Lomba dekorasi ruangan',
    detail: 'Pemasangan hiasan di jam kerja (Senin–Jumat).',
  },
  {
    id: 'nilai',
    when: '10–27 Agustus 2026',
    title: 'Penilaian lomba 5R',
    detail: 'Sidak & penilaian 5R di hari kerja.',
  },
  {
    id: 'puncak',
    when: '13 Agustus 2026',
    title: 'Hari puncak acara',
    detail: 'Sambutan, estafet balon, istirahat, lalu estafet air.',
  },
  {
    id: 'hadiah',
    when: '28 Agustus 2026',
    title: 'Pengumuman & hadiah',
    detail: 'Pembagian juara setelah kajian Jumat.',
  },
]

export const rundown = [
  {
    id: 'phase-kickoff',
    phase: 'Sosialisasi',
    items: [
      {
        time: 'Senin, 3 Agustus (jam kerja)',
        title: 'Sosialisasi aturan lomba',
        note: 'Penjelasan teknis, larangan fasilitas, dan alur lomba kepada peserta.',
      },
    ],
  },
  {
    id: 'phase-dekor',
    phase: 'Lomba: Dekorasi ruangan',
    items: [
      {
        time: 'Selasa–Jumat, 4–7 Agustus',
        title: 'Pemasangan dekorasi kemerdekaan',
        note: 'Hanya di jam kerja. Foam tape wajib; tanpa paku dan tanpa cat dinding.',
      },
    ],
  },
  {
    id: 'phase-nilai',
    phase: 'Lomba: Penilaian 5R',
    items: [
      {
        time: '10–27 Agustus (hari kerja)',
        title: 'Sidak & penilaian budaya 5R',
        note: 'Juri menilai Ringkas, Rapi, Resik, Rawat, Rajin di area ruangan masing-masing.',
      },
    ],
  },
  {
    id: 'phase-peak',
    phase: 'Hari puncak — 13 Agustus',
    highlight: true,
    items: [
      {
        time: '12.45–13.05',
        title: 'Sambutan & doa',
        note: 'Sambutan CEO dan Ketua Panitia, dilanjutkan doa pembuka.',
      },
      {
        time: '13.05–15.00',
        title: 'Sesi 1 — Estafet balon tanpa tangan',
        note: 'Penyisihan dan final per kategori Putra & Putri.',
      },
      {
        time: '15.00–15.30',
        title: 'Istirahat & sholat',
        note: 'Break singkat, sholat Ashar, area disiapkan untuk sesi basah.',
      },
      {
        time: '15.30–17.00',
        title: 'Sesi 2 — Estafet air gelas bocor',
        note: 'Durasi main 3 menit per sesi. Juara ditentukan volume air terbanyak.',
      },
    ],
  },
  {
    id: 'phase-award',
    phase: 'Pengumuman',
    items: [
      {
        time: 'Jumat, 28 Agustus',
        title: 'Pengumuman & pembagian hadiah',
        note: 'Setelah kajian Jumat — juara per lomba dan kategori diumumkan resmi.',
      },
    ],
  },
]

export const competitions = [
  {
    id: 'dekor-5r',
    number: '01',
    short: 'Dekor & 5R',
    title: 'Hias Ruangan & Budaya 5R',
    category: 'Umum · per ruangan',
    tone: 'red',
    imageKey: 'dekor-5r',
    summary:
      'Setiap area kerja mendekorasi ruangan bertema kemerdekaan sambil menjaga standar 5R — tanpa merusak fasilitas.',
    rooms: roomAreas,
    workflow: [
      {
        step: 1,
        title: 'Sosialisasi',
        time: 'Senin, 3 Agustus',
        desc: 'Pahami larangan paku/cat dan standar foam tape di jam kerja.',
        icon: 'fa-bullhorn',
      },
      {
        step: 2,
        title: 'Pasang dekorasi',
        time: '4–7 Agustus',
        desc: 'Hias area kerja di jam kerja: Implementator, Hardware & Finance, Sales, IT Dalam, IT Luar, Empathy Room.',
        icon: 'fa-paint-roller',
      },
      {
        step: 3,
        title: 'Penilaian 5R',
        time: '10–27 Agustus',
        desc: 'Ringkas · Rapi · Resik · Rawat · Rajin dinilai di hari kerja.',
        icon: 'fa-clipboard-check',
      },
      {
        step: 4,
        title: 'Pengumuman',
        time: '28 Agustus',
        desc: 'Juara diumumkan setelah kajian Jumat.',
        icon: 'fa-trophy',
      },
    ],
    forPeserta: {
      headline: 'Yang perlu kamu lakukan',
      points: [
        { title: 'Sosialisasi dulu', text: 'Hadir Senin, 3 Agustus untuk penjelasan aturan di jam kerja.' },
        { title: 'Dekor 4–7 Agustus', text: 'Pasang hiasan hanya di jam kerja. Foam tape wajib; dilarang paku/cat.' },
        { title: 'Ornamen ekstra', text: 'Boleh menambah hiasan (biaya mandiri) selama tidak merusak fasilitas.' },
        { title: 'Jaga 5R', text: 'Penilaian sidak 10–27 Agustus di hari kerja — jaga kerapian harian.' },
      ],
      tips: [
        'Pisahkan barang terpakai vs tidak (Ringkas)',
        'Ikat kabel dengan cable tie (Rapi)',
        'Bersihkan sisa potongan hiasan (Resik)',
      ],
    },
    forPanitia: {
      headline: 'Yang perlu panitia siapkan',
      points: [
        { title: '3 Agustus', text: 'Sosialisasi aturan teknis di jam kerja (larangan paku, cat, dsb.).' },
        { title: '4–7 Agustus', text: 'Dampingi pemasangan dekorasi; cek foam tape & keamanan fasilitas.' },
        { title: '10–27 Agustus', text: 'Nilai 5R di hari kerja. Pelanggaran fasilitas = potongan poin / diskualifikasi.' },
      ],
      checklist: [
        'Cek setiap ruangan: Implementator, Hardware & Finance, Sales, IT Dalam, IT Luar, Empathy Room',
        'Dokumentasikan temuan sidak',
        'Catat pelanggaran fasilitas secara tertulis',
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
      'Membawa balon berpasangan dari start ke finish tanpa memegang dengan tangan. Juara = waktu tercepat.',
    workflow: [
      {
        step: 1,
        title: 'Siap di garis start',
        time: 'Sesi 1',
        desc: 'Pasangan berdiri di start, balon siap diapit.',
        icon: 'fa-flag-checkered',
      },
      {
        step: 2,
        title: 'Apit balon',
        time: 'Tanpa tangan',
        desc: 'Balon dijepit di perut/dada — tidak boleh dipegang tangan.',
        icon: 'fa-people-arrows',
      },
      {
        step: 3,
        title: 'Estafet ke rekan',
        time: 'Oper aman',
        desc: 'Oper balon ke pasangan berikutnya tanpa sentuhan tangan.',
        icon: 'fa-right-left',
      },
      {
        step: 4,
        title: 'Finish + stopwatch',
        time: 'Catat waktu',
        desc: 'Toleransi gagal maks. 3× (jatuh/pecah). >3 = gugur.',
        icon: 'fa-stopwatch',
      },
      {
        step: 5,
        title: 'Final top 3',
        time: 'Per kategori',
        desc: '3 waktu tercepat Putra & Putri masuk final, perebutkan juara 1–3.',
        icon: 'fa-medal',
      },
    ],
    forPeserta: {
      headline: 'Cara main (peserta)',
      points: [
        { title: 'Larangan tangan', text: 'Balon tidak boleh dipegang — hanya diapit tubuh.' },
        { title: 'Toleransi 3×', text: 'Maksimal 3 kali gagal (jatuh/pecah). Lebih dari itu diskualifikasi.' },
        { title: 'Penentuan juara', text: 'Waktu tercepat. Top 3 per kategori masuk final.' },
      ],
      tips: ['Latih langkah berpasangan', 'Siapkan balon cadangan dalam sisa toleransi'],
    },
    forPanitia: {
      headline: 'Cara kelola (panitia)',
      points: [
        { title: 'Alat wajib', text: 'Balon, peluit, dan stopwatch resmi.' },
        { title: 'Putra (8 tim)', text: 'Penyisihan 3 sesi: 3 + 3 + 2. Final: 3 waktu tercepat.' },
        { title: 'Putri (5 tim)', text: 'Penyisihan 2 sesi: 3 + 2. Final: 3 waktu tercepat.' },
      ],
      tools: ['Balon', 'Peluit', 'Stopwatch (wajib)'],
      putra: [
        'Penyisihan 3 sesi: 3 + 3 + 2 kelompok',
        'Final: 3 kelompok waktu tercepat dari seluruh penyisihan',
      ],
      putri: [
        'Penyisihan 2 sesi: 3 + 2 kelompok',
        'Final: 3 kelompok waktu tercepat dari seluruh penyisihan',
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
      'Memindahkan air dengan gelas bocor melewati atas kepala. Juara = volume air terbanyak di galon.',
    workflow: [
      {
        step: 1,
        title: 'Ember sumber',
        time: 'Isi air',
        desc: 'Ambil air dari ember utama dengan gelas bocor.',
        icon: 'fa-bucket',
      },
      {
        step: 2,
        title: 'Oper atas kepala',
        time: 'Estafet',
        desc: 'Oper gelas ke rekan berikutnya melewati atas kepala.',
        icon: 'fa-hands-holding',
      },
      {
        step: 3,
        title: 'Jangan sumbat lubang',
        time: 'Larangan',
        desc: 'Dilarang menutup lubang bocor dengan jari.',
        icon: 'fa-ban',
      },
      {
        step: 4,
        title: 'Tuang ke galon',
        time: '3 menit',
        desc: 'Ujung barisan menuang ke galon penampung. Timer 3 menit/sesi.',
        icon: 'fa-hourglass-half',
      },
      {
        step: 5,
        title: 'Ukur volume',
        time: 'Final',
        desc: 'Volume terbanyak lolos final, lalu perebutkan juara 1–3.',
        icon: 'fa-flask',
      },
    ],
    forPeserta: {
      headline: 'Cara main (peserta)',
      points: [
        { title: 'Durasi 3 menit', text: 'Setiap sesi tepat 3 menit — manfaatkan ritme, bukan hanya buru-buru.' },
        { title: 'Lubang tetap bocor', text: 'Dilarang menyumbat lubang gelas dengan jari.' },
        { title: 'Toleransi 3×', text: 'Maksimal 3 kali gelas jatuh. Juara = air terbanyak di galon.' },
      ],
      tips: ['Jaga ritme oper', 'Siapkan area basah & handuk kecil'],
    },
    forPanitia: {
      headline: 'Cara kelola (panitia)',
      points: [
        { title: 'Alat', text: 'Ember air, gelas/galon bocor, penampung kosong, timer 3 menit.' },
        { title: 'Putra (8 tim)', text: 'Penyisihan 2 sesi (4+4). Final: 2 terbaik/sesi (total 4).' },
        { title: 'Putri (5 tim)', text: 'Penyisihan 2 sesi (3+2). Final: 4 volume terbanyak keseluruhan.' },
      ],
      tools: [
        'Ember berisi air',
        'Gelas/galon bocor',
        'Galon penampung kosong',
        'Timer 3 menit',
      ],
      putra: [
        'Penyisihan 2 sesi: 4 + 4 kelompok',
        'Final: 2 kelompok air terbanyak per sesi (total 4) diadu lagi',
      ],
      putri: [
        'Penyisihan 2 sesi: 3 + 2 kelompok',
        'Final: 4 kelompok air terbanyak keseluruhan dari penyisihan Putri',
      ],
    },
  },
]

export const landingHighlights = [
  {
    id: 'teams',
    label: 'Tim berlaga',
    value: '13',
    hint: '8 putra · 5 putri',
  },
  {
    id: 'games',
    label: 'Cabang lomba',
    value: '3',
    hint: '5R · Balon · Air',
  },
  {
    id: 'peak',
    label: 'Hari puncak',
    value: '13 Ags',
    hint: 'Mulai 12.45 WIB',
  },
  {
    id: 'award',
    label: 'Pengumuman',
    value: '28 Ags',
    hint: 'Setelah kajian',
  },
]
