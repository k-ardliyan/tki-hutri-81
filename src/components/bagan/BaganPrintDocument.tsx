/**
 * BaganPrintDocument — Komponen Dokumen Cetak & PDF Resmi Bagan Pertandingan HUT RI ke-81.
 * Disesuaikan persis dengan standar kertas A4 (Landscape 297×210 mm & Portrait 210×297 mm):
 * - Kop Resmi HUT RI ke-81: PT Teknologi Kartu Indonesia × PT Fokus Teknologi Pembayaran (PT TKI × PT FTP).
 * - Mendukung 2 mode turnamen: Single Elimination (Bracket Tree) & Heat Elimination (Multi-Stage Pipeline).
 * - Kolom babak/stage terbagi rata (grid 1fr) tanpa overflow horizontal pada kertas A4.
 * - Stage lanjutan (Perempat Final / Semifinal / Final) yang belum diundi menampilkan kartu header sesi + slot garis kosong untuk penulisan manual.
 * - Format ink-friendly (background putih bersih, tipografi tajam, kontras tinggi).
 * - Kartu Podium Juara (1, 2, 3) & Rincian Hadiah.
 * - Tabel Rekapitulasi Pertandingan / Jadwal Lapangan.
 * - Lembar Pengesahan (Tanda Tangan Panitia & Wasit/Juri).
 */

import { Award, Crown, Flame, Gift, Layers, Medal, Trophy, Users } from 'lucide-react';
import React, { useMemo } from 'react';
import type { BracketDetailView } from '~/components/bagan/BracketTree';
import { getStagePlaceholderDistribution } from '~/components/bagan/HeatPipelineTree';
import type {
  HeatDetailView,
  HeatSessionView,
  HeatStageView,
} from '~/lib/tournament/heat-elimination/types';
import { cn } from '~/lib/utils';

export interface BaganPrintDocumentProps {
  title: string;
  kategori: string;
  format: 'SINGLE_ELIMINATION' | 'HEAT_ELIMINATION';
  status?: string;
  singleBracket?: BracketDetailView | null;
  heatBracket?: HeatDetailView | null;
  teams?: Array<{ id: number; nama: string }>;
  prizes?: Array<{ place: number; hadiah: string }>;
  options?: {
    showPrizes?: boolean;
    showSummaryTable?: boolean;
    showSignatures?: boolean;
    orientation?: 'landscape' | 'portrait';
  };
}

function getTeamName(
  teams: Array<{ id: number; nama: string }> = [],
  id: number | null | undefined
): string {
  if (id === null || id === undefined) return '—';
  return teams.find((t) => t.id === id)?.nama ?? `Tim ${id}`;
}

/**
 * Menghasilkan daftar sesi untuk babak cetak, termasuk sesi placeholder untuk babak lanjutan yang belum diundi.
 */
function getPrintSessionsForStage(
  stage: HeatStageView,
  prevStage: HeatStageView | null
): Array<{ session: HeatSessionView; isPlaceholder: boolean }> {
  if (stage.sessions && stage.sessions.length > 0) {
    return stage.sessions.map((s) => ({ session: s, isPlaceholder: false }));
  }

  // Jika babak belum memiliki sesi yang terbentuk (mis. Semifinal / Final di awal)
  const prevSessionsCount =
    prevStage && prevStage.sessions.length > 0 ? prevStage.sessions.length : 2;
  const qualifiersFromPrev = prevSessionsCount * (prevStage?.qualifiersPerSession || 2);

  const expectedCount = stage.isFinal
    ? 1
    : Math.max(1, Math.ceil(qualifiersFromPrev / (stage.teamsPerSession || 4)));

  const placeholders: Array<{ session: HeatSessionView; isPlaceholder: boolean }> = [];
  for (let i = 0; i < expectedCount; i++) {
    placeholders.push({
      session: {
        id: -100 - i - stage.id * 10,
        sessionNumber: i + 1,
        name: stage.isFinal ? 'Sesi Final' : `Sesi ${i + 1}`,
        status: 'WAITING',
        version: 1,
        participants: [],
        results: [],
      },
      isPlaceholder: true,
    });
  }

  return placeholders;
}

