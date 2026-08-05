/**
 * 5R audit data types + barrel exports.
 * Definisi form adalah data statis (JSON) — bukan DB — sehingga mudah
 * divalidasi, di-version, dan tetap dipakai setelah migrasi DB nanti.
 */
export interface FiveROption {
  score: number
  desc: string
}

export interface FiveRCriterion {
  id: string
  order: number
  text: string
  options: FiveROption[]
}

export interface FiveRCategory {
  id: string
  label: string
  sortOrder: number
  criteria: FiveRCriterion[]
}

export interface FiveRForm {
  id: string
  label: string
  source: string
  scale: { min: number; max: number }
  categories: FiveRCategory[]
}

export interface FiveRRoom {
  id: string
  name: string
  icon: string
  sortOrder: number
  pic: string
}

export interface FiveRSubmission {
  id: string
  roomId: string
  formId: string
  auditor: string
  answers: Record<string, number>
  notes: Record<string, string>
  submittedAt: string
  createdAt: string
  updatedAt: string
}

import roomsData from './rooms.json'
import produksi from './forms/produksi.json'
import officeNonSmoking from './forms/office-non-smoking.json'
import officeSmoking from './forms/office-smoking.json'

export const fiveRRooms: FiveRRoom[] = roomsData.rooms
export const fiveRForms: FiveRForm[] = [produksi, officeNonSmoking, officeSmoking]

export function getFiveRForm(id: string): FiveRForm | undefined {
  return fiveRForms.find((f) => f.id === id)
}

export function getFiveRRoom(id: string): FiveRRoom | undefined {
  return fiveRRooms.find((r) => r.id === id)
}
