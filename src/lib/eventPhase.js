/**
 * Helper Deteksi Fase Acara & Reminder Dinamis HUT RI ke-81 TKI x FTP
 * Jadwal Acara:
 * 1. 3 Agustus 2026: Sosialisasi Lomba
 * 2. 4–7 Agustus 2026: Dekorasi Ruangan bertema Kemerdekaan
 * 3. 10–27 Agustus 2026: Penilaian 5R (Sidak Harian Hari Kerja)
 * 4. 13 Agustus 2026: Hari Puncak Lomba (12.45 - 17.00 WIB)
 * 5. 28 Agustus 2026: Pengumuman Pemenang (Setelah Kajian Jumat)
 */

export const PHASES = {
  PRE_EVENT: "PRE_EVENT",
  SOSIALISASI: "SOSIALISASI",
  DEKORASI: "DEKORASI",
  PENILAIAN_5R_AWAL: "PENILAIAN_5R_AWAL",
  HARI_PUNCAK_PRE: "HARI_PUNCAK_PRE",
  HARI_PUNCAK_LIVE: "HARI_PUNCAK_LIVE",
  PENILAIAN_5R_LANJUT: "PENILAIAN_5R_LANJUT",
  PENGUMUMAN_DAY: "PENGUMUMAN_DAY",
  FINISHED: "FINISHED",
};

export const SIMULATED_DATES = [
  { label: "Hari Ini (Real)", value: null },
  { label: "3 Ags (Sosialisasi)", value: "2026-08-03T10:00:00" },
  { label: "5 Ags (Dekorasi)", value: "2026-08-05T14:00:00" },
  { label: "11 Ags (Penilaian 5R)", value: "2026-08-11T09:00:00" },
  { label: "13 Ags (Hari Puncak)", value: "2026-08-13T13:00:00" },
  { label: "28 Ags (Pengumuman)", value: "2026-08-28T13:30:00" },
];

