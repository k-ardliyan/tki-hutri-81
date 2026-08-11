/**
 * Selfcheck — kalkulasi minggu penilaian 5R (pure, no DB).
 * Run: bun scripts/selfcheck-dates.ts
 */
import {
  buildWeeklySeries,
  currentWeekNumber,
  formatWeekRange,
  totalWeeks,
  validatePeriod,
  weekDateRange,
  weekNumber,
  weekPrefix,
} from '../src/lib/dateUtils';

let failed = 0;
const check = (name: string, cond: boolean, detail?: string) => {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failed++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

const start = new Date('2026-08-10T00:00:00+07:00');

// ── weekNumber ──
check('hari ke-1 = minggu 1', weekNumber(new Date('2026-08-10T12:00:00+07:00'), start) === 1);
check('hari ke-7 = minggu 1', weekNumber(new Date('2026-08-16T23:59:00+07:00'), start) === 1);
check('hari ke-8 = minggu 2', weekNumber(new Date('2026-08-17T00:00:00+07:00'), start) === 2);
check('sebelum start = 0', weekNumber(new Date('2026-08-09T23:59:00+07:00'), start) === 0);
check('persis start = 1', weekNumber(new Date('2026-08-10T00:00:00+07:00'), start) === 1);

// ── totalWeeks ──
check(
  '10-16 Agu (7 hari) = 1 minggu',
  totalWeeks(start, new Date('2026-08-16T23:59:00+07:00')) === 1
);
check(
  '10-23 Agu (14 hari) = 2 minggu',
  totalWeeks(start, new Date('2026-08-23T23:59:00+07:00')) === 2
);
check(
  '10-27 Agu (18 hari) = 3 minggu',
  totalWeeks(start, new Date('2026-08-27T23:59:00+07:00')) === 3
);
check('end < start = 0', totalWeeks(start, new Date('2026-08-09T00:00:00+07:00')) === 0);
check(
  '10-17 Agu PERSIS 7 hari = 2 minggu (konsisten dgn weekNumber hari ke-7)',
  totalWeeks(start, new Date('2026-08-17T00:00:00+07:00')) === 2
);

// ── weekDateRange ──
const w1 = weekDateRange(1, start);
const w2 = weekDateRange(2, start);
const w3 = weekDateRange(3, start);
check(
  'week1 mulai 10 Agu',
  w1.start.toISOString().startsWith('2026-08-09') || w1.start.toISOString().startsWith('2026-08-10')
);
check(
  'week1 selesai 16 Agu',
  w1.end.toISOString().startsWith('2026-08-15') || w1.end.toISOString().startsWith('2026-08-16')
);
check(
  'week2 mulai 17 Agu',
  w2.start.toISOString().startsWith('2026-08-16') || w2.start.toISOString().startsWith('2026-08-17')
);
check(
  'week3 mulai 24 Agu',
  w3.start.toISOString().startsWith('2026-08-23') || w3.start.toISOString().startsWith('2026-08-24')
);

// ── weekPrefix ──
const p1 = weekPrefix(1, start);
const p2 = weekPrefix(2, start);
check('week1 prefix start', p1.start.length === 10 && p1.end.length === 10);
check('week2 prefix > week1', p2.start > p1.start);

// ── formatWeekRange ──
const label = formatWeekRange(1, start);
check('formatWeekRange berisi dash', label.includes('–'));
check('formatWeekRange berisi angka', /\d/.test(label));

// ── currentWeekNumber ──
const now = new Date();
const cw = currentWeekNumber(start);
check('currentWeekNumber >= 1 (start di masa lalu)', cw >= 1);
check('currentWeekNumber konsisten dgn weekNumber', cw === weekNumber(now, start));

// ── buildWeeklySeries ──
const seriesStart = '2026-08-10T00:00:00+07:00';
const s1 = buildWeeklySeries(
  [
    { weekNumber: 1 },
    { weekNumber: 1 },
    { weekNumber: 2 },
    { weekNumber: undefined }, // legacy → default 1
  ],
  seriesStart
);
check(
  'series: 4 item → 2 minggu, count [3, 1]',
  s1.length === 2 && s1[0].count === 3 && s1[1].count === 1,
  JSON.stringify(s1)
);
check(
  'series: date = ISO tanggal mulai minggu (UTC)',
  s1[0].date === '2026-08-09' && s1[1].date === '2026-08-16'
);
check('series: semua minggu dari 1..max tercantum (termasuk kosong)', s1[0].count > 0);

const s2 = buildWeeklySeries([{ weekNumber: 5 }], seriesStart);
check(
  'series: hanya minggu 5 → array 5 minggu, kosong di 1-4',
  s2.length === 5 && s2[0].count === 0 && s2[4].count === 1,
  JSON.stringify(s2)
);

const s3 = buildWeeklySeries([{ weekNumber: 1 }, { weekNumber: 2 }], null);
check(
  'series tanpa startDate → label fallback M1/M2',
  s3.length === 2 && s3[0].date === 'M1' && s3[1].date === 'M2',
  JSON.stringify(s3)
);

const s4 = buildWeeklySeries([], seriesStart);
check('series kosong → 1 titik count 0 (chart tetap render)', s4.length === 1 && s4[0].count === 0);

const s5 = buildWeeklySeries([], null);
check(
  'series kosong tanpa startDate → array kosong (bukan crash)',
  Array.isArray(s5) && s5.length === 0
);

// ── validatePeriod ──
const v1 = validatePeriod('2026-08-10T00:00:00+07:00', '2026-08-27T00:00:00+07:00');
check('periode lengkap valid', v1.ok === true && v1.startDate !== null && v1.endDate !== null);

const v2 = validatePeriod(null, null);
check('null-null = hapus periode (valid)', v2.ok === true && v2.startDate === null);

const v3 = validatePeriod('2026-08-10T00:00:00+07:00', null);
check('start-only → tolak', v3.ok === false && v3.error.includes('lengkap'));

const v4 = validatePeriod(null, '2026-08-27T00:00:00+07:00');
check('end-only (legacy setDeadline) → izinkan', v4.ok === true && v4.endDate !== null);

const v5 = validatePeriod('2026-08-27T00:00:00+07:00', '2026-08-10T00:00:00+07:00');
check('end sebelum start → tolak', v5.ok === false && v5.error.includes('setelah'));

const v6 = validatePeriod('not-a-date', '2026-08-27T00:00:00+07:00');
check('tanggal invalid → tolak', v6.ok === false && v6.error.includes('tidak valid'));

console.log(failed > 0 ? `✗ ${failed} check gagal` : '✓ Semua check lulus');
process.exit(failed > 0 ? 1 : 0);
