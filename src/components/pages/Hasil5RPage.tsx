/**
 * Hasil5RPage — halaman publik (read-only) hasil penilaian 5R.
 *
 * Data dari DB (getSubmissions) — bukan localStorage.
 * Design improvements:
 * - Ranking badges: gold/silver/bronze for top 3
 * - Color-coded scores: green > 80, amber 60-80, red < 60
 * - Category progress bars with semantic colors
 * - Better visual hierarchy
 */

import { useLoaderData } from '@tanstack/react-router';
import { useState } from 'react';
import type { FiveRForm, FiveRSubmission } from '../../data/5r';
import { isDekorasiSubmission } from '../../data/5r';
import { aggregateRoom, round1, scoreSubmission } from '../../lib/scoring';

export const STORAGE_KEY = 'tki5r:submissions'; // legacy localStorage key (tidak dipakai lagi untuk baca)

export function loadSubmissions(): FiveRSubmission[] {
  // Legacy: localStorage tidak lagi jadi sumber data — kosong agar UI pakai server.
  return [];
}

export default function Hasil5RPage() {
  const { rooms, forms, submissions } = useLoaderData({ from: '/5r' }) as {
    rooms: import('../../data/5r').FiveRRoom[];
    forms: import('../../data/5r').FiveRForm[];
    submissions: FiveRSubmission[];
  };
  const [subs] = useState<FiveRSubmission[]>(submissions);

  const formMap = new Map<string, FiveRForm>(forms.map((f) => [f.id, f]));

  const roomScores = rooms
    .map((room) => {
      // Peringkat 5R SAJA — skor dekorasi tidak dicampur (lomba terpisah).
      const roomSubs = subs.filter((s) => s.roomId === room.id && !isDekorasiSubmission(s.formId));
      const scores = roomSubs
        .map((s) => {
          const form = formMap.get(s.formId);
          return form ? scoreSubmission(form, s) : null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);
      const last =
        roomSubs.length > 0 ? roomSubs.reduce((a, b) => (a.createdAt > b.createdAt ? a : b)) : null;
      return { room, count: roomSubs.length, final: aggregateRoom(scores), scores, last };
    })
    .sort((a, b) => b.final - a.final);

  const hasData = subs.length > 0;

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="surface-card px-4 py-5 sm:px-7 sm:py-7">
        <p className="text-[10px] font-bold uppercase tracking-wide text-brand-red">
          Hasil Audit 5R
        </p>
        <h1
          className="mt-1 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Peringkat Kebersihan & Kerapian Ruangan
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Skor 0-100. Tiap kategori (RINGKAS-RAJIN) dinormalisasi, final = rata-rata 5 kategori.
        </p>
      </section>

      {!hasData && (
        <section className="surface-card p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <i className="fa-solid fa-chart-bar text-xl text-slate-300" />
          </div>
          <p className="mt-3 text-sm font-bold text-slate-700">Belum ada hasil penilaian</p>
          <p className="mt-1 text-xs text-slate-400">
            Panitia akan mengisi setelah audit berlangsung.
          </p>
        </section>
      )}

      {hasData &&
        roomScores.map(({ room, count, final, scores, last }, rank) => {
          const badge = rank === 0 ? 'gold' : rank === 1 ? 'silver' : rank === 2 ? 'bronze' : null;
          const scoreColor =
            final >= 80
              ? 'text-status-done'
              : final >= 60
                ? 'text-status-pending'
                : 'text-status-danger';
          return (
            <section key={room.id} className="surface-card px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {/* Ranking badge */}
                  {badge ? (
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                        badge === 'gold'
                          ? 'bg-amber-100 text-amber-700'
                          : badge === 'silver'
                            ? 'bg-slate-200 text-slate-600'
                            : 'bg-orange-100 text-orange-600'
                      }`}
                    >
                      {rank + 1}
                    </div>
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-400">
                      {rank + 1}
                    </div>
                  )}
                  <div>
                    <h2 className="font-bold text-slate-900">{room.name}</h2>
                    <p className="text-xs text-slate-500">
                      {count} penilaian
                      {last && (
                        <span className="ml-1 text-slate-400">
                          / {formatDateShort(last.createdAt)}
                          {last.auditor && ` oleh ${last.auditor}`}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-2xl font-extrabold ${scoreColor}`}>{round1(final)}</span>
                  <span className="text-xs text-slate-400"> / 100</span>
                </div>
              </div>

              {scores.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {scores[0].categories.map((cat) => {
                    const barColor =
                      cat.percent >= 80
                        ? 'bg-status-done'
                        : cat.percent >= 60
                          ? 'bg-status-pending'
                          : 'bg-status-danger';
                    return (
                      <div
                        key={cat.categoryId}
                        className="rounded-[var(--radius-md)] bg-slate-50 p-2.5"
                      >
                        <p className="text-[10px] font-bold text-slate-400">{cat.label}</p>
                        <p className="text-sm font-bold text-slate-800">
                          {round1(cat.percent)}
                          <span className="text-xs text-slate-400">%</span>
                        </p>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={`h-full rounded-full ${barColor}`}
                            style={{ width: `${Math.min(100, cat.percent)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
    </div>
  );
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
