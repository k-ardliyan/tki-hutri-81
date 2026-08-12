/**
 * 5R audit data types + barrel exports.
 * Definisi form adalah data statis (JSON) — bukan DB — sehingga mudah
 * divalidasi, di-version, dan tetap dipakai setelah migrasi DB nanti.
 */
export interface FiveROption {
  score: number;
  desc: string;
}

export interface FiveRCriterion {
  id: string;
  order: number;
  text: string;
  options: FiveROption[];
}

export interface FiveRCategory {
  id: string;
  label: string;
  sortOrder: number;
  criteria: FiveRCriterion[];
}

export interface FiveRForm {
  id: string;
  label: string;
  source: string;
  scale: { min: number; max: number };
  /** false = disembunyikan dari picker (data lama tetap tersimpan). */
  enabled?: boolean;
  /** 'uniform' (default) = rata-rata persen kategori; 'weighted' = totalRaw/totalMax*100. */
  finalMode?: 'uniform' | 'weighted';
  /** Label skala per nilai (fallback: 1=Tidak Ada..5=Sangat Baik). */
  scaleLabels?: Record<number, string>;
  categories: FiveRCategory[];
}

export interface FiveRRoom {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
  pic: string;
  areaType?: 'indoor' | 'outdoor';
  recommendedFormId?: string;
  areaLabel?: string;
}

export interface FiveRSubmission {
  id: string;
  roomId: string;
  formId: string;
  auditor: string;
  answers: Record<string, number>;
  notes: Record<string, string>;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  /** Minggu ke-N relatif ke start_date periode (1-based). Default 1 utk data lama. */
  weekNumber?: number;
}

import dekorasi from './forms/dekorasi.json';
import officeNonSmoking from './forms/office-non-smoking.json';
import officeSmoking from './forms/office-smoking.json';
import produksi from './forms/produksi.json';
import roomsData from './rooms.json';

export const fiveRRooms: FiveRRoom[] = roomsData.rooms as FiveRRoom[];
export const fiveRForms: FiveRForm[] = [dekorasi, officeNonSmoking, officeSmoking, produksi];

/** ID form lomba dekorasi — single source utk semua filter 5R vs dekorasi. */
export const DEKORASI_FORM_ID = 'dekorasi';

/** True bila submission utk form dekorasi (bukan 5R). */
export function isDekorasiSubmission(formId: string): boolean {
  return formId === DEKORASI_FORM_ID;
}

export function getFiveRForm(id: string): FiveRForm | undefined {
  return fiveRForms.find((f) => f.id === id);
}

export function getFiveRRoom(id: string): FiveRRoom | undefined {
  return fiveRRooms.find((r) => r.id === id);
}

/**
 * Mendapatkan ID form 5R yang direkomendasikan untuk suatu ruangan.
 * Aturan: Area Luar (outdoor / it-luar) -> office-smoking, Lainnya (indoor) -> office-non-smoking.
 */
export function getRecommendedFormId(room: FiveRRoom | string | undefined): string {
  if (!room) return 'office-non-smoking';
  const roomObj = typeof room === 'string' ? getFiveRRoom(room) : room;
  if (roomObj?.recommendedFormId) return roomObj.recommendedFormId;
  if (roomObj?.areaType === 'outdoor' || roomObj?.id === 'it-luar') return 'office-smoking';
  return 'office-non-smoking';
}

/**
 * Mengecek apakah form yang dipilih adalah form 5R yang direkomendasikan untuk ruangan tersebut.
 */
export function isRecommendedForm(room: FiveRRoom | string | undefined, formId: string): boolean {
  if (formId === DEKORASI_FORM_ID) return true; // Form dekorasi berlaku untuk semua ruangan
  return getRecommendedFormId(room) === formId;
}