export function getEventPhase(customDate = null) {
  const now = customDate ? new Date(customDate).getTime() : Date.now();

  const tSosialisasiStart = new Date("2026-08-03T00:00:00").getTime();
  const tDekorasiStart = new Date("2026-08-04T00:00:00").getTime();
  const t5RStart = new Date("2026-08-08T00:00:00").getTime(); // Penilaian sidak mulai
  const tPuncakDayStart = new Date("2026-08-13T00:00:00").getTime();
  const tPuncakLiveStart = new Date("2026-08-13T12:45:00").getTime();
  const tPuncakEnd = new Date("2026-08-13T17:00:00").getTime();
  const tAwardStart = new Date("2026-08-28T00:00:00").getTime();
  const tAwardLiveStart = new Date("2026-08-28T13:00:00").getTime();
  const tAwardEnd = new Date("2026-08-28T17:00:00").getTime();

  if (now < tSosialisasiStart) {
    return {
      id: PHASES.PRE_EVENT,
      badgeLabel: "MENYONGSONG HUT RI KE-81",
      badgeColor: "bg-rose-500/20 text-rose-200 border-rose-400/30",
      statusType: "upcoming",
      title: "Persiapan Perayaan Kemerdekaan",
      subtitle: "Siapkan ruang dan semangat kelompokmu menyambut perlombaan!",
      targetDate: "2026-08-03T09:00:00",
      targetLabel: "Menuju Sosialisasi Lomba",
      themeColor: "red",
      reminders: [
        {
          icon: "fa-bullhorn",
          title: "Sosialisasi Lomba",
          text: "Senin, 3 Agustus 2026 jam 09.00 WIB.",
        },
        {
          icon: "fa-users",
          title: "Pembentukan Tim",
          text: "Pastikan anggota tim ruanganmu sudah siap.",
        },
        {
          icon: "fa-book-open",
          title: "Pelajari Panduan",
          text: "Baca aturan teknis lomba di menu Lomba.",
        },
      ],
      action: { label: "Lihat Jadwal Lengkap", link: "/rundown" },
    };
  }

  if (now >= tSosialisasiStart && now < tDekorasiStart) {
    return {
      id: PHASES.SOSIALISASI,
      badgeLabel: "HARI INI: SOSIALISASI LOMBA",
      badgeColor: "bg-blue-500/20 text-blue-200 border-blue-400/40",
      statusType: "active",
      title: "Sosialisasi & Penjelasan Aturan Lomba",
      subtitle: "Senin, 3 Agustus 2026 · Simak teknis lomba dan siapkan tim!",
      targetDate: "2026-08-04T00:00:00",
      targetLabel: "Mulai Masa Dekorasi (Besok)",
      themeColor: "blue",
      reminders: [
        {
          icon: "fa-clipboard-list",
          title: "Aturan Perlombaan",
          text: "Pahami syarat & teknis 3 cabang lomba tahun ini.",
        },
        {
          icon: "fa-paint-roller",
          title: "Persiapan Bahan Dekor",
          text: "Siapkan hiasan aman (foam tape) untuk dekorasi besok.",
        },
        {
          icon: "fa-user-check",
          title: "Cek Kelompok",
          text: "Pastikan nama kamu terdaftar di daftar tim.",
        },
      ],
      action: { label: "Pelajari Panduan Lomba", link: "/lomba" },
    };
  }

  if (now >= tDekorasiStart && now < t5RStart) {
    return {
      id: PHASES.DEKORASI,
      badgeLabel: "SEDANG BERLANGSUNG: MASA DEKORASI",
      badgeColor: "bg-amber-500/20 text-amber-200 border-amber-400/40",
      statusType: "active",
      title: "Lomba Dekorasi Ruangan (4–7 Agustus)",
      subtitle:
        "Hias area kerja ruanganmu sekreatif mungkin bertema HUT RI ke-81!",
      targetDate: "2026-08-07T17:00:00",
      targetLabel: "Sisa Waktu Dekorasi Ruangan",
      themeColor: "amber",
      reminders: [
        {
          icon: "fa-tape",
          title: "Perekat Aman",
          text: "Wajib pakai foam tape. Dilarang keras paku & cat!",
        },
        {
          icon: "fa-video-slash",
          title: "Bebas Menutupi CCTV",
          text: "Dekorasi TIDAK boleh menghalangi sudut pandang kamera CCTV.",
        },
        {
          icon: "fa-broom",
          title: "Jaga Kebersihan (5R)",
          text: "Bersihkan sisa sampah hiasan setelah selesai menghias.",
        },
      ],
      action: { label: "Panduan Lomba Dekorasi", link: "/lomba/dekor-5r" },
    };
  }

  if (now >= t5RStart && now < tPuncakDayStart) {
    return {
      id: PHASES.PENILAIAN_5R_AWAL,
      badgeLabel: "SEDANG BERLANGSUNG: PENILAIAN 5R",
      badgeColor: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40",
      statusType: "active",
      title: "Masa Sidak Penilaian 5R Harian",
      subtitle:
        "Juri melakukan penilaian berkala di setiap ruangan pada hari kerja.",
      targetDate: "2026-08-13T12:45:00",
      targetLabel: "Menuju Hari Puncak Lomba",
      themeColor: "emerald",
      reminders: [
        {
          icon: "fa-sparkles",
          title: "5R Terinci",
          text: "Ringkas, Rapi, Resik, Rawat, dan Rajin jaga harian.",
        },
        {
          icon: "fa-clipboard-check",
          title: "Sidak Tanpa Pemberitahuan",
          text: "Penilaian dilakukan acak saat jam kerja.",
        },
        {
          icon: "fa-plug",
          title: "Rapikan Kabel & Meja",
          text: "Gunakan cable tie dan susun dokumen meja dengan rapi.",
        },
      ],
      action: { label: "Kriteria Penilaian 5R", link: "/lomba/dekor-5r" },
    };
  }

  if (now >= tPuncakDayStart && now < tPuncakLiveStart) {
    return {
      id: PHASES.HARI_PUNCAK_PRE,
      badgeLabel: "HARI INI: HARI PUNCAK LOMBA",
      badgeColor: "bg-red-500/30 text-white border-red-300/50 animate-pulse",
      statusType: "live",
      title: "Hari Puncak Lomba Kemerdekaan!",
      subtitle:
        "Kamis, 13 Agustus 2026 · Perlombaan Estafet Balon & Air di Halaman TKI.",
      targetDate: "2026-08-13T12:45:00",
      targetLabel: "Mulai Acara Puncak (12.45 WIB)",
      themeColor: "red",
      reminders: [
        {
          icon: "fa-clock",
          title: "Mulai 12.45 WIB",
          text: "Kumpul di Halaman TKI tepat waktu.",
        },
        {
          icon: "fa-shirt",
          title: "Pakaian Siap Basah",
          text: "Gunakan kostum tim/kaos yang nyaman & siap terkena air.",
        },
        {
          icon: "fa-flag-checkered",
          title: "Estafet Balon & Air",
          text: "Siapkan strategi kelompok Putra & Putri terbaikmu!",
        },
      ],
      action: { label: "Lihat Schedule Puncak", link: "/rundown" },
    };
  }

  if (now >= tPuncakLiveStart && now < tPuncakEnd) {
    return {
      id: PHASES.HARI_PUNCAK_LIVE,
      badgeLabel: "LIVE: ACARA SEDANG BERLANGSUNG",
      badgeColor: "bg-emerald-500 text-white border-emerald-300 animate-pulse",
      statusType: "live",
      title: "Perlombaan Utama Sedang Berlangsung!",
      subtitle:
        "Estafet Balon Tanpa Tangan & Estafet Air Gelas Bocor di Halaman TKI.",
      targetDate: "2026-08-13T17:00:00",
      targetLabel: "Perkiraan Acara Selesai",
      themeColor: "emerald",
      reminders: [
        {
          icon: "fa-heart-pulse",
          title: "Semangat Bertanding!",
          text: "Jaga sportifitas dan kebersamaan tim.",
        },
        {
          icon: "fa-shield-halved",
          title: "Utamakan Keselamatan",
          text: "Hati-hati lantai licin saat estafet air.",
        },
        {
          icon: "fa-bullhorn",
          title: "Dukung Timmu",
          text: "Beri sorakan terbaik untuk perwakilan kelompokmu!",
        },
      ],
      action: { label: "Panduan Lomba Lapangan", link: "/lomba" },
    };
  }

  if (now >= tPuncakEnd && now < tAwardStart) {
    return {
      id: PHASES.PENILAIAN_5R_LANJUT,
      badgeLabel: "MENUNGGU PENGUMUMAN JUARA",
      badgeColor: "bg-purple-500/20 text-purple-200 border-purple-400/40",
      statusType: "active",
      title: "Lomba Lapangan Selesai · Penilaian 5R Masih Berjalan",
      subtitle:
        "Terima kasih atas keseruan hari puncak! Penilaian 5R berlanjut hingga 27 Agustus.",
      targetDate: "2026-08-28T13:00:00",
      targetLabel: "Menuju Pengumuman Pemenang",
      themeColor: "purple",
      reminders: [
        {
          icon: "fa-broom",
          title: "Pertahankan 5R",
          text: "Juri masih merekap poin 5R di setiap ruangan.",
        },
        {
          icon: "fa-trophy",
          title: "Pengumuman 28 Agustus",
          text: "Pengumuman pemenang dilaksanakan Jumat, 28 Agustus.",
        },
        {
          icon: "fa-mosque",
          title: "Lokasi Pengumuman",
          text: "Dilaksanakan setelah kajian Jumat di Mushola TKI.",
        },
      ],
      action: { label: "Cek Daftar Tim", link: "/tim" },
    };
  }

  if (now >= tAwardStart && now < tAwardLiveStart) {
    return {
      id: PHASES.PENGUMUMAN_DAY,
      badgeLabel: "HARI INI: PENGUMUMAN PEMENANG JUARA",
      badgeColor: "bg-amber-500/30 text-white border-amber-300/50 animate-pulse",
      statusType: "live",
      title: "Hari Pengumuman Pemenang & Hadiah!",
      subtitle:
        "Jumat, 28 Agustus 2026 · Pengumuman dilaksanakan pukul 13.00 WIB (setelah kajian Jumat).",
      targetDate: "2026-08-28T13:00:00",
      targetLabel: "Mulai Pengumuman Juara (13.00 WIB)",
      themeColor: "amber",
      reminders: [
        {
          icon: "fa-mosque",
          title: "Kajian Jumat",
          text: "Ikuti kajian Jumat terlebih dahulu di Mushola TKI.",
        },
        {
          icon: "fa-gift",
          title: "Pembagian Hadiah",
          text: "Penyerahan trofi & hadiah untuk semua pemenang cabang lomba.",
        },
        {
          icon: "fa-camera",
          title: "Foto Bersama",
          text: "Sesi dokumentasi bersama seluruh peserta & panitia.",
        },
      ],
      action: { label: "Lihat Detail Rundown", link: "/rundown" },
    };
  }

  if (now >= tAwardLiveStart && now < tAwardEnd) {
    return {
      id: PHASES.PENGUMUMAN_DAY,
      badgeLabel: "LIVE: PENGUMUMAN JUARA SEDANG BERLANGSUNG",
      badgeColor: "bg-emerald-500 text-white border-emerald-300 animate-pulse",
      statusType: "live",
      title: "Pengumuman Pemenang & Pembagian Hadiah!",
      subtitle:
        "Sedang berlangsung di Mushola TKI setelah kajian Jumat. Selamat kepada para pemenang!",
      targetDate: "2026-08-28T17:00:00",
      targetLabel: "Penutupan Rangkaian Acara",
      themeColor: "emerald",
      reminders: [
        {
          icon: "fa-trophy",
          title: "Pemberian Trofi",
          text: "Penyerahan hadiah & gelar juara lomba 5R, Balon, dan Air.",
        },
        {
          icon: "fa-users",
          title: "Kebersamaan Team",
          text: "Selamat untuk seluruh tim yang telah berpartisipasi!",
        },
      ],
      action: { label: "Cek Semua Peserta", link: "/tim" },
    };
  }

  return {
    id: PHASES.FINISHED,
    badgeLabel: "RANGKAIAN ACARA TELAH SELESAI",
    badgeColor: "bg-slate-500/20 text-slate-200 border-slate-400/30",
    statusType: "completed",
    title: "Terima Kasih Atas Partisipasinya!",
    subtitle:
      "Seluruh rangkaian peringatan HUT RI ke-81 PT TKI x PT FTP telah terlaksana dengan sukses.",
    targetDate: null,
    targetLabel: "Acara Selesai",
    themeColor: "slate",
    reminders: [
      {
        icon: "fa-heart",
        title: "Semangat Kemerdekaan",
        text: "Terus jaga kekompakan & kebersihan 5R di tempat kerja.",
      },
      {
        icon: "fa-flag",
        title: "Merdeka!",
        text: "Indonesia Berdaulat, Adil, dan Makmur.",
      },
    ],
    action: { label: "Lihat Semua Tim", link: "/tim" },
  };
}
