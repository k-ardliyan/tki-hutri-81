/**
 * Konten website HUT RI ke-81
 * Disusun dari technical_rundown.md, technical_book_peserta.md,
 * dan technical_book_panitia.md.
 *
 * Tipografi: Saira Semi Condensed
 * Tema: "Indonesia Berdaulat, Adil, dan Makmur"
 */

export const eventMeta = {
  title: "HUT RI ke-81",
  org: "PT TKI x PT FTP",
  year: 2026,
  theme: "Indonesia Berdaulat, Adil, dan Makmur",
  peakDateLabel: "Kamis, 13 Agustus 2026",
  peakTimeLabel: "12.45 WIB",
  peakTarget: "2026-08-13T12:45:00", // Mulai acara puncak
  eventEndTarget: "2026-08-13T17:00:00", // Perkiraan acara puncak selesai
  awardTarget: "2026-08-28T13:00:00", // Pengumuman pemenang setelah kajian Jumat
  awardEndTarget: "2026-08-28T17:00:00", // Akhir seluruh rangkaian acara
  awardDateLabel: "Jumat, 28 Agustus 2026",
  awardNote: "Setelah kajian Jumat",
  tagline:
    "Rayakan kemerdekaan lewat lomba, kreativitas, dan kebersamaan dalam semangat HUT RI ke-81.",
};

/** Ruangan peserta lomba dekorasi dan 5R */
export const roomAreas = [
  { id: "implementator", name: "Implementator", icon: "fa-gears" },
  {
    id: "hardware-finance",
    name: "Hardware & Finance",
    icon: "fa-microchip",
  },
  { id: "sales", name: "Sales", icon: "fa-handshake" },
  { id: "it-dalam", name: "IT Dalam", icon: "fa-server" },
  { id: "it-luar", name: "IT Luar", icon: "fa-network-wired" },
];

export const keyDates = [
  {
    id: "sosialisasi",
    when: "Senin, 3 Agustus 2026",
    title: "Sosialisasi lomba",
    detail: "Kenali aturan, jadwal, dan alur setiap lomba.",
  },
  {
    id: "dekor",
    when: "4–7 Agustus 2026",
    title: "Dekorasi ruangan",
    detail: "Hias ruangan di area masing-masing, dari Selasa hingga Jumat.",
  },
  {
    id: "nilai",
    when: "10–27 Agustus 2026",
    title: "Penilaian 5R",
    detail: "Penilaian dilakukan melalui sidak pada hari kerja.",
  },
  {
    id: "puncak",
    when: "13 Agustus 2026",
    title: "Hari puncak",
    detail: "Sambutan, estafet balon, istirahat, dan estafet air.",
  },
  {
    id: "hadiah",
    when: "28 Agustus 2026",
    title: "Pengumuman pemenang",
    detail: "Pemenang diumumkan dan hadiah dibagikan setelah kajian Jumat.",
  },
];

export const rundown = [
  {
    id: "phase-kickoff",
    phase: "Sosialisasi",
    items: [
      {
        time: "Senin, 3 Agustus",
        title: "Penjelasan aturan lomba",
        note: "Peserta akan mendapat penjelasan mengenai alur lomba, ketentuan teknis, dan aturan penggunaan fasilitas.",
      },
    ],
  },
  {
    id: "phase-dekor",
    phase: "Dekorasi Ruangan",
    items: [
      {
        time: "Selasa–Jumat, 4–7 Agustus",
        title: "Pemasangan dekorasi",
        note: "Dekorasi dipasang menggunakan foam tape. Paku dan cat dinding tidak diperbolehkan.",
      },
    ],
  },
  {
    id: "phase-nilai",
    phase: "Penilaian 5R",
    items: [
      {
        time: "10–27 Agustus · hari kerja",
        title: "Sidak dan penilaian 5R",
        note: "Juri menilai penerapan Ringkas, Rapi, Resik, Rawat, dan Rajin di setiap ruangan.",
      },
    ],
  },
  {
    id: "phase-peak",
    phase: "Hari Puncak · 13 Agustus",
    highlight: true,
    items: [
      {
        time: "12.45–13.05",
        title: "Sambutan dan doa",
        note: "Acara dibuka dengan sambutan CEO dan Ketua Panitia, lalu dilanjutkan dengan doa.",
      },
      {
        time: "13.05–15.00",
        title: "Estafet Balon Tanpa Tangan",
        note: "Babak penyisihan dan final berlangsung terpisah untuk kategori Putra dan Putri.",
      },
      {
        time: "15.00–15.30",
        title: "Istirahat dan salat",
        note: "Waktu istirahat dan salat Asar sekaligus persiapan area untuk lomba berikutnya.",
      },
      {
        time: "15.30–17.00",
        title: "Estafet Air Gelas Bocor",
        note: "Setiap sesi berlangsung selama 3 menit. Pemenang ditentukan dari volume air terbanyak.",
      },
    ],
  },
  {
    id: "phase-award",
    phase: "Pengumuman",
    items: [
      {
        time: "Jumat, 28 Agustus",
        title: "Pengumuman dan pembagian hadiah",
        note: "Pemenang setiap lomba dan kategori diumumkan setelah kajian Jumat.",
      },
    ],
  },
];

