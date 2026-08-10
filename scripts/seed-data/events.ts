/**
 * Seed data: events, key_dates, room_areas, landing_highlights,
 * rundown_phases, rundown_items
 *
 * Source: src/data/content.js
 */

// ─── Events (1 row) ───
export const eventsSeed = [
  {
    title: 'HUT RI ke-81',
    org: 'PT TKI x PT FTP',
    year: 2026,
    theme: 'Indonesia Berdaulat, Adil, dan Makmur',
    peakDateLabel: 'Kamis, 13 Agustus 2026',
    peakTimeLabel: '12.45 WIB',
    peakTarget: new Date('2026-08-13T12:45:00'),
    eventEndTarget: new Date('2026-08-13T17:00:00'),
    awardTarget: new Date('2026-08-28T13:00:00'),
    awardEndTarget: new Date('2026-08-28T17:00:00'),
    awardDateLabel: 'Jumat, 28 Agustus 2026',
    awardNote: 'Setelah kajian Jumat',
    tagline:
      'Rayakan kemerdekaan lewat lomba, kreativitas, dan kebersamaan dalam semangat HUT RI ke-81.',
  },
]

// ─── Key Dates (5 rows) ───
export const keyDatesSeed = [
  {
    when: 'Senin, 3 Agustus 2026',
    title: 'Sosialisasi lomba',
    detail: 'Kenali aturan, jadwal, dan alur setiap lomba.',
    sortOrder: 1,
  },
  {
    when: '4–7 Agustus 2026',
    title: 'Dekorasi ruangan',
    detail: 'Hias ruangan di area masing-masing, dari Selasa hingga Jumat.',
    sortOrder: 2,
  },
  {
    when: '10–27 Agustus 2026',
    title: 'Penilaian 5R',
    detail: 'Penilaian dilakukan melalui sidak pada hari kerja.',
    sortOrder: 3,
  },
  {
    when: '13 Agustus 2026',
    title: 'Hari puncak',
    detail: 'Sambutan, estafet balon, istirahat, dan estafet air.',
    sortOrder: 4,
  },
  {
    when: '28 Agustus 2026',
    title: 'Pengumuman pemenang',
    detail: 'Pemenang diumumkan dan hadiah dibagikan setelah kajian Jumat.',
    sortOrder: 5,
  },
]

// ─── Room Areas (5 rows) ───
export const roomAreasSeed = [
  { name: 'Implementator', icon: 'fa-gears', sortOrder: 1 },
  { name: 'Hardware & Finance', icon: 'fa-microchip', sortOrder: 2 },
  { name: 'Sales', icon: 'fa-handshake', sortOrder: 3 },
  { name: 'IT Dalam', icon: 'fa-server', sortOrder: 4 },
  { name: 'IT Luar', icon: 'fa-network-wired', sortOrder: 5 },
]

// ─── Landing Highlights (4 rows) ───
export const landingHighlightsSeed = [
  { label: 'Tim peserta', value: '13', hint: '8 Putra · 5 Putri', sortOrder: 1 },
  { label: 'Jenis lomba', value: '3', hint: 'Dekorasi & 5R · Balon · Air', sortOrder: 2 },
  { label: 'Hari puncak', value: '13 Ags', hint: 'Mulai pukul 12.45 WIB', sortOrder: 3 },
  { label: 'Pengumuman', value: '28 Ags', hint: 'Setelah kajian Jumat', sortOrder: 4 },
]

// ─── Rundown Phases (5 rows) ───
// slug derived from id: "phase-kickoff" → "phase-kickoff"
export const rundownPhasesSeed = [
  { slug: 'phase-kickoff', phase: 'Sosialisasi', highlight: false, sortOrder: 1 },
  { slug: 'phase-dekor', phase: 'Dekorasi Ruangan', highlight: false, sortOrder: 2 },
  { slug: 'phase-nilai', phase: 'Penilaian 5R', highlight: false, sortOrder: 3 },
  { slug: 'phase-peak', phase: 'Hari Puncak · 13 Agustus', highlight: true, sortOrder: 4 },
  { slug: 'phase-award', phase: 'Pengumuman', highlight: false, sortOrder: 5 },
]

// ─── Rundown Items (10 rows) ───
// phaseId references rundownPhases by sortOrder (1–5)
export const rundownItemsSeed = [
  // Phase 1: Sosialisasi (phaseId → sortOrder 1)
  {
    phaseId: 1,
    time: 'Senin, 3 Agustus',
    title: 'Penjelasan aturan lomba',
    note: 'Peserta akan mendapat penjelasan mengenai alur lomba, ketentuan teknis, dan aturan penggunaan fasilitas.',
    sortOrder: 1,
  },
  // Phase 2: Dekorasi Ruangan (phaseId → sortOrder 2)
  {
    phaseId: 2,
    time: 'Selasa–Jumat, 4–7 Agustus',
    title: 'Pemasangan dekorasi',
    note: 'Dekorasi dipasang menggunakan foam tape. Paku dan cat dinding tidak diperbolehkan. Dekorasi harus dipasang di tempat yang tidak menghalangi pandangan CCTV.',
    sortOrder: 1,
  },
  // Phase 3: Penilaian 5R (phaseId → sortOrder 3)
  {
    phaseId: 3,
    time: '10–27 Agustus · hari kerja',
    title: 'Sidak dan penilaian 5R',
    note: 'Juri menilai penerapan Ringkas, Rapi, Resik, Rawat, dan Rajin di setiap ruangan.',
    sortOrder: 1,
  },
  // Phase 4: Hari Puncak (phaseId → sortOrder 4)
  {
    phaseId: 4,
    time: '12.45–13.05',
    title: 'Sambutan dan doa',
    note: 'Acara dibuka dengan sambutan CEO dan Ketua Panitia, lalu dilanjutkan dengan doa.',
    sortOrder: 1,
  },
  {
    phaseId: 4,
    time: '13.05–15.00',
    title: 'Estafet Balon Tanpa Tangan',
    note: 'Babak penyisihan dan final berlangsung terpisah untuk kategori Putra dan Putri.',
    sortOrder: 2,
  },
  {
    phaseId: 4,
    time: '15.00–15.30',
    title: 'Istirahat dan salat',
    note: 'Waktu istirahat dan salat Asar sekaligus persiapan area untuk lomba berikutnya.',
    sortOrder: 3,
  },
  {
    phaseId: 4,
    time: '15.30–17.00',
    title: 'Estafet Air Gelas Bocor',
    note: 'Setiap sesi berlangsung selama 3 menit. Pemenang ditentukan dari volume air terbanyak.',
    sortOrder: 4,
  },
  // Phase 5: Pengumuman (phaseId → sortOrder 5)
  {
    phaseId: 5,
    time: 'Jumat, 28 Agustus',
    title: 'Pengumuman dan pembagian hadiah',
    note: 'Pemenang setiap lomba dan kategori diumumkan setelah kajian Jumat.',
    sortOrder: 1,
  },
]
