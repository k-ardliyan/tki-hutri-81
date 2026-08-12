/** Heat elimination domain types — Stage → Session → Participants → Results. */

export type HeatStageStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED';
export type HeatSessionStatus = 'WAITING' | 'READY' | 'COMPLETED' | 'CANCELLED';
export type HeatAdvancementMode = 'TOP_N_PER_SESSION' | 'TOP_N_OVERALL' | 'MANUAL';
export type HeatResultMode = 'MANUAL_POSITION' | 'TIME_ASC' | 'SCORE_DESC';
export type HeatSeedingMethod = 'RANDOM' | 'REGISTRATION_ORDER' | 'SEEDED_SERPENTINE' | 'MANUAL';
export type HeatResultStatus =
  | 'NORMAL'
  | 'QUALIFIED'
  | 'ELIMINATED'
  | 'WALKOVER'
  | 'DISQUALIFIED'
  | 'DNS'
  | 'DNF';
export type HeatSourceType = 'INITIAL' | 'SESSION_QUALIFIER' | 'STAGE_QUALIFIER' | 'MANUAL';

/** Konfigurasi tournament heat (dipakai saat generate, dikunci saat publish). */
export interface HeatConfig {
  teamsPerSession: number;
  qualifiersPerSession: number;
  finalSize: number;
  seedingMethod: HeatSeedingMethod;
  /** Seeding MANUAL: teamId → posisi seed 1..N. */
  manualPositions?: Map<number, number>;
  /** Assignment MANUAL: teamId → nomor sesi 1..sessionCount. */
  manualSessions?: Map<number, number>;
}

/** Satu stage hasil auto-generate (belum dipersistenkan). */
export interface AutoStage {
  stageNumber: number;
  name: string;
  teamsPerSession: number;
  advancementMode: HeatAdvancementMode;
  qualifiersPerSession: number;
  resultMode: HeatResultMode;
  isFinal: boolean;
  /** Ukuran tiap sesi (jumlah peserta per sesi), diurutkan menurun. */
  sessionSizes: number[];
}

/** Hasil mentah satu peserta dalam satu sesi (input admin). */
export interface SessionResultInput {
  participantId: number;
  rank?: number | null;
  timeMs?: number | null;
  score?: number | null;
  resultStatus?: HeatResultStatus;
}

/** Hasil terselesaikan: peringkat pasti 1..N. */
export interface ResolvedRank {
  participantId: number;
  rank: number;
}

/** Qualifier hasil penyisihan satu stage (untuk assignment stage berikutnya). */
export interface QualifiedParticipant {
  participantId: number;
  sourceRank: number;
  sourceSessionId: number | null;
}

// ─── View types (normalized getHeatBracket response, dipakai UI) ───

export interface HeatSessionResultView {
  participantId: number;
  rank: number | null;
  timeMs: number | null;
  score: number | null;
  resultStatus: HeatResultStatus;
}

export interface HeatParticipantView {
  participantId: number;
  nama: string;
  slotNumber: number;
  seed: number | null;
  sourceType: HeatSourceType;
  sourceRank: number | null;
}

export interface HeatSessionView {
  id: number;
  sessionNumber: number;
  name: string;
  status: HeatSessionStatus;
  version: number;
  participants: HeatParticipantView[];
  results: HeatSessionResultView[];
}

export interface HeatStageView {
  id: number;
  stageNumber: number;
  name: string;
  teamsPerSession: number;
  advancementMode: HeatAdvancementMode;
  qualifiersPerSession: number;
  resultMode: HeatResultMode;
  isFinal: boolean;
  status: HeatStageStatus;
  sessions: HeatSessionView[];
}

export interface HeatBracketMetaView {
  id: number;
  status: 'DRAFT' | 'PUBLISHED' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
  format: 'SINGLE_ELIMINATION' | 'HEAT_ELIMINATION';
  seedingMethod: HeatSeedingMethod;
  participantCount: number;
}

export interface HeatDetailView {
  bracket: HeatBracketMetaView;
  stages: HeatStageView[];
  podium: { rank1: number | null; rank2: number | null; rank3: number | null };
  /** Daftar nama tim peserta (untuk UI publik render podium). */
  teams: Array<{ id: number; nama: string }>;
}