export const competitions = [
  {
    id: "dekor-5r",
    number: "01",
    short: "Dekorasi & 5R",
    title: "Dekorasi Ruangan & Budaya 5R",
    category: "Umum · per ruangan",
    tone: "red",
    imageKey: "dekor-5r",
    summary:
      "Percantik area kerja sekaligus tunjukkan penerapan 5R. Gunakan foam tape dan hindari paku atau cat yang dapat merusak fasilitas.",
    rooms: roomAreas,
    workflow: [
      {
        step: 1,
        title: "Pahami aturannya",
        time: "Senin, 3 Agustus",
        desc: "Ikuti sosialisasi untuk memahami aturan dekorasi, penggunaan foam tape, dan perlindungan fasilitas.",
        icon: "fa-bullhorn",
      },
      {
        step: 2,
        title: "Mulai menghias",
        time: "4–7 Agustus",
        desc: "Dekorasi dilakukan di area masing-masing.",
        icon: "fa-paint-roller",
      },
      {
        step: 3,
        title: "Terapkan 5R",
        time: "10–27 Agustus",
        desc: "Jaga ruangan tetap Ringkas, Rapi, Resik, Rawat, dan Rajin setiap hari.",
        icon: "fa-clipboard-check",
      },
      {
        step: 4,
        title: "Tunggu hasilnya",
        time: "28 Agustus",
        desc: "Pemenang diumumkan setelah kajian Jumat.",
        icon: "fa-trophy",
      },
    ],
    forPeserta: {
      headline: "Panduan peserta",
      points: [
        {
          title: "Ikuti sosialisasi",
          text: "Hadiri sosialisasi pada Senin, 3 Agustus untuk memahami seluruh aturan lomba.",
        },
        {
          title: "Pemasangan dekorasi",
          text: "Pemasangan dekorasi dilakukan pada 4–7 Agustus menggunakan foam tape, tanpa paku atau cat dinding.",
        },
        {
          title: "Boleh menambah ornamen",
          text: "Tambahan dekorasi dengan biaya mandiri diperbolehkan selama aman dan tidak merusak fasilitas.",
        },
        {
          title: "Jaga ruangan setiap hari",
          text: "Penilaian 5R berlangsung melalui sidak pada 10–27 Agustus, jadi pastikan ruangan selalu tertata.",
        },
      ],
      tips: [
        "Pisahkan barang yang masih digunakan dan yang tidak diperlukan.",
        "Rapikan kabel menggunakan cable tie.",
        "Bersihkan sisa bahan dekorasi setelah digunakan.",
      ],
    },
    forPanitia: {
      headline: "Panduan panitia",
      points: [
        {
          title: "Sosialisasi · 3 Agustus",
          text: "Jelaskan aturan teknis, termasuk larangan menggunakan paku, cat, atau bahan yang merusak fasilitas.",
        },
        {
          title: "Pendampingan · 4–7 Agustus",
          text: "Dampingi proses dekorasi dan pastikan pemasangan menggunakan bahan yang aman.",
        },
        {
          title: "Penilaian · 10–27 Agustus",
          text: "Lakukan penilaian 5R pada hari kerja dan catat setiap pelanggaran sebagai dasar pengurangan poin atau diskualifikasi.",
        },
      ],
      checklist: [
        "Periksa seluruh ruangan peserta.",
        "Dokumentasikan setiap temuan saat sidak.",
        "Catat pelanggaran fasilitas secara tertulis.",
      ],
    },
  },
  {
    id: "balon",
    number: "02",
    short: "Estafet Balon",
    title: "Estafet Balon Tanpa Tangan",
    category: "Putra & Putri · juara terpisah",
    tone: "amber",
    imageKey: "balon",
    summary:
      "Bawa balon secara berpasangan dari garis start hingga finish tanpa menggunakan tangan. Tim tercepat menjadi pemenang.",
    workflow: [
      {
        step: 1,
        title: "Bersiap di garis start",
        time: "Mulai lomba",
        desc: "Pasangan pertama berdiri di garis start dan bersiap mengapit balon.",
        icon: "fa-flag-checkered",
      },
      {
        step: 2,
        title: "Apit balon",
        time: "Tanpa tangan",
        desc: "Jepit balon menggunakan bagian perut atau dada. Balon tidak boleh dipegang dengan tangan.",
        icon: "fa-people-arrows",
      },
      {
        step: 3,
        title: "Oper ke pasangan berikutnya",
        time: "Lanjutkan estafet",
        desc: "Pindahkan balon ke pasangan berikutnya tanpa menyentuhnya dengan tangan.",
        icon: "fa-right-left",
      },
      {
        step: 4,
        title: "Capai garis finish",
        time: "Waktu dicatat",
        desc: "Setiap tim mendapat toleransi maksimal 3 kali jika balon jatuh atau pecah. Lebih dari itu, tim gugur.",
        icon: "fa-stopwatch",
      },
      {
        step: 5,
        title: "Masuk babak final",
        time: "3 tim tercepat",
        desc: "Tiga tim tercepat dari kategori Putra dan Putri maju ke final untuk memperebutkan juara 1–3.",
        icon: "fa-medal",
      },
    ],
    forPeserta: {
      headline: "Panduan peserta",
      points: [
        {
          title: "Tanpa sentuhan tangan",
          text: "Balon hanya boleh diapit menggunakan tubuh dan tidak boleh dipegang dengan tangan.",
        },
        {
          title: "Maksimal 3 kali gagal",
          text: "Balon boleh jatuh atau pecah maksimal 3 kali. Kegagalan berikutnya membuat tim gugur.",
        },
        {
          title: "Kejar waktu terbaik",
          text: "Tiga tim tercepat dari setiap kategori akan melaju ke babak final.",
        },
      ],
      tips: [
        "Latih langkah dan kecepatan bersama pasangan.",
        "Jaga posisi tubuh agar balon tidak mudah jatuh.",
      ],
    },
    forPanitia: {
      headline: "Panduan panitia",
      points: [
        {
          title: "Peralatan",
          text: "Siapkan balon, peluit, dan stopwatch resmi untuk mencatat waktu.",
        },
        {
          title: "Format Putra",
          text: "Penyisihan terdiri dari 3 sesi dengan pembagian 3, 3, dan 2 kelompok. Tiga waktu tercepat maju ke final.",
        },
        {
          title: "Format Putri",
          text: "Penyisihan terdiri dari 2 sesi dengan pembagian 3 dan 2 kelompok. Tiga waktu tercepat maju ke final.",
        },
      ],
      tools: ["Balon", "Peluit", "Stopwatch"],
      putra: [
        "Penyisihan: 3 sesi dengan pembagian 3, 3, dan 2 kelompok.",
        "Final: 3 kelompok dengan waktu tercepat dari seluruh sesi penyisihan.",
      ],
      putri: [
        "Penyisihan: 2 sesi dengan pembagian 3 dan 2 kelompok.",
        "Final: 3 kelompok dengan waktu tercepat dari seluruh sesi penyisihan.",
      ],
    },
  },
  {
    id: "air",
    number: "03",
    short: "Estafet Air",
    title: "Estafet Air Gelas Bocor",
    category: "Putra & Putri · juara terpisah",
    tone: "blue",
    imageKey: "air",
    summary:
      "Oper gelas bocor melewati atas kepala hingga air terkumpul di galon penampung. Tim dengan volume air terbanyak dalam 3 menit menjadi pemenang.",
    workflow: [
      {
        step: 1,
        title: "Ambil air",
        time: "Dari ember utama",
        desc: "Peserta pertama mengambil air dari ember menggunakan gelas bocor.",
        icon: "fa-bucket",
      },
      {
        step: 2,
        title: "Oper lewat atas kepala",
        time: "Mulai estafet",
        desc: "Gelas dioper ke peserta berikutnya melalui atas kepala hingga mencapai peserta terakhir.",
        icon: "fa-hands-holding",
      },
      {
        step: 3,
        title: "Biarkan gelas tetap bocor",
        time: "Jangan ditutup",
        desc: "Lubang pada gelas tidak boleh ditutup atau disumbat dengan jari.",
        icon: "fa-ban",
      },
      {
        step: 4,
        title: "Tuang ke galon",
        time: "Durasi 3 menit",
        desc: "Peserta terakhir menuangkan air ke galon penampung hingga waktu sesi berakhir.",
        icon: "fa-hourglass-half",
      },
      {
        step: 5,
        title: "Hitung volume air",
        time: "Penentuan final",
        desc: "Tim dengan volume air terbanyak melaju ke final dan kembali bertanding untuk memperebutkan juara 1–3.",
        icon: "fa-flask",
      },
    ],
    forPeserta: {
      headline: "Panduan peserta",
      points: [
        {
          title: "Durasi 3 menit",
          text: "Setiap sesi berlangsung selama 3 menit. Jaga ritme agar air dapat dioper dengan stabil.",
        },
        {
          title: "Jangan tutup lubang",
          text: "Lubang pada gelas harus tetap terbuka dan tidak boleh disumbat dengan jari.",
        },
        {
          title: "Maksimal 3 kali jatuh",
          text: "Gelas boleh jatuh maksimal 3 kali. Pemenang ditentukan dari volume air terbanyak di galon.",
        },
      ],
      tips: [
        "Bangun ritme oper yang konsisten.",
        "Berhati-hati karena area permainan akan basah dan licin.",
      ],
    },
    forPanitia: {
      headline: "Panduan panitia",
      points: [
        {
          title: "Peralatan",
          text: "Siapkan ember berisi air, gelas bocor, galon penampung kosong, dan timer 3 menit.",
        },
        {
          title: "Format Putra",
          text: "Penyisihan terdiri dari 2 sesi dengan masing-masing 4 kelompok. Dua tim terbaik dari setiap sesi maju ke final.",
        },
        {
          title: "Format Putri",
          text: "Penyisihan terdiri dari 2 sesi dengan pembagian 3 dan 2 kelompok. Empat volume terbanyak secara keseluruhan maju ke final.",
        },
      ],
      tools: [
        "Ember berisi air",
        "Gelas bocor",
        "Galon penampung kosong",
        "Timer 3 menit",
      ],
      putra: [
        "Penyisihan: 2 sesi, masing-masing diikuti 4 kelompok.",
        "Final: 2 kelompok dengan volume air terbanyak dari setiap sesi, total 4 kelompok.",
      ],
      putri: [
        "Penyisihan: 2 sesi dengan pembagian 3 dan 2 kelompok.",
        "Final: 4 kelompok dengan volume air terbanyak dari seluruh sesi penyisihan.",
      ],
    },
  },
];

export const landingHighlights = [
  {
    id: "teams",
    label: "Tim peserta",
    value: "13",
    hint: "8 Putra · 5 Putri",
  },
  {
    id: "games",
    label: "Jenis lomba",
    value: "3",
    hint: "Dekorasi & 5R · Balon · Air",
  },
  {
    id: "peak",
    label: "Hari puncak",
    value: "13 Ags",
    hint: "Mulai pukul 12.45 WIB",
  },
  {
    id: "award",
    label: "Pengumuman",
    value: "28 Ags",
    hint: "Setelah kajian Jumat",
  },
];
