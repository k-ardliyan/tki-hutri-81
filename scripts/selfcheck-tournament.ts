/**
 * Self-check domain tournament (bun scripts/selfcheck-tournament.ts).
 * Assert-based, tanpa framework — wajib pass sebelum dianggap benar.
 */
import { calculateBracketSize, calculateByeCount, calculateRoundCount, nextPowerOfTwo } from '../src/lib/tournament/bracket-size'
import { generateBracketStructure, getRoundName } from '../src/lib/tournament/generator'
import { calculatePodium } from '../src/lib/tournament/podium'
import { resolveDownstreamStatus } from '../src/lib/tournament/progression'
import { generateSeedOrder } from '../src/lib/tournament/seeding'
import { nextBracketStatus } from '../src/lib/tournament/status'
import { assertUniqueParticipants, canEditStructure, canSubmitResult, winnerBelongsToMatch } from '../src/lib/tournament/validation'
import type { TournamentMatch } from '../src/lib/tournament/types'

let failed = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ✓ ${name}`)
  } else {
    failed++
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

console.log('bracket-size')
check('nextPowerOfTwo(2)=2', nextPowerOfTwo(2) === 2)
check('nextPowerOfTwo(3)=4', nextPowerOfTwo(3) === 4)
check('nextPowerOfTwo(5)=8', nextPowerOfTwo(5) === 8)
check('nextPowerOfTwo(8)=8', nextPowerOfTwo(8) === 8)
check('nextPowerOfTwo(10)=16', nextPowerOfTwo(10) === 16)
check('bracketSize 5 = 8', calculateBracketSize(5) === 8)
check('roundCount 8 = 3', calculateRoundCount(8) === 3)
check('bye 5 di 8 = 3', calculateByeCount(5, 8) === 3)
let sizeThrew = false
try {
  calculateBracketSize(1)
} catch {
  sizeThrew = true
}
check('1 peserta → throw', sizeThrew)

console.log('round names')
check('round 3/3 = Final', getRoundName(3, 3) === 'Final')
check('round 2/3 = Semifinal', getRoundName(2, 3) === 'Semifinal')
check('round 1/3 = Quarterfinal', getRoundName(1, 3) === 'Quarterfinal')
check('round 1/4 = Round of 16', getRoundName(1, 4) === 'Round of 16')

console.log('generate 8 peserta (3 main rounds, 7 matches)')
const g8 = generateBracketStructure(8, true)
check('3 main rounds', g8.rounds.filter((r) => r.roundType === 'MAIN').length === 3)
check('7 main matches', g8.matches.filter((m) => m.roundType === 'MAIN').length === 7)
check('QF 4 matches', g8.rounds[0].matchCount === 4)
check('SF 2 matches', g8.rounds[1].matchCount === 2)
check('Final 1 match', g8.rounds[2].matchCount === 1)
check('third place ada', g8.rounds.some((r) => r.roundType === 'THIRD_PLACE'))
check('M1 winner → SF match 1 slot 1', (() => {
  const m1 = g8.matches.find((m) => m.matchNumber === 1 && m.roundNumber === 1)!
  return m1.nextRoundNumber === 2 && m1.nextMatchNumber === 1 && m1.nextSlot === 1
})())
check('M2 winner → SF match 1 slot 2', (() => {
  const m2 = g8.matches.find((m) => m.matchNumber === 2 && m.roundNumber === 1)!
  return m2.nextMatchNumber === 1 && m2.nextSlot === 2
})())
check('M3 winner → SF match 2 slot 1', (() => {
  const m3 = g8.matches.find((m) => m.matchNumber === 3 && m.roundNumber === 1)!
  return m3.nextMatchNumber === 2 && m3.nextSlot === 1
})())
check('SF1 winner → final slot 1', (() => {
  const sf1 = g8.matches.find((m) => m.matchNumber === 1 && m.roundNumber === 2)!
  return sf1.nextRoundNumber === 3 && sf1.nextMatchNumber === 1 && sf1.nextSlot === 1
})())
check('third place = loser SF1 vs loser SF2', (() => {
  const tp = g8.matches.find((m) => m.roundType === 'THIRD_PLACE')!
  return tp.slot1.kind === 'LOSER_OF' && tp.slot2.kind === 'LOSER_OF' && (tp.slot1 as { matchNumber: number }).matchNumber === 1 && (tp.slot2 as { matchNumber: number }).matchNumber === 2
})())

console.log('generate 5 peserta (BYE)')
const g5 = generateBracketStructure(5, false)
check('bracket size 8', g5.bracketSize === 8)
check('bye 3', g5.byeCount === 3)
check('QF 4 matches', g5.rounds[0].matchCount === 4)
check('slot 2 M4 = BYE (posisi 8)', (() => {
  const m4 = g5.matches.find((m) => m.matchNumber === 4 && m.roundNumber === 1)!
  return m4.slot2.kind === 'BYE' || ((m4.slot2 as { seedPosition: number }).seedPosition === 8 && g5.byeCount === 3)
})())

console.log('generate 4 peserta')
const g4 = generateBracketStructure(4, true)
check('2 main rounds (SF + Final)', g4.rounds.filter((r) => r.roundType === 'MAIN').length === 2)
check('3 main matches', g4.matches.filter((m) => m.roundType === 'MAIN').length === 3)
check('third place ada (2 SF)', g4.rounds.some((r) => r.roundType === 'THIRD_PLACE'))

console.log('seeding')
const parts = [1, 2, 3, 4, 5].map((teamId) => ({ teamId, nama: `Tim ${teamId}` }))
check('REGISTRATION_ORDER = urutan', JSON.stringify(generateSeedOrder('REGISTRATION_ORDER', parts)) === '[1,2,3,4,5]')
const r1 = generateSeedOrder('RANDOM', parts)
const r2 = generateSeedOrder('RANDOM', parts)
check('RANDOM berubah antar panggilan (bukan bug, persist ke DB)', r1.join(',') !== r2.join(','))
check('RANDOM = permutasi lengkap', [...r1].sort().join(',') === '1,2,3,4,5')
const manual = new Map<number, number>([[1, 1], [2, 2], [3, 3], [4, 4], [5, 5]])
check('MANUAL urut sesuai posisi', JSON.stringify(generateSeedOrder('MANUAL', parts, manual)) === '[1,2,3,4,5]')
const manualSwap = new Map<number, number>([[1, 5], [2, 1], [3, 2], [4, 3], [5, 4]])
check('MANUAL acak posisi', JSON.stringify(generateSeedOrder('MANUAL', parts, manualSwap)) === '[2,3,4,5,1]')
// Edge manual: duplikat posisi, posisi hilang, posisi di luar range.
const dupPos = new Map<number, number>([[1, 1], [2, 1], [3, 3], [4, 4], [5, 5]])
let dupThrewM = false
try {
  generateSeedOrder('MANUAL', parts, dupPos)
} catch {
  dupThrewM = true
}
check('MANUAL posisi dobel → throw', dupThrewM)
const missPos = new Map<number, number>([[1, 1], [2, 2], [3, 3], [4, 4]])
let missThrewM = false
try {
  generateSeedOrder('MANUAL', parts, missPos)
} catch {
  missThrewM = true
}
check('MANUAL posisi kurang → throw', missThrewM)
const outPos = new Map<number, number>([[1, 0], [2, 2], [3, 3], [4, 4], [5, 5]])
let outThrewM = false
try {
  generateSeedOrder('MANUAL', parts, outPos)
} catch {
  outThrewM = true
}
check('MANUAL posisi 0 → throw', outThrewM)
let noManualThrew = false
try {
  generateSeedOrder('MANUAL', parts)
} catch {
  noManualThrew = true
}
check('MANUAL tanpa map → throw', noManualThrew)

console.log('progression & status')
function mkMatch(over: Partial<TournamentMatch> = {}): TournamentMatch {
  return {
    id: 1, roundId: 1, matchNumber: 1,
    participant1Id: null, participant2Id: null, winnerId: null, loserId: null,
    status: 'WAITING', nextMatchId: 5, nextMatchSlot: 1, version: 1,
    ...over,
  }
}
const waiting = mkMatch({ participant1Id: 1, participant2Id: null })
check('1 slot terisi → WAITING', resolveDownstreamStatus(waiting, false, false) === 'WAITING')
const ready = mkMatch({ participant1Id: 1, participant2Id: 2, status: 'READY' })
check('2 slot terisi → READY', resolveDownstreamStatus(ready, false, false) === 'READY')
check('canSubmitResult READY', canSubmitResult(ready))
check('canSubmitResult WAITING ditolak', !canSubmitResult(waiting))
check('canSubmitResult COMPLETED ditolak', !canSubmitResult(mkMatch({ participant1Id: 1, participant2Id: 2, status: 'COMPLETED' })))
check('winner belongs to match', winnerBelongsToMatch(ready, 2))
check('winner asing ditolak', !winnerBelongsToMatch(ready, 99))
check('edit struktur hanya DRAFT', canEditStructure('DRAFT') && !canEditStructure('PUBLISHED') && !canEditStructure('IN_PROGRESS'))
assertUniqueParticipants([1, 2, 3])
let dupThrew = false
try {
  assertUniqueParticipants([1, 2, 2])
} catch {
  dupThrew = true
}
check('duplicate participant → throw', dupThrew)

console.log('bracket status transitions')
check('publish DRAFT → PUBLISHED', nextBracketStatus('DRAFT', { published: true, hasAnyResult: false, finalCompleted: false, thirdPlaceEnabled: false, thirdPlaceCompleted: false }) === 'PUBLISHED')
check('result pertama → IN_PROGRESS', nextBracketStatus('PUBLISHED', { published: false, hasAnyResult: true, finalCompleted: false, thirdPlaceEnabled: false, thirdPlaceCompleted: false }) === 'IN_PROGRESS')
check('final selesai (no third) → COMPLETED', nextBracketStatus('IN_PROGRESS', { published: false, hasAnyResult: true, finalCompleted: true, thirdPlaceEnabled: false, thirdPlaceCompleted: false }) === 'COMPLETED')
check('final selesai tapi third belum → belum COMPLETED', nextBracketStatus('IN_PROGRESS', { published: false, hasAnyResult: true, finalCompleted: true, thirdPlaceEnabled: true, thirdPlaceCompleted: false }) === 'IN_PROGRESS')
check('final + third selesai → COMPLETED', nextBracketStatus('IN_PROGRESS', { published: false, hasAnyResult: true, finalCompleted: true, thirdPlaceEnabled: true, thirdPlaceCompleted: true }) === 'COMPLETED')

console.log('podium')
const finalDone = mkMatch({ participant1Id: 1, participant2Id: 2, winnerId: 1, loserId: 2, status: 'COMPLETED' })
check('podium final + third', JSON.stringify(calculatePodium(finalDone, mkMatch({ participant1Id: 3, participant2Id: 4, winnerId: 3, loserId: 4, status: 'COMPLETED' }))) === '{"rank1":1,"rank2":2,"rank3":3}')
check('podium tanpa third', JSON.stringify(calculatePodium(finalDone, null)) === '{"rank1":1,"rank2":2,"rank3":null}')
check('final belum selesai → kosong', JSON.stringify(calculatePodium(mkMatch({ participant1Id: 1, participant2Id: 2 }), null)) === '{"rank1":null,"rank2":null,"rank3":null}')

if (failed > 0) {
  console.error(`\n✗ ${failed} check gagal`)
  process.exit(1)
}
console.log('\n✓ Semua check lulus')
