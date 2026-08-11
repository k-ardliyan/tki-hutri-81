/**
 * scoring.ts — pure scoring module untuk audit 5R.
 *
 * MODUL INI SENGAJA TERPISAH & MURNI:
 * - Tidak import React, server, DB, localStorage, atau apa pun dari luar.
 * - Hanya menerima definisi form + submission, mengembalikan angka.
 * - Rumus penilaian ADIL: tiap kategori (R) dinormalisasi ke persen 0-100,
 *   lalu final = rata-rata persen 5 kategori. Dengan ini form dengan jumlah
 *   kriteria berbeda (29/28/30) tetap bisa dibandingkan adil, dan ruangan
 *   dengan beberapa penilaian bisa dirata-ratakan.
 *
 * Karena dipisah, modul ini tetap aman saat migrasi DB — isi handler
 * server berubah, rumus tidak.
 */
import type { FiveRForm, FiveRSubmission } from '../data/5r';

export interface CategoryScore {
  categoryId: string;
  label: string;
  raw: number;
  max: number;
  percent: number; // 0-100
}

export interface SubmissionScore {
  submissionId: string;
  formId: string;
  roomId: string;
  totalRaw: number;
  totalMax: number;
  categories: CategoryScore[];
  final: number; // 0-100
}

/**
 * Hitung skor satu submission terhadap definisi form.
 * Skor di luar rentang scale dianggap invalid → throw (cegah data korup).
 */
export function scoreSubmission(form: FiveRForm, sub: FiveRSubmission): SubmissionScore {
  const { min, max } = form.scale;

  const categories = form.categories.map((cat) => {
    let raw = 0;
    for (const c of cat.criteria) {
      const v = sub.answers[c.id];
      if (v === undefined || v === null) continue;
      if (v < min || v > max) {
        throw new Error(`Skor invalid untuk ${c.id}: ${v} (rentang ${min}-${max})`);
      }
      raw += v;
    }
    const catMax = cat.criteria.length * max;
    return {
      categoryId: cat.id,
      label: cat.label,
      raw,
      max: catMax,
      percent: catMax === 0 ? 0 : (raw / catMax) * 100,
    };
  });

  const totalRaw = categories.reduce((s, c) => s + c.raw, 0);
  const totalMax = categories.reduce((s, c) => s + c.max, 0);
  const final =
    categories.length === 0
      ? 0
      : form.finalMode === 'weighted'
        ? totalMax === 0
          ? 0
          : (totalRaw / totalMax) * 100
        : categories.reduce((s, c) => s + c.percent, 0) / categories.length;

  return {
    submissionId: sub.id,
    formId: sub.formId,
    roomId: sub.roomId,
    totalRaw,
    totalMax,
    categories,
    final,
  };
}

/**
 * Rata-rata skor final beberapa submission (mis. beberapa penilaian
 * untuk ruangan yang sama, atau penilaian dengan form berbeda).
 */
export function aggregateRoom(scores: SubmissionScore[]): number {
  if (scores.length === 0) return 0;
  return scores.reduce((s, x) => s + x.final, 0) / scores.length;
}

/** Bulatkan 1 desimal untuk tampilan. */
export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Gabung skor 5R + dekorasi utk total akhir lomba dekor-5r.
 * Bobot default: 5R 70% / dekorasi 30% (keputusan panitia).
 */
export function combineFinal(fiveR: number, dekorasi: number, weight5R = 0.7): number {
  return fiveR * weight5R + dekorasi * (1 - weight5R);
}
