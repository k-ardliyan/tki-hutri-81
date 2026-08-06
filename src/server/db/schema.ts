/**
 * Drizzle ORM schema — HUT RI ke-81 TKI x FTP
 * PostgreSQL (Aiven) — 15 tabel (11 existing + employees + users + snack_sessions + redemptions + five_r_submissions)
 *
 * Konvensi:
 * - snake_case naming
 * - serial (identity integer) PK
 * - text (bukan varchar) untuk konten
 * - jsonb untuk data nested (workflow, reminders, sections)
 * - cascade delete untuk relasi parent→child
 *
 * Model employee-centric:
 * - employees = master semua karyawan (nama, nip, divisi, is_snack_eligible)
 * - teams/team_members = junction: 1 employee → 1 tim (employee_id FK)
 * - users = auth DB (role: superadmin/admin/petugas/audit)
 * - snack_sessions + redemptions = anti-dup UNIQUE(employee_id, session_id)
 */
import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  jsonb,
  unique,
} from 'drizzle-orm/pg-core'

// ─── Events (1 baris — meta event) ───
export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  org: text('org').notNull(),
  year: integer('year').notNull(),
  theme: text('theme').notNull(),
  peakDateLabel: text('peak_date_label').notNull(),
  peakTimeLabel: text('peak_time_label').notNull(),
  peakTarget: timestamp('peak_target', { withTimezone: true }).notNull(),
  eventEndTarget: timestamp('event_end_target', { withTimezone: true }).notNull(),
  awardTarget: timestamp('award_target', { withTimezone: true }).notNull(),
  awardEndTarget: timestamp('award_end_target', { withTimezone: true }).notNull(),
  awardDateLabel: text('award_date_label').notNull(),
  awardNote: text('award_note').notNull(),
  tagline: text('tagline').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Room Areas (5 baris — ruangan peserta lomba dekor) ───
export const roomAreas = pgTable('room_areas', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  icon: text('icon').notNull(),
  sortOrder: integer('sort_order').notNull(),
})

// ─── Key Dates (5 baris — tanggal penting) ───
export const keyDates = pgTable('key_dates', {
  id: serial('id').primaryKey(),
  when: text('when').notNull(),
  title: text('title').notNull(),
  detail: text('detail').notNull(),
  sortOrder: integer('sort_order').notNull(),
})

// ─── Rundown Phases (5 baris — fase acara) ───
export const rundownPhases = pgTable('rundown_phases', {
  id: serial('id').primaryKey(),
  slug: text('slug').unique().notNull(),
  phase: text('phase').notNull(),
  highlight: boolean('highlight').default(false).notNull(),
  sortOrder: integer('sort_order').notNull(),
})

// ─── Rundown Items (7 baris — item per fase) ───
export const rundownItems = pgTable('rundown_items', {
  id: serial('id').primaryKey(),
  phaseId: integer('phase_id')
    .references(() => rundownPhases.id, { onDelete: 'cascade' })
    .notNull(),
  time: text('time').notNull(),
  title: text('title').notNull(),
  note: text('note').notNull(),
  sortOrder: integer('sort_order').notNull(),
})

// ─── Competitions (3 baris — meta lomba) ───
export const competitions = pgTable('competitions', {
  id: serial('id').primaryKey(),
  slug: text('slug').unique().notNull(),
  number: text('number').notNull(),
  short: text('short').notNull(),
  title: text('title').notNull(),
  category: text('category').notNull(),
  tone: text('tone').notNull(),
  imageKey: text('image_key').notNull(),
  summary: text('summary').notNull(),
  sortOrder: integer('sort_order').notNull(),
})

// ─── Competition Sections (JSONB per section) ───
export const competitionSections = pgTable('competition_sections', {
  id: serial('id').primaryKey(),
  competitionId: integer('competition_id')
    .references(() => competitions.id, { onDelete: 'cascade' })
    .notNull(),
  section: text('section').notNull(), // 'workflow' | 'forPeserta' | 'forPanitia'
  content: jsonb('content').$type<WorkflowSection | PesertaSection | PanitiaSection>().notNull(),
  sortOrder: integer('sort_order').notNull(),
})