export function BaganPrintDocument({
  title,
  kategori,
  format,
  status = 'PUBLISHED',
  singleBracket,
  heatBracket,
  teams = [],
  prizes = [],
  options = {},
}: BaganPrintDocumentProps) {
  const {
    showPrizes = true,
    showSummaryTable = true,
    showSignatures = true,
    orientation = 'landscape',
  } = options;

  const printDateStr = useMemo(() => {
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(new Date());
  }, []);

  const combinedTeams = useMemo(() => {
    if (singleBracket?.participants) {
      return singleBracket.participants.map((p) => ({ id: p.teamId, nama: p.nama }));
    }
    if (heatBracket?.teams) {
      return heatBracket.teams;
    }
    return teams;
  }, [singleBracket, heatBracket, teams]);

  const winner1 =
    format === 'SINGLE_ELIMINATION'
      ? getTeamName(combinedTeams, singleBracket?.podium?.rank1)
      : getTeamName(combinedTeams, heatBracket?.podium?.rank1);

  const winner2 =
    format === 'SINGLE_ELIMINATION'
      ? getTeamName(combinedTeams, singleBracket?.podium?.rank2)
      : getTeamName(combinedTeams, heatBracket?.podium?.rank2);

  const winner3 =
    format === 'SINGLE_ELIMINATION'
      ? getTeamName(combinedTeams, singleBracket?.podium?.rank3)
      : getTeamName(combinedTeams, heatBracket?.podium?.rank3);

  return (
    <div
      id="bagan-print-area"
      className="w-full bg-white text-slate-900 font-sans space-y-5 mx-auto box-border"
    >
      {/* ─── 1. KOP RESMI DOKUMEN TURNAMEN (A4 HEADER) ─── */}
      <header className="print-include print:!block border-b-2 border-slate-900 pb-3 space-y-2.5 print:break-inside-avoid">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Logo / Badge Merah Putih Vektor */}
            <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-red-600 text-white font-black shadow-xs border border-red-700">
              <span className="text-[9px] uppercase tracking-wider leading-none">HUT RI</span>
              <span className="text-lg leading-none mt-0.5">81</span>
            </div>

            <div>
              <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900 leading-tight">
                LEMBAR BAGAN RESMI PERTANDINGAN
              </h1>
              <p className="text-[11px] font-bold text-red-600 uppercase tracking-wide">
                PERINGATAN HUT KEMERDEKAAN REPUBLIK INDONESIA KE-81
              </p>
              <p className="text-[10px] font-semibold text-slate-600">
                PT Teknologi Kartu Indonesia × PT Fokus Teknologi Pembayaran (PT TKI × PT FTP)
              </p>
            </div>
          </div>

          {/* Timestamp & Status Badge Dokumen */}
          <div className="text-right shrink-0 space-y-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-300 px-2 py-0.5 text-[9.5px] font-black uppercase text-slate-800">
              Status: {status}
            </span>
            <p className="text-[9.5px] text-slate-500 font-mono">Dicetak: {printDateStr}</p>
          </div>
        </div>

        {/* Info Strip Perlombaan */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-lg bg-slate-50 border border-slate-200 p-2 text-xs">
          <div>
            <span className="text-[9.5px] text-slate-500 font-semibold block uppercase">
              Cabang Lomba
            </span>
            <strong className="text-slate-900 text-xs font-black">{title}</strong>
          </div>
          <div>
            <span className="text-[9.5px] text-slate-500 font-semibold block uppercase">
              Kategori
            </span>
            <strong className="text-slate-900 font-bold uppercase text-xs flex items-center gap-1">
              <Users size={11} className="text-slate-600" />
              {kategori === 'putra' ? 'Kategori Putra' : 'Kategori Putri'}
            </strong>
          </div>
          <div>
            <span className="text-[9.5px] text-slate-500 font-semibold block uppercase">
              Sistem Bagan
            </span>
            <strong className="text-slate-900 font-bold text-xs">
              {format === 'HEAT_ELIMINATION'
                ? 'Mode Heat (Multi-Stage)'
                : 'Sistem Gugur (Single Elimination)'}
            </strong>
          </div>
          <div>
            <span className="text-[9.5px] text-slate-500 font-semibold block uppercase">
              Total Tim Terdaftar
            </span>
            <strong className="text-slate-900 font-bold text-xs">{combinedTeams.length} Tim</strong>
          </div>
        </div>
      </header>

      {/* ─── 2. VISUALISASI BAGAN POHON / HEAT PIPELINE ─── */}
      <main className="space-y-5">
        {format === 'SINGLE_ELIMINATION' && singleBracket && (
          <SingleEliminationPrintTree
            bracket={singleBracket}
            teams={combinedTeams}
            prizes={prizes}
            showPrizes={showPrizes}
          />
        )}

        {format === 'HEAT_ELIMINATION' && heatBracket && (
          <HeatEliminationPrintTree
            bracket={heatBracket}
            teams={combinedTeams}
            prizes={prizes}
            showPrizes={showPrizes}
          />
        )}

        {/* ─── 3. GRAND PODIUM & HADIAH JUARA ─── */}
        {showPrizes && (
          <section className="rounded-xl border border-amber-300 bg-amber-50/40 p-3.5 space-y-2.5 print:break-inside-avoid">
            <div className="flex items-center gap-2 border-b border-amber-200 pb-1.5">
              <Trophy size={15} className="text-amber-600" />
              <h3 className="text-xs font-black uppercase text-slate-900">
                Peringkat Juara &amp; Hadiah Perlombaan
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Juara 1 */}
              <div className="rounded-lg border-2 border-amber-400 bg-white p-2.5 space-y-1 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-500 text-white px-2 py-0.5 text-[9.5px] font-black uppercase">
                    <Medal size={10} /> Juara 1 (Emas)
                  </span>
                  <Crown size={13} className="text-amber-500" />
                </div>
                {winner1 && winner1 !== '—' ? (
                  <p className="text-xs font-black text-slate-900 truncate">{winner1}</p>
                ) : (
                  <div className="border-b-2 border-dotted border-amber-400/80 h-4 my-1 w-full" />
                )}
                {prizes.find((p) => p.place === 1)?.hadiah && (
                  <p className="text-[10px] font-bold text-amber-700">
                    <Gift size={10} className="inline mr-1 -mt-0.5" />
                    {prizes.find((p) => p.place === 1)?.hadiah}
                  </p>
                )}
              </div>

              {/* Juara 2 */}
              <div className="rounded-lg border border-slate-300 bg-white p-2.5 space-y-1 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-400 text-white px-2 py-0.5 text-[9.5px] font-black uppercase">
                    <Medal size={10} /> Juara 2 (Perak)
                  </span>
                  <Medal size={13} className="text-slate-400" />
                </div>
                {winner2 && winner2 !== '—' ? (
                  <p className="text-xs font-bold text-slate-900 truncate">{winner2}</p>
                ) : (
                  <div className="border-b-2 border-dotted border-slate-400/80 h-4 my-1 w-full" />
                )}
                {prizes.find((p) => p.place === 2)?.hadiah && (
                  <p className="text-[9.5px] font-semibold text-slate-600">
                    <Gift size={10} className="inline mr-1 -mt-0.5" />
                    {prizes.find((p) => p.place === 2)?.hadiah}
                  </p>
                )}
              </div>

              {/* Juara 3 */}
              <div className="rounded-lg border border-amber-800/30 bg-white p-2.5 space-y-1 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-700 text-white px-2 py-0.5 text-[9.5px] font-black uppercase">
                    <Medal size={10} /> Juara 3 (Perunggu)
                  </span>
                  <Award size={13} className="text-amber-700" />
                </div>
                {winner3 && winner3 !== '—' ? (
                  <p className="text-xs font-bold text-slate-900 truncate">{winner3}</p>
                ) : (
                  <div className="border-b-2 border-dotted border-amber-800/60 h-4 my-1 w-full" />
                )}
                {prizes.find((p) => p.place === 3)?.hadiah && (
                  <p className="text-[9.5px] font-semibold text-slate-600">
                    <Gift size={10} className="inline mr-1 -mt-0.5" />
                    {prizes.find((p) => p.place === 3)?.hadiah}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ─── 4. TABEL REKAPITULASI HASIL PERTANDINGAN ─── */}
        {showSummaryTable && (
          <section className="space-y-2 print:break-inside-avoid">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5 border-b border-slate-200 pb-1">
              <Layers size={13} className="text-slate-600" />
              Tabel Rekapitulasi &amp; Jadwal Pertandingan
            </h3>

            {format === 'SINGLE_ELIMINATION' && singleBracket && (
              <div className="w-full overflow-hidden rounded-lg border border-slate-300">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                      <th className="p-1.5 border-r border-slate-300 w-14 text-center">Match #</th>
                      <th className="p-1.5 border-r border-slate-300">Babak</th>
                      <th className="p-1.5 border-r border-slate-300">Tim 1</th>
                      <th className="p-1.5 border-r border-slate-300">Tim 2</th>
                      <th className="p-1.5 border-r border-slate-300">Pemenang</th>
                      <th className="p-1.5 text-center w-20">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {singleBracket.rounds.flatMap((r) =>
                      r.matches.map((m) => {
                        const t1 =
                          m.participant1Nama || getTeamName(combinedTeams, m.participant1Id);
                        const t2 =
                          m.participant2Nama || getTeamName(combinedTeams, m.participant2Id);
                        const win = getTeamName(combinedTeams, m.winnerId);
                        const isDone = m.status === 'COMPLETED' || m.status === 'AUTO_ADVANCED';

                        return (
                          <tr
                            key={m.id}
                            className="border-b border-slate-200 hover:bg-slate-50 text-[10.5px]"
                          >
                            <td className="p-1.5 border-r border-slate-200 text-center font-mono font-bold">
                              #{m.matchNumber}
                            </td>
                            <td className="p-1.5 border-r border-slate-200 font-semibold">
                              {r.name}
                            </td>
                            <td
                              className={cn(
                                'p-1.5 border-r border-slate-200',
                                m.winnerId === m.participant1Id && 'font-black text-emerald-700'
                              )}
                            >
                              {t1 && t1 !== '—' ? (
                                t1
                              ) : (
                                <div className="border-b border-dotted border-slate-300 h-2.5 my-1" />
                              )}
                            </td>
                            <td
                              className={cn(
                                'p-1.5 border-r border-slate-200',
                                m.winnerId === m.participant2Id && 'font-black text-emerald-700'
                              )}
                            >
                              {t2 && t2 !== '—' ? (
                                t2
                              ) : (
                                <div className="border-b border-dotted border-slate-300 h-2.5 my-1" />
                              )}
                            </td>
                            <td className="p-1.5 border-r border-slate-200 font-bold text-slate-900">
                              {m.winnerId && win !== '—' ? (
                                win
                              ) : (
                                <div className="border-b border-dotted border-slate-300 h-2.5 my-1" />
                              )}
                            </td>
                            <td className="p-1.5 text-center">
                              <span
                                className={cn(
                                  'rounded px-1.5 py-0.5 text-[8.5px] font-bold uppercase',
                                  isDone
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-100 text-slate-600'
                                )}
                              >
                                {m.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {format === 'HEAT_ELIMINATION' && heatBracket && (
              <div className="w-full overflow-hidden rounded-lg border border-slate-300">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                      <th className="p-1.5 border-r border-slate-300">Babak</th>
                      <th className="p-1.5 border-r border-slate-300 w-20 text-center">Sesi</th>
                      <th className="p-1.5 border-r border-slate-300">
                        Daftar Peserta &amp; Peringkat
                      </th>
                      <th className="p-1.5 border-r border-slate-300">Tim Lolos Kualifikasi</th>
                      <th className="p-1.5 text-center w-20">Status Sesi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {heatBracket.stages.flatMap((st, sIdx) => {
                      const prevStage = sIdx > 0 ? heatBracket.stages[sIdx - 1] : null;
                      const stageSessions = getPrintSessionsForStage(st, prevStage);
                      const stageDistribution = getStagePlaceholderDistribution(
                        st,
                        prevStage,
                        stageSessions.length
                      );

                      return stageSessions.map(({ session, isPlaceholder }, sessIdx) => {
                        const isDone = session.status === 'COMPLETED';
                        const qualifiers = session.results
                          .filter((r) => r.resultStatus === 'QUALIFIED')
                          .map((r) => getTeamName(combinedTeams, r.participantId));
                        const placeholderOrigins = stageDistribution[sessIdx] ?? [];

                        return (
                          <tr
                            key={session.id}
                            className="border-b border-slate-200 hover:bg-slate-50 text-[10.5px]"
                          >
                            <td className="p-1.5 border-r border-slate-200 font-bold">{st.name}</td>
                            <td className="p-1.5 border-r border-slate-200 text-center font-mono font-bold">
                              {session.name || `Sesi ${session.sessionNumber}`}
                            </td>
                            <td className="p-1.5 border-r border-slate-200">
                              <div className="space-y-1">
                                {session.participants.map((p) => {
                                  const res = session.results.find(
                                    (r) => r.participantId === p.participantId
                                  );
                                  return (
                                    <div
                                      key={p.participantId}
                                      className="flex items-center gap-1.5 text-[10px]"
                                    >
                                      <span className="font-mono text-slate-500 font-bold">
                                        {res?.rank ? `#${res.rank}` : '·'}
                                      </span>
                                      <span
                                        className={cn(
                                          res?.resultStatus === 'QUALIFIED'
                                            ? 'font-black text-emerald-800'
                                            : 'text-slate-800'
                                        )}
                                      >
                                        {getTeamName(combinedTeams, p.participantId)}
                                      </span>
                                      {res?.score !== null && res?.score !== undefined && (
                                        <span className="text-[9px] text-slate-500">
                                          (Skor: {res.score})
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                                {session.participants.length === 0 && (
                                  <div className="space-y-1 py-0.5">
                                    {placeholderOrigins.map((_, pIdx) => (
                                      <div
                                        key={`tbl-ph-${session.id}-${pIdx}`}
                                        className="flex items-center gap-2 text-[10px] text-slate-400"
                                      >
                                        <span className="font-mono font-bold shrink-0">
                                          #{pIdx + 1}
                                        </span>
                                        <div className="flex-1 border-b border-dotted border-slate-300 h-2" />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-1.5 border-r border-slate-200 font-semibold text-emerald-800">
                              {qualifiers.length > 0 ? (
                                qualifiers.join(', ')
                              ) : (
                                <div className="border-b border-dotted border-slate-300 h-2.5 my-1" />
                              )}
                            </td>
                            <td className="p-1.5 text-center">
                              <span
                                className={cn(
                                  'rounded px-1.5 py-0.5 text-[8.5px] font-bold uppercase',
                                  isPlaceholder
                                    ? 'bg-slate-100 text-slate-500'
                                    : isDone
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                )}
                              >
                                {isPlaceholder ? 'Menunggu' : session.status}
                              </span>
                            </td>
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>

      {/* ─── 5. LEMBAR TANDA TANGAN PENGESAHAN (SIGNATURE BLOCK) ─── */}
      {showSignatures && (
        <footer className="print-include print:!block pt-4 border-t border-slate-300 print:break-inside-avoid">
          <div className="grid grid-cols-3 gap-6 text-center text-xs">
            <div className="space-y-10">
              <p className="font-bold text-slate-700">Koordinator Lapangan</p>
              <div className="border-b border-slate-400 w-32 mx-auto" />
              <p className="text-[9.5px] text-slate-500">( Nama &amp; Tanda Tangan )</p>
            </div>

            <div className="space-y-10">
              <p className="font-bold text-slate-700">Wasit / Juri Utama</p>
              <div className="border-b border-slate-400 w-32 mx-auto" />
              <p className="text-[9.5px] text-slate-500">( Nama &amp; Tanda Tangan )</p>
            </div>

            <div className="space-y-10">
              <p className="font-bold text-slate-700">Ketua Panitia HUT RI-81</p>
              <div className="border-b border-slate-400 w-32 mx-auto" />
              <p className="text-[9.5px] text-slate-500">( Nama &amp; Tanda Tangan )</p>
            </div>
          </div>

          <p className="text-center text-[8.5px] text-slate-400 mt-4 select-none font-mono">
            Dokumen ini sah dan diterbitkan secara resmi oleh Panitia HUT RI ke-81 (PT TKI × PT
            FTP).
          </p>
        </footer>
      )}
    </div>
  );
}

/**
 * Visual pohon cetak untuk Single Elimination (SingleEliminationPrintTree).
 * Menggunakan grid proporsional sesuai jumlah babak agar pas di kertas A4 tanpa overflow.
 */
function SingleEliminationPrintTree({
  bracket,
  teams,
}: {
  bracket: BracketDetailView;
  teams: Array<{ id: number; nama: string }>;
  prizes: Array<{ place: number; hadiah: string }>;
  showPrizes: boolean;
}) {
  const roundCount = Math.max(1, bracket.rounds.length);

  return (
    <div className="rounded-xl border border-slate-300 bg-slate-50/50 p-3 space-y-2.5">
      <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
        <h3 className="text-xs font-black uppercase text-slate-900 flex items-center gap-1.5">
          <Crown size={14} className="text-red-600" />
          Bagan Pohon Sistem Gugur (Single Elimination Tree)
        </h3>
        <span className="text-[9.5px] text-slate-500 font-mono">
          {bracket.rounds.length} Babak Pertandingan
        </span>
      </div>

      <div
        className="grid gap-2.5 pb-1"
        style={{
          gridTemplateColumns: `repeat(${roundCount}, minmax(0, 1fr))`,
        }}
      >
        {bracket.rounds.map((round) => (
          <div key={round.id} className="space-y-1.5 min-w-0">
            <div className="rounded-md bg-slate-200/80 px-1.5 py-1 text-center font-bold text-slate-800 text-[10px] uppercase border border-slate-300 truncate">
              {round.name}
            </div>

            <div className="space-y-1.5">
              {round.matches.map((m) => {
                const t1 = m.participant1Nama || getTeamName(teams, m.participant1Id);
                const t2 = m.participant2Nama || getTeamName(teams, m.participant2Id);
                const isWinner1 = m.winnerId !== null && m.winnerId === m.participant1Id;
                const isWinner2 = m.winnerId !== null && m.winnerId === m.participant2Id;

                return (
                  <div
                    key={m.id}
                    className="rounded-lg border border-slate-300 bg-white p-1.5 text-xs shadow-2xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[8.5px] text-slate-400 font-mono border-b border-slate-100 pb-0.5 mb-0.5">
                      <span>Match #{m.matchNumber}</span>
                      <span
                        className={cn(
                          'font-bold',
                          m.status === 'COMPLETED' ? 'text-emerald-600' : 'text-slate-500'
                        )}
                      >
                        {m.status}
                      </span>
                    </div>

                    {/* Participant 1 */}
                    <div
                      className={cn(
                        'flex items-center justify-between rounded px-1.5 py-0.5 text-[10px]',
                        isWinner1
                          ? 'bg-emerald-50 font-black text-emerald-900 border border-emerald-300'
                          : 'text-slate-800 font-medium'
                      )}
                    >
                      {t1 && t1 !== '—' ? (
                        <>
                          <span className="truncate">{t1}</span>
                          {m.winnerId === m.participant1Id && (
                            <span className="text-[8px] font-black text-emerald-700 ml-1 uppercase">
                              [W]
                            </span>
                          )}
                        </>
                      ) : (
                        <div className="flex-1 border-b border-dotted border-slate-300 h-2 my-0.5" />
                      )}
                    </div>

                    {/* Participant 2 */}
                    <div
                      className={cn(
                        'flex items-center justify-between rounded px-1.5 py-0.5 text-[10px]',
                        isWinner2
                          ? 'bg-emerald-50 font-black text-emerald-900 border border-emerald-300'
                          : 'text-slate-800 font-medium'
                      )}
                    >
                      {t2 && t2 !== '—' ? (
                        <>
                          <span className="truncate">{t2}</span>
                          {m.winnerId === m.participant2Id && (
                            <span className="text-[8px] font-black text-emerald-700 ml-1 uppercase">
                              [W]
                            </span>
                          )}
                        </>
                      ) : (
                        <div className="flex-1 border-b border-dotted border-slate-300 h-2 my-0.5" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Visual kolom cetak untuk Heat Elimination (HeatEliminationPrintTree).
 * Menggunakan grid proporsional sesuai jumlah stage agar pas di kertas A4 tanpa overflow.
 */
function HeatEliminationPrintTree({
  bracket,
  teams,
}: {
  bracket: HeatDetailView;
  teams: Array<{ id: number; nama: string }>;
  prizes: Array<{ place: number; hadiah: string }>;
  showPrizes: boolean;
}) {
  const stageCount = Math.max(1, bracket.stages.length);

  return (
    <div className="rounded-xl border border-slate-300 bg-slate-50/50 p-3 space-y-2.5">
      <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
        <h3 className="text-xs font-black uppercase text-slate-900 flex items-center gap-1.5">
          <Flame size={14} className="text-red-600" />
          Alur Bagan Multi-Stage (Heat Pipeline Tree)
        </h3>
        <span className="text-[9.5px] text-slate-500 font-mono">
          {bracket.stages.length} Babak Bertingkat
        </span>
      </div>

      <div
        className="grid gap-2.5 pb-1"
        style={{
          gridTemplateColumns: `repeat(${stageCount}, minmax(0, 1fr))`,
        }}
      >
        {bracket.stages.map((stage, sIdx) => {
          const prevStage = sIdx > 0 ? bracket.stages[sIdx - 1] : null;
          const stageSessions = getPrintSessionsForStage(stage, prevStage);
          const stageDistribution = getStagePlaceholderDistribution(
            stage,
            prevStage,
            stageSessions.length
          );

          return (
            <div key={stage.id} className="space-y-2 min-w-0">
              {/* Stage Header */}
              <div className="rounded-lg bg-slate-200 border border-slate-300 p-1.5 text-center">
                <p className="font-black text-slate-900 text-[11px] uppercase truncate">
                  {stage.name}
                </p>
                <p className="text-[8.5px] text-slate-600 font-medium truncate flex items-center justify-center gap-0.5">
                  {stage.isFinal ? (
                    <span className="inline-flex items-center gap-1">
                      <Trophy size={9} className="text-amber-600" /> Babak Final
                    </span>
                  ) : (
                    `Top ${stage.qualifiersPerSession}/sesi lolos`
                  )}
                </p>
              </div>

              {/* Sessions List (Termasuk Card Sesi Placeholder Saat Menunggu) */}
              <div className="space-y-1.5">
                {stageSessions.map(({ session, isPlaceholder }, sessIdx) => {
                  const isCompleted = session.status === 'COMPLETED';
                  const placeholderOrigins = stageDistribution[sessIdx] ?? [];

                  return (
                    <div
                      key={session.id}
                      className={cn(
                        'rounded-lg border p-2 text-xs shadow-2xs space-y-1',
                        isPlaceholder
                          ? 'border-dashed border-slate-300 bg-slate-50/70'
                          : 'border-slate-300 bg-white'
                      )}
                    >
                      <div className="flex items-center justify-between text-[8.5px] border-b border-slate-100 pb-0.5 mb-0.5 font-mono">
                        <strong className="text-slate-800 uppercase truncate">
                          {session.name || `Sesi ${session.sessionNumber}`}
                        </strong>
                        <span
                          className={cn(
                            'font-bold shrink-0 ml-1',
                            isCompleted ? 'text-emerald-600' : 'text-slate-500'
                          )}
                        >
                          {isPlaceholder ? 'Menunggu' : isCompleted ? 'Selesai' : 'Menunggu'}
                        </span>
                      </div>

                      {/* Real Participants */}
                      {session.participants.map((p) => {
                        const res = session.results.find(
                          (r) => r.participantId === p.participantId
                        );
                        const isQual = res?.resultStatus === 'QUALIFIED';
                        const rank = res?.rank;

                        return (
                          <div
                            key={p.participantId}
                            className={cn(
                              'flex items-center justify-between rounded px-1.5 py-0.5 text-[10px]',
                              isQual
                                ? 'bg-emerald-50 text-emerald-950 font-black border border-emerald-300'
                                : 'bg-slate-50 text-slate-800 font-medium'
                            )}
                          >
                            <span className="truncate">
                              {rank ? `#${rank} ` : ''}
                              {getTeamName(teams, p.participantId)}
                            </span>
                            {isQual && (
                              <span className="text-[7.5px] font-black uppercase text-emerald-700 bg-emerald-100 px-1 rounded shrink-0 ml-1">
                                Lolos
                              </span>
                            )}
                          </div>
                        );
                      })}

                      {/* Placeholder Slots for Pending Stage / Sesi Kosong (Garis kosong untuk tulis manual) */}
                      {session.participants.length === 0 &&
                        placeholderOrigins.map((_, pIdx) => (
                          <div
                            key={`ph-${session.id}-${pIdx}`}
                            className="flex items-center gap-1.5 rounded border border-dashed border-slate-300 bg-white/60 px-1.5 py-1 min-h-[24px]"
                          >
                            <span className="text-[9px] font-mono text-slate-400 font-bold shrink-0">
                              #{pIdx + 1}
                            </span>
                            <div className="flex-1 border-b border-dotted border-slate-300 h-2" />
                          </div>
                        ))}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
