/**
 * Dry-run check: seed-data konsisten — semua nama team member / user resolve ke employees.json.
 * Tidak menyentuh DB. Jalankan: bun scripts/_check-seed.ts
 */

import { employeesSeed } from './seed-data/employees';
import { auditNames, superadminNames, teamMemberNamesSeed, teamsSeed } from './seed-data/teams';

function norm(s: string): string {
  return String(s)
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/['.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const NAME_ALIASES: Record<string, string> = {
  'Beryl Galih Ardiansyah': 'Beryl Galih Ardhiansyah',
};

const empNorm = new Map<string, string>();
for (const e of employeesSeed) empNorm.set(norm(e.nama), e.nama);

let fail = 0;
const seenMembers = new Set<string>();

// 1. setiap team punya entry member names
for (const t of teamsSeed) {
  const names = teamMemberNamesSeed[t.nama];
  if (!names) {
    console.error(`FAIL: team ${t.nama} tidak punya teamMemberNamesSeed`);
    fail++;
    continue;
  }
  if (names.length === 0) {
    console.error(`FAIL: team ${t.nama} punya 0 anggota`);
    fail++;
  }
  for (const n of names) {
    const aliased = NAME_ALIASES[n] ?? n;
    const matched = empNorm.get(norm(aliased));
    if (!matched) {
      console.error(`FAIL: ${t.nama} → "${n}" tidak match ke employees`);
      fail++;
      continue;
    }
    if (seenMembers.has(matched)) {
      console.error(`FAIL: ${matched} muncul di 2 tim (dobel member)`);
      fail++;
    }
    seenMembers.add(matched);
  }
}

// 2. semua nama user resolve
for (const [label, list] of [
  ['superadmin', superadminNames],
  ['audit', auditNames],
] as const) {
  for (const n of list) {
    if (!empNorm.get(norm(n))) {
      console.error(`FAIL: user ${label} "${n}" tidak ada di employees`);
      fail++;
    }
  }
}

// 3. PKL employees lengkap & unik
const pkl = employeesSeed.filter((e) => e.divisi === 'PKL');
if (pkl.length !== 23) {
  console.error(`FAIL: jumlah PKL employees = ${pkl.length}, harap 23`);
  fail++;
}
const dupNames = pkl.filter(
  (e, i, arr) => arr.findIndex((x) => norm(x.nama) === norm(e.nama)) !== i
);
if (dupNames.length) {
  console.error(`FAIL: nama PKL duplikat: ${dupNames.map((d) => d.nama).join(', ')}`);
  fail++;
}

// 4. setiap PKL employee terpasang ke tim PKL
const pklInTeams = pkl.filter((e) => seenMembers.has(e.nama));
if (pklInTeams.length !== 23) {
  const missing = pkl.filter((e) => !seenMembers.has(e.nama)).map((e) => e.nama);
  console.error(`FAIL: ${missing.length} PKL tidak di tim manapun: ${missing.join(', ')}`);
  fail++;
}

// 5. jumlah anggota tim PKL: 6/5/6/6
const pklTeams = ['Tim Putra 9', 'Tim Putra 10', 'Tim Putri 6', 'Tim Putri 7'];
for (const t of pklTeams) {
  const n = teamMemberNamesSeed[t]?.length ?? 0;
  console.log(`INFO: ${t} = ${n} anggota`);
}

console.log(
  `\nemployees=${employeesSeed.length} teams=${teamsSeed.length} members-unique=${seenMembers.size}`
);
console.log(fail === 0 ? '✅ SEMUA CHECK PASS' : `❌ ${fail} check GAGAL`);
process.exit(fail === 0 ? 0 : 1);