// ─── Employees (122 baris — master semua karyawan) ───
export const employees = pgTable('employees', {
  id: serial('id').primaryKey(),
  nama: text('nama').notNull(),
  nip: text('nip').unique(),
  divisi: text('divisi'),
  isSnackEligible: boolean('is_snack_eligible').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Teams (14 baris — 8 putra, 5 putri, 1 panitia) ───
export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  kategori: text('kategori').$type<'putra' | 'putri' | 'panitia'>().notNull(),
  nomor: integer('nomor'), // panitia → NULL
  nama: text('nama').notNull(),
  kode: text('kode').unique(), // "PUTRA-1", "PUTRI-3", "PANITIA" → isi QR gelang
})

// ─── Team Members (93 baris — junction: 1 employee → 1 tim) ───
export const teamMembers = pgTable(
  'team_members',
  {
    id: serial('id').primaryKey(),
    teamId: integer('team_id')
      .references(() => teams.id, { onDelete: 'cascade' })
      .notNull(),
    employeeId: integer('employee_id')
      .references(() => employees.id, { onDelete: 'cascade' })
      .notNull(),
    sortOrder: integer('sort_order').notNull(),
  },
  (t) => [unique('team_members_team_employee').on(t.teamId, t.employeeId)],
)

// ─── Landing Highlights (4 baris) ───
export const landingHighlights = pgTable('landing_highlights', {
  id: serial('id').primaryKey(),
  label: text('label').notNull(),
  value: text('value').notNull(),
  hint: text('hint').notNull(),
  sortOrder: integer('sort_order').notNull(),
})

// ─── Event Phases (9 baris — data fase eventPhase.js) ───
export const eventPhases = pgTable('event_phases', {
  id: serial('id').primaryKey(),
  phaseKey: text('phase_key').unique().notNull(),
  badgeLabel: text('badge_label').notNull(),
  badgeColor: text('badge_color').notNull(),
  statusType: text('status_type').notNull(), // 'upcoming' | 'active' | 'live' | 'completed'
  title: text('title').notNull(),
  subtitle: text('subtitle').notNull(),
  targetDate: timestamp('target_date', { withTimezone: true }),
  targetLabel: text('target_label').notNull(),
  themeColor: text('theme_color').notNull(),
  reminders: jsonb('reminders').$type<Reminder[]>().notNull(),
  actionLabel: text('action_label').notNull(),
  actionLink: text('action_link').notNull(),
  sortOrder: integer('sort_order').notNull(),
})

// ─── Users (auth DB — role: superadmin/admin/petugas/audit) ───
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id').references(() => employees.id, { onDelete: 'set null' }),
  username: text('username').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').$type<'superadmin' | 'admin' | 'petugas' | 'audit'>().notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Snack Sessions (sesi snack, kuota di-set admin) ───
export const snackSessions = pgTable('snack_sessions', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  quota: integer('quota').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Redemptions (per-individu, anti-dup UNIQUE(employee_id, session_id)) ───
export const redemptions = pgTable(
  'redemptions',
  {
    id: serial('id').primaryKey(),
    employeeId: integer('employee_id')
      .references(() => employees.id, { onDelete: 'cascade' })
      .notNull(),
    sessionId: integer('session_id')
      .references(() => snackSessions.id, { onDelete: 'cascade' })
      .notNull(),
    claimedBy: text('claimed_by').notNull(),
    claimedAt: timestamp('claimed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique('redemptions_employee_session').on(t.employeeId, t.sessionId)],
)

// ─── Five R Submissions (5R audit — migrasi dari localStorage) ───
export const fiveRSubmissions = pgTable('five_r_submissions', {
  id: text('id').primaryKey(), // uuid dari client
  roomId: text('room_id').notNull(),
  formId: text('form_id').notNull(),
  auditor: text('auditor').notNull(),
  answers: jsonb('answers').notNull(),
  notes: jsonb('notes').notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  createdBy: text('created_by'), // username dari session login
})

// ─── TS Types for JSONB columns ───

export interface WorkflowStep {
  step: number
  title: string
  time: string
  desc: string
  icon: string
}

export interface WorkflowSection {
  headline?: never
  points?: never
  tips?: never
  checklists?: never
  tools?: never
  [key: string]: unknown
}

export interface PesertaSection {
  headline: string
  points: Array<{ title: string; text: string }>
  tips: string[]
}

export interface PanitiaSection {
  headline: string
  points: Array<{ title: string; text: string }>
  tools?: string[]
  putra?: string[]
  putri?: string[]
  checklist?: string[]
}

export interface Reminder {
  icon: string
  title: string
  text: string
}
