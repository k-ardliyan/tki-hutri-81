/**
 * HeatTournamentView — UI admin utk format HEAT_ELIMINATION.
 *
 * Setup: pilih konfigurasi (tim/sesi, lolos/sesi, final, seeding) ➔ Visual Stage Preview ➔ Generate.
 * Runtime: Stage Navigation Tabs (dgn counter selesai) ➔ Kartu Sesi (Input Hasil / Koreksi) ➔
 * Finalisasi Stage ➔ Stage berikutnya ACTIVE ➔ Final ➔ Podium & Hadiah Juara.
 * Sepenuhnya responsif & ramah tema gelap/terang.
 */
import {
  AlertCircle,
  Award,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Crown,
  Dices,
  Flame,
  GitMerge,
  HelpCircle,
  Info,
  Layers,
  ListOrdered,
  Medal,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Target,
  Timer,
  Trash2,
  Trophy,
  UserX,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type {
  HeatDetailView,
  HeatResultMode,
  HeatResultStatus,
  HeatSeedingMethod,
  HeatSessionView,
  HeatStageView,
} from '../../lib/tournament/heat-elimination';
import { autoGenerateStages, validateHeatConfig } from '../../lib/tournament/heat-elimination';
import { deleteBracket, deletePrize, getPrizes, upsertPrize } from '../../server/functions/bracket';
import {
  correctSessionResult,
  finalizeStage,
  generateHeatBracket,
  publishHeatBracket,
  regenerateHeatBracket,
  resetStageResults,
  submitSessionResult,
} from '../../server/functions/bracket-heat';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { ResponsiveDialog } from '../ui/responsive-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { HeatGuide } from './HeatGuide';

interface Comp {
  id: number;
  slug: string;
  short: string;
  title: string;
}

type Kategori = 'putra' | 'putri';

interface Props {
  comp: Comp;
  kategori: Kategori;
  teams: Array<{ id: number; nama: string }>;
  detail: HeatDetailView | null;
  loading: boolean;
  onReload: () => void;
}

const STAGE_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Menunggu',
  ACTIVE: 'Aktif',
  COMPLETED: 'Selesai',
};

const BRACKET_STATUS_CONFIG: Record<string, { label: string; style: string }> = {
  DRAFT: {
    label: 'Draft',
    style: 'bg-muted text-muted-foreground border-border',
  },
  PUBLISHED: {
    label: 'Diterbitkan',
    style: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
  },
  IN_PROGRESS: {
    label: 'Sedang Berlangsung',
    style: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  },
  COMPLETED: {
    label: 'Selesai',
    style: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
  },
  ARCHIVED: {
    label: 'Arsip',
    style: 'bg-muted text-muted-foreground border-border',
  },
};

function errMsg(e: unknown, fallback: string): string {
  const m = e instanceof Error ? e.message : '';
  return m || fallback;
}

function nama(teams: Array<{ id: number; nama: string }>, id: number | null): string {
  if (id === null) return '—';
  return teams.find((t) => t.id === id)?.nama ?? `Tim ${id}`;
}

/** Status yang berarti peserta gugur/tidak hadir (tanpa peringkat). */
const NON_QUALIFIABLE: ReadonlySet<string> = new Set(['DISQUALIFIED', 'DNS', 'DNF', 'WALKOVER']);

const STATUS_LABEL: Record<string, string> = {
  DNS: 'Tidak Hadir',
  DSQ: 'Diskualifikasi',
  DNF: 'Tidak Finish',
  WALKOVER: 'WO',
};

/** Preview struktur dari config sebelum digenerate */
function usePreview(
  teamsPerSession: number,
  qualifiers: number,
  finalSize: number,
  participantCount: number
) {
  return useMemo(() => {
    try {
      return autoGenerateStages({
        participantCount,
        teamsPerSession,
        qualifiersPerSession: qualifiers,
        finalSize,
      });
    } catch {
      return null;
    }
  }, [teamsPerSession, qualifiers, finalSize, participantCount]);
}

export function HeatTournamentView({ comp, kategori, teams, detail, loading, onReload }: Props) {
  const [busy, setBusy] = useState<string | null>(null);

  // ─── Setup state ───
  const [setupTeamsPerSession, setSetupTeamsPerSession] = useState('4');
  const [setupQualifiers, setSetupQualifiers] = useState('2');
  const [setupFinalSize, setSetupFinalSize] = useState('4');
  const [setupSeeding, setSetupSeeding] = useState<HeatSeedingMethod>('RANDOM');
  const [setupResultMode, setSetupResultMode] = useState<HeatResultMode>('MANUAL_POSITION');
  const [manualSessions, setManualSessions] = useState<Record<number, string>>({});

  const handleTeamsPerSessionChange = (v: string) => {
    setSetupTeamsPerSession(v);
    const t = Number(v);
    if (!Number.isInteger(t) || t < 2) return;
    setSetupQualifiers(String(Math.min(2, t - 1)));
    setSetupFinalSize(String(Math.max(2, Math.min(4, t))));
  };

  // ─── Runtime state ───
  const [activeStageIdx, setActiveStageIdx] = useState(0);
  const [resultTarget, setResultTarget] = useState<HeatSessionView | null>(null);
  const [resultRanks, setResultRanks] = useState<Record<number, string>>({});
  /** Peserta tanpa peringkat karena gugur/tidak hadir: participantId → status. */
  const [resultStatus, setResultStatus] = useState<Record<number, HeatResultStatus>>({});
  const [correctTarget, setCorrectTarget] = useState<HeatSessionView | null>(null);
  const [correctRanks, setCorrectRanks] = useState<Record<number, string>>({});
  const [correctStatus, setCorrectStatus] = useState<Record<number, HeatResultStatus>>({});
  const [correctReason, setCorrectReason] = useState('');
  const [correctInvalidate, setCorrectInvalidate] = useState(false);
  const [correctBlockMsg, setCorrectBlockMsg] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    key: string;
    title: string;
    desc: string;
    run: () => Promise<void>;
  } | null>(null);
  const [prizes, setPrizes] = useState<Array<{ place: number; hadiah: string }>>([]);

  const participantCount = teams.length;
  const preview = usePreview(
    Number(setupTeamsPerSession) || 0,
    Number(setupQualifiers) || 0,
    Number(setupFinalSize) || 0,
    participantCount
  );
  const validation = useMemo(
    () =>
      validateHeatConfig({
        participantCount,
        teamsPerSession: Number(setupTeamsPerSession) || 0,
        qualifiersPerSession: Number(setupQualifiers) || 0,
        finalSize: Number(setupFinalSize) || 0,
      }),
    [participantCount, setupTeamsPerSession, setupQualifiers, setupFinalSize]
  );

  const previewSessionCount = preview?.[0]?.sessionSizes.length ?? 0;

  const loadPrizes = useCallback(async () => {
    try {
      setPrizes(await getPrizes({ data: { competitionId: comp.id, kategori } }));
    } catch (e) {
      toast.error(errMsg(e, 'Gagal memuat hadiah'));
    }
  }, [comp.id, kategori]);

  useEffect(() => {
    if (detail) void loadPrizes();
  }, [detail, loadPrizes]);

  // Pastikan activeStageIdx valid
  useEffect(() => {
    if (detail && activeStageIdx >= detail.stages.length) {
      setActiveStageIdx(0);
    }
  }, [detail, activeStageIdx]);

  const run = (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    void fn()
      .catch((e) => toast.error(errMsg(e, 'Aksi gagal')))
      .finally(() => setBusy(null));
  };

  const reload = async () => {
    await onReload();
  };

  // ─── Setup Actions ───
  const doGenerate = async () => {
    setBusy('generate');
    try {
      const manual =
        setupSeeding === 'MANUAL'
          ? Object.fromEntries(
              Object.entries(manualSessions)
                .filter(([, v]) => v !== '')
                .map(([k, v]) => [k, Number(v)])
            )
          : undefined;
      await generateHeatBracket({
        data: {
          competitionId: comp.id,
          kategori,
          config: {
            participantCount,
            teamsPerSession: Number(setupTeamsPerSession),
            qualifiersPerSession: Number(setupQualifiers),
            finalSize: Number(setupFinalSize),
          },
          seedingMethod: setupSeeding,
          manualSessions: manual,
        },
      });
      toast.success('Bagan heat berhasil dibuat (draft). Periksa lalu terbitkan (publish).');
      await reload();
    } catch (e) {
      toast.error(errMsg(e, 'Gagal membuat bagan'));
    } finally {
      setBusy(null);
    }
  };

  const doPublish = async () => {
    if (!detail) return;
    setBusy('publish');
    try {
      await publishHeatBracket({ data: { bracketId: detail.bracket.id } });
      toast.success('Bagan berhasil dipublish! Struktur terkunci dan siap dimainkan.');
      await reload();
    } catch (e) {
      toast.error(errMsg(e, 'Gagal publish'));
    } finally {
      setBusy(null);
    }
  };

  const doRegenerate = async () => {
    setBusy('regenerate');
    try {
      await regenerateHeatBracket({
        data: { competitionId: comp.id, kategori },
      });
      toast.success('Bagan berhasil diundi ulang');
      await reload();
    } catch (e) {
      toast.error(errMsg(e, 'Gagal acak ulang'));
    } finally {
      setBusy(null);
    }
  };

  const doDelete = async () => {
    if (!detail) return;
    setBusy('delete');
    try {
      await deleteBracket({ data: { bracketId: detail.bracket.id } });
      toast.success('Bagan berhasil dihapus');
      await reload();
    } catch (e) {
      toast.error(errMsg(e, 'Gagal hapus'));
    } finally {
      setBusy(null);
    }
  };

  // ─── Result Submit ───
  const openResult = (session: HeatSessionView) => {
    setResultTarget(session);
    const initRanks: Record<number, string> = {};
    const initStatus: Record<number, HeatResultStatus> = {};
    for (const p of session.participants) {
      const prev = session.results.find((r) => r.participantId === p.participantId);
      if (prev?.resultStatus && NON_QUALIFIABLE.has(prev.resultStatus)) {
        initStatus[p.participantId] = prev.resultStatus as HeatResultStatus;
      } else {
        initRanks[p.participantId] = prev?.rank != null ? String(prev.rank) : '';
      }
    }
    setResultRanks(initRanks);
    setResultStatus(initStatus);
  };

  const submitResult = async () => {
    if (!resultTarget) return;
    const results: Array<{
      participantId: number;
      rank?: number;
      resultStatus?: HeatResultStatus;
    }> = [];
    for (const p of resultTarget.participants) {
      const status = resultStatus[p.participantId];
      if (status && NON_QUALIFIABLE.has(status)) {
        results.push({ participantId: p.participantId, resultStatus: status });
        continue;
      }
      const v = resultRanks[p.participantId];
      if (!v || v === '') {
        toast.error('Harap isi peringkat semua peserta, atau tandai yang tidak hadir/gugur');
        return;
      }
      results.push({ participantId: p.participantId, rank: Number(v) });
    }

    // Validasi tidak ada ranking dobel (hanya peserta ber-rank)
    const rankValues = results.filter((r) => r.rank != null).map((r) => r.rank as number);
    if (new Set(rankValues).size !== rankValues.length) {
      toast.error('Peringkat tidak boleh kembar antar peserta dalam sesi yang sama');
      return;
    }

    setBusy('result');
    try {
      await submitSessionResult({
        data: {
          sessionId: resultTarget.id,
          expectedVersion: resultTarget.version,
          results,
        },
      });
      toast.success('Hasil sesi berhasil disimpan');
      setResultTarget(null);
      await reload();
    } catch (e) {
      toast.error(errMsg(e, 'Gagal menyimpan hasil'));
    } finally {
      setBusy(null);
    }
  };

  // ─── Correction ───
  const openCorrect = (session: HeatSessionView) => {
    setCorrectTarget(session);
    const initRanks: Record<number, string> = {};
    const initStatus: Record<number, HeatResultStatus> = {};
    for (const p of session.participants) {
      const prev = session.results.find((r) => r.participantId === p.participantId);
      if (prev?.resultStatus && NON_QUALIFIABLE.has(prev.resultStatus)) {
        initStatus[p.participantId] = prev.resultStatus as HeatResultStatus;
      } else {
        initRanks[p.participantId] = prev?.rank != null ? String(prev.rank) : '';
      }
    }
    setCorrectRanks(initRanks);
    setCorrectStatus(initStatus);
    setCorrectReason('');
    setCorrectInvalidate(false);
    setCorrectBlockMsg(null);
  };

  const submitCorrect = async () => {
    if (!correctTarget) return;
    const results: Array<{
      participantId: number;
      rank?: number;
      resultStatus?: HeatResultStatus;
    }> = [];
    for (const p of correctTarget.participants) {
      const status = correctStatus[p.participantId];
      if (status && NON_QUALIFIABLE.has(status)) {
        results.push({ participantId: p.participantId, resultStatus: status });
        continue;
      }
      const v = correctRanks[p.participantId];
      if (!v || v === '') {
        toast.error('Harap isi peringkat semua peserta, atau tandai yang tidak hadir/gugur');
        return;
      }
      results.push({ participantId: p.participantId, rank: Number(v) });
    }

    const rankValues = results.filter((r) => r.rank != null).map((r) => r.rank as number);
    if (new Set(rankValues).size !== rankValues.length) {
      toast.error('Peringkat tidak boleh kembar');
      return;
    }

    setBusy('correct');
    try {
      const res = await correctSessionResult({
        data: {
          sessionId: correctTarget.id,
          reason: correctReason || null,
          invalidateDownstream: correctInvalidate,
          results,
        },
      });
      toast.success(
        res.invalidated > 0
          ? `Koreksi disimpan. ${res.invalidated} hasil sesi berikutnya dibatalkan.`
          : 'Koreksi hasil sesi disimpan'
      );
      setCorrectTarget(null);
      await reload();
    } catch (e) {
      const msg = errMsg(e, 'Gagal mengoreksi hasil');
      if (msg.includes('Konfirmasi invalidate') || msg.includes('membatalkan')) {
        setCorrectBlockMsg(msg);
        setCorrectInvalidate(true);
      } else {
        toast.error(msg);
      }
    } finally {
      setBusy(null);
    }
  };

  const doFinalize = async (stage: HeatStageView) => {
    setBusy(`finalize-${stage.id}`);
    try {
      const res = await finalizeStage({ data: { stageId: stage.id } });
      if (res.isFinal) toast.success('Babak Final selesai! Pemenang podium telah ditentukan.');
      else
        toast.success(
          `Babak ${stage.name} difinalisasi. ${res.qualifierCount} peserta melaju ke babak berikutnya.`
        );
      await reload();
    } catch (e) {
      toast.error(errMsg(e, 'Gagal finalisasi babak'));
    } finally {
      setBusy(null);
    }
  };

  const doResetStage = async (stage: HeatStageView) => {
    setBusy(`reset-${stage.id}`);
    try {
      await resetStageResults({ data: { stageId: stage.id } });
      toast.success('Hasil babak ini berhasil direset');
      await reload();
    } catch (e) {
      toast.error(errMsg(e, 'Gagal reset babak'));
    } finally {
      setBusy(null);
    }
  };

  if (loading && !detail) {
    return (
      <Card className="rounded-3xl border border-border bg-card shadow-xs">
        <CardContent className="p-12 text-center text-sm font-bold text-muted-foreground animate-pulse">
          Memuat data bagan sistem sesi...
        </CardContent>
      </Card>
    );
  }

  const isDraft = detail?.bracket.status === 'DRAFT';

  // ══════════════════════════════════════════════════════════════════════
  // SETUP MODE: Belum ada bracket dibuat
  // ══════════════════════════════════════════════════════════════════════
  if (!detail) {
    const stageCount = preview?.length ?? 0;
    return (
      <Card className="rounded-3xl border border-border bg-card shadow-xs">
        <CardContent className="space-y-5 p-5 sm:p-7">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-red/10 text-brand-red">
                <Layers size={20} />
              </span>
              <div>
                <h3 className="font-heading text-base sm:text-lg font-black text-foreground">
                  Setup Bagan — Sistem Sesi (Heat)
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {comp.title} · Kategori {kategori === 'putra' ? 'Putra' : 'Putri'} ·{' '}
                  <span className="font-bold text-foreground">
                    {participantCount} tim terdaftar
                  </span>
                </p>
              </div>
            </div>
            <HeatGuide status="setup" />
          </div>

          {/* Konfigurasi Input Grid */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5 rounded-2xl border border-border/80 bg-muted/20 p-3.5">
              <span className="text-xs font-black uppercase tracking-wider text-foreground">
                Tim Maksimum / Sesi
              </span>
              <Input
                type="number"
                min={2}
                max={participantCount}
                value={setupTeamsPerSession}
                onChange={(e) => handleTeamsPerSessionChange(e.target.value)}
                className={`h-9 rounded-xl font-bold ${
                  Number(setupTeamsPerSession) > participantCount
                    ? 'border-destructive focus-visible:ring-destructive/40'
                    : ''
                }`}
                aria-invalid={Number(setupTeamsPerSession) > participantCount}
              />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Kapasitas maksimum tiap sesi (contoh: 4 tim bertanding bareng).
              </p>
            </div>

            <div className="space-y-1.5 rounded-2xl border border-border/80 bg-muted/20 p-3.5">
              <span className="text-xs font-black uppercase tracking-wider text-foreground">
                Tim Lolos / Sesi
              </span>
              <Input
                type="number"
                min={1}
                max={Math.max(1, Number(setupTeamsPerSession) - 1)}
                value={setupQualifiers}
                onChange={(e) => setSetupQualifiers(e.target.value)}
                className={`h-9 rounded-xl font-bold ${
                  Number(setupQualifiers) >= Number(setupTeamsPerSession)
                    ? 'border-destructive focus-visible:ring-destructive/40'
                    : ''
                }`}
                aria-invalid={Number(setupQualifiers) >= Number(setupTeamsPerSession)}
              />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Peringkat terbaik yang berhak lanjut ke babak berikutnya.
              </p>
            </div>

            <div className="space-y-1.5 rounded-2xl border border-border/80 bg-muted/20 p-3.5">
              <span className="text-xs font-black uppercase tracking-wider text-foreground">
                Ukuran Babak Final (Tim)
              </span>
              <Input
                type="number"
                min={2}
                max={participantCount}
                value={setupFinalSize}
                onChange={(e) => setSetupFinalSize(e.target.value)}
                className={`h-9 rounded-xl font-bold ${
                  Number(setupFinalSize) < 2 || Number(setupFinalSize) > participantCount
                    ? 'border-destructive focus-visible:ring-destructive/40'
                    : ''
                }`}
                aria-invalid={
                  Number(setupFinalSize) < 2 || Number(setupFinalSize) > participantCount
                }
              />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Batas jumlah tim di babak final penentuan podium juara.
              </p>
            </div>
          </div>

          {/* Seeding & Mode Input Hasil */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 rounded-2xl border border-border/80 bg-muted/20 p-3.5">
              <span className="text-xs font-black uppercase tracking-wider text-foreground">
                Metode Pembagian Sesi (Seeding)
              </span>
              <Select
                value={setupSeeding}
                onValueChange={(v) => setSetupSeeding(v as HeatSeedingMethod)}
              >
                <SelectTrigger className="w-full rounded-xl font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RANDOM">
                    <div className="flex items-center gap-2">
                      <Dices size={14} className="text-muted-foreground" />
                      <span>Acak (Undian Otomatis)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="REGISTRATION_ORDER">
                    <div className="flex items-center gap-2">
                      <ListOrdered size={14} className="text-muted-foreground" />
                      <span>Urutan Pendaftaran</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="SEEDED_SERPENTINE">
                    <div className="flex items-center gap-2">
                      <GitMerge size={14} className="text-muted-foreground" />
                      <span>Serpentine (Sebar Unggulan)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="MANUAL">
                    <div className="flex items-center gap-2">
                      <Pencil size={14} className="text-muted-foreground" />
                      <span>Manual (Tentukan Nomor Sesi)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Cara peserta didistribusikan ke dalam sesi pada Babak 1.
              </p>
            </div>

            <div className="space-y-1.5 rounded-2xl border border-border/80 bg-muted/20 p-3.5">
              <span className="text-xs font-black uppercase tracking-wider text-foreground">
                Mode Input Hasil
              </span>
              <Select
                value={setupResultMode}
                onValueChange={(v) => setSetupResultMode(v as HeatResultMode)}
              >
                <SelectTrigger className="w-full rounded-xl font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL_POSITION">
                    <div className="flex items-center gap-2">
                      <Medal size={14} className="text-muted-foreground" />
                      <span>Input Peringkat Langsung (1, 2, 3...)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="TIME_ASC">
                    <div className="flex items-center gap-2">
                      <Timer size={14} className="text-muted-foreground" />
                      <span>Input Waktu (Tercepat Menang)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="SCORE_DESC">
                    <div className="flex items-center gap-2">
                      <Target size={14} className="text-muted-foreground" />
                      <span>Input Poin/Skor (Tertinggi Menang)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Metode juri/panitia memasukkan data hasil pertandingan di lapangan.
              </p>
            </div>
          </div>

          {/* Manual Seeding Table (Bila dipilih MANUAL) */}
          {setupSeeding === 'MANUAL' && (
            <div className="space-y-3 rounded-2xl border border-brand-red/30 bg-brand-red/5 p-4">
              <div className="flex items-center justify-between gap-2 border-b border-brand-red/20 pb-2">
                <p className="text-xs font-black uppercase tracking-wider text-foreground">
                  Penempatan Sesi Manual (Babak 1, {previewSessionCount} Sesi)
                </p>
                <span className="text-[11px] font-bold text-brand-red">
                  Isi angka 1 sampai {previewSessionCount}
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {teams.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-2 rounded-xl bg-card p-2 border border-border"
                  >
                    <span className="min-w-0 flex-1 truncate text-xs font-bold text-foreground">
                      {t.nama}
                    </span>
                    <Input
                      type="number"
                      min={1}
                      max={previewSessionCount || 1}
                      value={manualSessions[t.id] ?? ''}
                      onChange={(e) =>
                        setManualSessions((prev) => ({ ...prev, [t.id]: e.target.value }))
                      }
                      className="h-8 w-20 rounded-lg text-center text-xs font-black"
                      placeholder="Sesi #"
                      aria-label={`Sesi ${t.nama}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Visual Stage Flow Preview */}
          {preview && (
            <div className="space-y-3 rounded-2xl border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-black uppercase tracking-wider text-foreground">
                  Visualisasi Alur Babak Pertandingan ({stageCount} Babak)
                </p>
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase">
                  Simulasi Otomatis
                </span>
              </div>

              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                {preview.map((s, idx) => {
                  const totalStageParticipants = s.sessionSizes.reduce((a, b) => a + b, 0);
                  const isLast = idx === preview.length - 1;

                  return (
                    <div key={s.stageNumber} className="flex flex-1 items-center gap-2">
                      <div className="flex-1 rounded-xl border border-border bg-card p-3 shadow-2xs">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-xs font-black text-foreground">{s.name}</span>
                          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-black text-muted-foreground">
                            {s.sessionSizes.length} Sesi
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-muted-foreground">
                          {totalStageParticipants} Tim ({s.sessionSizes.join(' + ')} tim/sesi)
                        </p>
                        {!s.isFinal && (
                          <span className="mt-1 inline-block text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                            ➔ Top {s.qualifiersPerSession} lolos/sesi
                          </span>
                        )}
                        {s.isFinal && (
                          <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                            <Trophy size={11} /> Penentuan Juara 1, 2, 3
                          </span>
                        )}
                      </div>

                      {!isLast && (
                        <ChevronRight
                          size={18}
                          className="hidden shrink-0 text-muted-foreground/50 sm:block"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {validation.warnings.length > 0 && (
                <div className="space-y-1 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
                  {validation.warnings.map((w) => (
                    <div
                      key={w}
                      className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300"
                    >
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            {!validation.ok ? (
              <div className="flex items-center gap-2 text-xs font-bold text-destructive">
                <AlertCircle size={14} />
                <span>{validation.errors[0]}</span>
              </div>
            ) : (
              <p className="text-xs font-bold text-muted-foreground">
                Siap digenerate menjadi {stageCount} babak terstruktur.
              </p>
            )}

            <Button
              onClick={() => void run('generate', doGenerate)}
              disabled={busy !== null || !validation.ok || participantCount < 2}
              className="rounded-xl font-black shadow-md"
            >
              <Plus size={16} className="mr-1.5" />
              Generate Bagan Sistem Sesi
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // RUNTIME MODE: Bracket sudah digenerate
  // ══════════════════════════════════════════════════════════════════════
  const activeStage = detail.stages[activeStageIdx] ?? detail.stages[0];
  const allSessionsDone =
    activeStage &&
    activeStage.sessions.length > 0 &&
    activeStage.sessions.every((s) => s.status === 'COMPLETED' || s.status === 'CANCELLED');
  const bracketStatusCfg =
    BRACKET_STATUS_CONFIG[detail.bracket.status] ?? BRACKET_STATUS_CONFIG.DRAFT;

  return (
    <div className="space-y-5">
      {/* ─── Header & Lifecycle Control ─── */}
      <Card className="rounded-3xl border border-border bg-card shadow-xs">
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="font-heading text-base sm:text-lg font-black text-foreground">
                  {comp.title} · Kategori {kategori === 'putra' ? 'Putra' : 'Putri'}
                </h3>
                <span
                  className={`rounded-full border px-3 py-0.5 text-[10px] font-black uppercase tracking-wider ${bracketStatusCfg.style}`}
                >
                  {bracketStatusCfg.label}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="font-bold text-foreground">
                  {detail.bracket.participantCount} peserta
                </span>{' '}
                · {detail.stages.length} babak pertandingan · Seeding{' '}
                {detail.bracket.seedingMethod === 'RANDOM'
                  ? 'Acak (Undian)'
                  : detail.bracket.seedingMethod === 'MANUAL'
                    ? 'Manual'
                    : detail.bracket.seedingMethod === 'SEEDED_SERPENTINE'
                      ? 'Serpentine'
                      : 'Urutan Daftar'}
              </p>
            </div>

            {/* Action Buttons Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <HeatGuide
                status={
                  detail.bracket.status === 'DRAFT'
                    ? 'draft'
                    : detail.bracket.status === 'COMPLETED' || detail.bracket.status === 'ARCHIVED'
                      ? 'selesai'
                      : 'berlangsung'
                }
              />

              {isDraft && (
                <Button
                  size="sm"
                  className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  onClick={() => void run('publish', doPublish)}
                  disabled={busy !== null}
                >
                  <CheckCircle2 size={14} className="mr-1.5" />
                  Publish Bagan
                </Button>
              )}

              {isDraft && (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl font-bold"
                  onClick={() => void run('regenerate', doRegenerate)}
                  disabled={busy !== null}
                >
                  <RefreshCw size={14} className="mr-1.5" />
                  Acak Ulang
                </Button>
              )}

              <Button
                size="sm"
                variant="destructive"
                className="rounded-xl font-bold"
                onClick={() =>
                  setConfirmAction({
                    key: 'delete',
                    title: 'Hapus seluruh bagan?',
                    desc: 'Seluruh struktur babak, hasil pertandingan, dan data undian sesi ini akan dihapus permanen.',
                    run: doDelete,
                  })
                }
                disabled={busy !== null}
              >
                <Trash2 size={14} className="mr-1.5" />
                Hapus Bagan
              </Button>
            </div>
          </div>

          {/* Stage Navigation Tabs with Progress Indicators */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pt-1">
            {detail.stages.map((s, i) => {
              const completedSessionsCount = s.sessions.filter(
                (sess) => sess.status === 'COMPLETED'
              ).length;
              const totalSessions = s.sessions.length;
              const isStageCompleted = s.status === 'COMPLETED';
              const isStageActive = s.status === 'ACTIVE';

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveStageIdx(i)}
                  className={`flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                    activeStageIdx === i
                      ? 'bg-brand-red text-white shadow-md shadow-red-600/25 ring-1 ring-brand-red/50'
                      : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <span>{s.name}</span>
                  {totalSessions > 0 ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-black ${
                        activeStageIdx === i
                          ? 'bg-white/20 text-white'
                          : isStageCompleted
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                            : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {completedSessionsCount}/{totalSessions} Selesai
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold text-muted-foreground">
                      Menunggu
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ─── Active Stage View ─── */}
      <Card className="rounded-3xl border border-border bg-card shadow-xs">
        <CardContent className="space-y-4 p-5 sm:p-6">
          {/* Stage Title & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-base font-black text-foreground">
                  {activeStage.name}
                </h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                    activeStage.status === 'COMPLETED'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                      : activeStage.status === 'ACTIVE'
                        ? 'bg-brand-red/10 text-brand-red border border-brand-red/30'
                        : 'bg-muted text-muted-foreground border border-border'
                  }`}
                >
                  {STAGE_STATUS_LABEL[activeStage.status]}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {activeStage.sessions.reduce((a, s) => a + s.participants.length, 0)} peserta
                terdaftar · {activeStage.sessions.length} sesi
                {!activeStage.isFinal && activeStage.qualifiersPerSession > 0 && (
                  <> · Top {activeStage.qualifiersPerSession} tim lolos per sesi</>
                )}
                {activeStage.isFinal && <> · Babak Penentuan Juara</>}
              </p>
            </div>

            {/* Finalization / Reset Stage Actions */}
            {activeStage.status === 'ACTIVE' && activeStage.sessions.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {allSessionsDone ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl font-bold"
                      onClick={() =>
                        setConfirmAction({
                          key: `reset-${activeStage.id}`,
                          title: 'Reset hasil babak ini?',
                          desc: 'Semua hasil peringkat sesi pada babak ini akan dikosongkan kembali.',
                          run: () => doResetStage(activeStage),
                        })
                      }
                      disabled={busy !== null}
                    >
                      <RotateCcw size={13} className="mr-1.5" />
                      Reset Hasil
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-xl font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                      onClick={() =>
                        void run(`finalize-${activeStage.id}`, () => doFinalize(activeStage))
                      }
                      disabled={busy !== null}
                    >
                      <CheckCircle2 size={14} className="mr-1.5" />
                      {activeStage.isFinal ? 'Selesaikan Final & Kunci Podium' : 'Finalisasi Babak'}
                    </Button>
                  </>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
                    <Info size={13} />
                    Selesaikan semua sesi untuk finalisasi babak
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Sessions List */}
          {activeStage.sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/10 py-10 text-center">
              <Clock size={24} className="text-muted-foreground/60" />
              <p className="text-xs font-bold text-muted-foreground">
                {activeStage.status === 'PENDING'
                  ? 'Menunggu finalisasi babak sebelumnya untuk mengundi peserta ke babak ini.'
                  : 'Belum ada sesi pertandingan di babak ini.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-3.5 sm:grid-cols-2">
              {activeStage.sessions.map((s) => {
                const allDone = s.status === 'COMPLETED';
                const sortedParts = [...s.participants].sort((a, b) => {
                  const ra = s.results.find((r) => r.participantId === a.participantId)?.rank;
                  const rb = s.results.find((r) => r.participantId === b.participantId)?.rank;
                  return (ra ?? 99) - (rb ?? 99);
                });

                return (
                  <div
                    key={s.id}
                    className={`rounded-2xl border p-4 transition-all ${
                      allDone
                        ? 'border-border bg-card shadow-2xs'
                        : 'border-brand-red/30 bg-card shadow-xs ring-1 ring-brand-red/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-3 border-b border-border/60 pb-2">
                      <div className="flex items-center gap-1.5">
                        <Flame
                          size={14}
                          className={allDone ? 'text-muted-foreground' : 'text-brand-red'}
                        />
                        <p className="text-xs font-black uppercase tracking-wider text-foreground">
                          {s.name}
                        </p>
                      </div>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                          allDone
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {allDone ? 'Selesai' : 'Belum Selesai'}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {sortedParts.map((p) => {
                        const res = s.results.find((r) => r.participantId === p.participantId);
                        const hasRank = res?.rank != null;
                        const rank = res?.rank;
                        const isQualified = res?.resultStatus === 'QUALIFIED';
                        const isEliminated = res?.resultStatus === 'ELIMINATED';

                        return (
                          <div
                            key={p.participantId}
                            className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs ${
                              isQualified
                                ? 'bg-emerald-500/10 border border-emerald-500/20'
                                : hasRank
                                  ? 'bg-muted/40 border border-border/50'
                                  : 'bg-muted/20'
                            }`}
                          >
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-black text-foreground">
                              {hasRank ? rank : '—'}
                            </span>
                            <span className="min-w-0 flex-1 truncate font-bold text-foreground">
                              {nama(teams, p.participantId)}
                            </span>
                            {p.sourceRank != null && p.sourceType !== 'INITIAL' && (
                              <span className="text-[9px] text-muted-foreground">
                                (Rank {p.sourceRank} babak lalu)
                              </span>
                            )}
                            {isQualified && (
                              <Badge className="bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 text-[9px] font-black uppercase">
                                Lolos
                              </Badge>
                            )}
                            {isEliminated && (
                              <span className="text-[9px] font-bold text-muted-foreground">
                                Gugur
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-3 flex justify-end gap-2 border-t border-border/60 pt-2.5">
                      {allDone ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 text-xs font-bold"
                          onClick={() => openCorrect(s)}
                        >
                          Koreksi Hasil
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="h-8 px-3 text-xs font-black shadow-xs"
                          onClick={() => openResult(s)}
                          disabled={detail.bracket.status === 'DRAFT'}
                        >
                          Input Hasil Sesi
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Celebratory Podium Section (Final Selesai) ─── */}
      {detail.podium.rank1 !== null && (
        <Card className="rounded-3xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 via-card to-card shadow-sm">
          <CardContent className="space-y-4 p-5 sm:p-7">
            <div className="flex items-center gap-2 border-b border-amber-500/20 pb-3">
              <Trophy size={18} className="text-amber-500" />
              <h3 className="font-heading text-base font-black text-foreground">
                Podium Juara Turnamen
              </h3>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  rank: 1,
                  id: detail.podium.rank1,
                  label: 'Juara 1 (Emas)',
                  cls: 'from-amber-400 to-amber-600',
                  icon: <Crown size={18} />,
                  border: 'border-amber-400 bg-amber-500/10',
                },
                {
                  rank: 2,
                  id: detail.podium.rank2,
                  label: 'Juara 2 (Perak)',
                  cls: 'from-slate-300 to-slate-500',
                  icon: <Medal size={16} />,
                  border: 'border-slate-300/40 bg-muted/20',
                },
                {
                  rank: 3,
                  id: detail.podium.rank3,
                  label: 'Juara 3 (Perunggu)',
                  cls: 'from-amber-700 to-amber-900',
                  icon: <Award size={16} />,
                  border: 'border-amber-700/40 bg-muted/20',
                },
              ].map((p) => (
                <div
                  key={p.rank}
                  className={`flex items-center gap-3 rounded-2xl border p-3.5 shadow-2xs ${p.border}`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${p.cls} text-white shadow-sm`}
                  >
                    {p.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                      {p.label}
                    </p>
                    <p className="truncate text-sm font-black text-foreground">
                      {nama(teams, p.id)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Hadiah Juara Management ─── */}
      <Card className="rounded-3xl border border-border bg-card shadow-xs">
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <h3 className="font-heading text-base font-black text-foreground">Hadiah Juara</h3>
              <p className="text-xs text-muted-foreground">
                Kelola nominal atau rincian hadiah yang tampil pada bagan dan podium.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl font-bold"
              onClick={() =>
                void run('addPrize', async () => {
                  const next = (prizes.reduce((m, p) => Math.max(m, p.place), 0) ?? 0) + 1;
                  await upsertPrize({
                    data: { competitionId: comp.id, kategori, place: next, hadiah: '' },
                  });
                  toast.success(`Baris Juara ${next} berhasil ditambahkan`);
                  await loadPrizes();
                })
              }
              disabled={busy !== null}
            >
              <Plus size={14} className="mr-1.5" />
              Tambah Baris Juara
            </Button>
          </div>

          {prizes.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-xs font-bold text-muted-foreground">
              Belum ada hadiah diatur. Klik <b>Tambah Baris Juara</b>.
            </p>
          ) : (
            <div className="space-y-2.5">
              {prizes.map((p) => {
                const winnerId =
                  p.place === 1
                    ? detail.podium.rank1
                    : p.place === 2
                      ? detail.podium.rank2
                      : p.place === 3
                        ? detail.podium.rank3
                        : null;

                return (
                  <div
                    key={p.place}
                    className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-muted/20 px-3.5 py-2.5"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-card border border-border text-xs font-black text-foreground">
                      #{p.place}
                    </span>
                    <div className="min-w-0 flex-1 basis-48">
                      <p className="text-xs font-black text-foreground">
                        Juara {p.place}
                        {winnerId !== null && (
                          <span className="ml-2 font-extrabold text-emerald-600 dark:text-emerald-400">
                            • {nama(teams, winnerId)}
                          </span>
                        )}
                      </p>
                      <Input
                        type="text"
                        key={`h-${comp.id}-${kategori}-${p.place}`}
                        defaultValue={p.hadiah}
                        onBlur={(e) => {
                          const v = e.target.value;
                          if (v === p.hadiah) return;
                          void run(`prize-${p.place}`, async () => {
                            await upsertPrize({
                              data: {
                                competitionId: comp.id,
                                kategori,
                                place: p.place,
                                hadiah: v,
                              },
                            });
                            toast.success(`Hadiah Juara ${p.place} disimpan`);
                            await loadPrizes();
                          });
                        }}
                        placeholder="Contoh: Rp 500.000 + Piala"
                        aria-label={`Hadiah Juara ${p.place}`}
                        className="mt-1 h-8 text-xs font-bold"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 rounded-xl text-destructive hover:bg-destructive/10"
                      onClick={() =>
                        void run(`delPrize-${p.place}`, async () => {
                          await deletePrize({
                            data: { competitionId: comp.id, kategori, place: p.place },
                          });
                          toast.success(`Baris Juara ${p.place} dihapus`);
                          await loadPrizes();
                        })
                      }
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Dialog Input Hasil Sesi ─── */}
      <ResponsiveDialog
        open={!!resultTarget}
        onOpenChange={(o) => {
          if (!o) setResultTarget(null);
        }}
        title="Input Hasil Peringkat Sesi"
        description={
          resultTarget ? `${resultTarget.name} — masukkan ranking peserta (1 = Juara/Terbaik)` : ''
        }
      >
        {resultTarget && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              {resultTarget.participants.map((p) => {
                const isOut = !!resultStatus[p.participantId];
                return (
                  <div
                    key={p.participantId}
                    className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-2.5"
                  >
                    <span className="min-w-0 flex-1 truncate text-xs font-bold text-foreground">
                      {nama(teams, p.participantId)}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant={isOut ? 'destructive' : 'outline'}
                      className="h-9 shrink-0 rounded-xl px-2.5 text-[11px] font-bold"
                      onClick={() =>
                        setResultStatus((prev) => {
                          const next = { ...prev };
                          if (next[p.participantId]) delete next[p.participantId];
                          else next[p.participantId] = 'DNS';
                          return next;
                        })
                      }
                      aria-pressed={isOut}
                      title="Tandai tidak hadir/gugur (tanpa peringkat)"
                    >
                      {isOut ? (
                        <>
                          <X size={12} className="mr-1" />{' '}
                          {STATUS_LABEL[resultStatus[p.participantId]] ?? 'Gugur'}
                        </>
                      ) : (
                        <>
                          <UserX size={12} className="mr-1" /> Tidak Hadir
                        </>
                      )}
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      max={resultTarget.participants.length}
                      value={isOut ? '' : (resultRanks[p.participantId] ?? '')}
                      onChange={(e) =>
                        setResultRanks((prev) => ({ ...prev, [p.participantId]: e.target.value }))
                      }
                      disabled={isOut}
                      placeholder="1..N"
                      className={`h-9 w-20 rounded-xl text-center text-xs font-black ${isOut ? 'opacity-50' : ''}`}
                      aria-label={`Peringkat ${nama(teams, p.participantId)}`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setResultTarget(null)}>
                Batal
              </Button>
              <Button
                size="sm"
                className="font-black"
                onClick={() => void submitResult()}
                disabled={resultTarget.participants.some(
                  (p) => !resultStatus[p.participantId] && !(resultRanks[p.participantId] ?? '')
                )}
                loading={busy === 'result'}
              >
                Simpan Hasil Sesi
              </Button>
            </div>
          </div>
        )}
      </ResponsiveDialog>

      {/* ─── Dialog Koreksi Hasil Sesi ─── */}
      <ResponsiveDialog
        open={!!correctTarget}
        onOpenChange={(o) => {
          if (!o) {
            setCorrectTarget(null);
            setCorrectBlockMsg(null);
          }
        }}
        title="Koreksi Hasil Sesi"
        description={correctTarget ? `${correctTarget.name} — sesi ini sudah selesai` : ''}
      >
        {correctTarget && (
          <div className="space-y-4 py-2">
            {correctBlockMsg && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs font-bold text-amber-800 dark:text-amber-300">
                <p>{correctBlockMsg}</p>
              </div>
            )}
            <div className="space-y-2">
              {correctTarget.participants.map((p) => {
                const isOut = !!correctStatus[p.participantId];
                return (
                  <div
                    key={p.participantId}
                    className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-2.5"
                  >
                    <span className="min-w-0 flex-1 truncate text-xs font-bold text-foreground">
                      {nama(teams, p.participantId)}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant={isOut ? 'destructive' : 'outline'}
                      className="h-9 shrink-0 rounded-xl px-2.5 text-[11px] font-bold"
                      onClick={() =>
                        setCorrectStatus((prev) => {
                          const next = { ...prev };
                          if (next[p.participantId]) delete next[p.participantId];
                          else next[p.participantId] = 'DNS';
                          return next;
                        })
                      }
                      aria-pressed={isOut}
                      title="Tandai tidak hadir/gugur (tanpa peringkat)"
                    >
                      {isOut ? (
                        <>
                          <X size={12} className="mr-1" />{' '}
                          {STATUS_LABEL[correctStatus[p.participantId]] ?? 'Gugur'}
                        </>
                      ) : (
                        <>
                          <UserX size={12} className="mr-1" /> Tidak Hadir
                        </>
                      )}
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      max={correctTarget.participants.length}
                      value={isOut ? '' : (correctRanks[p.participantId] ?? '')}
                      onChange={(e) =>
                        setCorrectRanks((prev) => ({ ...prev, [p.participantId]: e.target.value }))
                      }
                      disabled={isOut}
                      placeholder="1..N"
                      className={`h-9 w-20 rounded-xl text-center text-xs font-black ${isOut ? 'opacity-50' : ''}`}
                      aria-label={`Peringkat baru ${nama(teams, p.participantId)}`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                Alasan Koreksi (Opsional)
              </span>
              <Input
                type="text"
                value={correctReason}
                onChange={(e) => setCorrectReason(e.target.value)}
                placeholder="Contoh: salah input catatan juri"
                className="h-9 rounded-xl text-xs"
                aria-label="Alasan koreksi"
              />
            </div>
            {correctInvalidate && (
              <label className="flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs font-bold text-amber-800 dark:text-amber-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={correctInvalidate}
                  onChange={(e) => setCorrectInvalidate(e.target.checked)}
                  className="mt-0.5 rounded"
                />
                <span>
                  Batalkan dan hitung ulang hasil babak berikutnya yang terdampak oleh koreksi ini
                </span>
              </label>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setCorrectTarget(null)}>
                Batal
              </Button>
              <Button
                size="sm"
                variant={correctInvalidate ? 'destructive' : 'default'}
                className="font-black"
                onClick={() => void submitCorrect()}
                disabled={correctTarget.participants.some(
                  (p) => !correctStatus[p.participantId] && !(correctRanks[p.participantId] ?? '')
                )}
                loading={busy === 'correct'}
              >
                Koreksi &amp; Simpan
              </Button>
            </div>
          </div>
        )}
      </ResponsiveDialog>

      {/* ─── Konfirmasi Aksi (Alert Dialog) ─── */}
      <AlertDialog
        open={!!confirmAction}
        onOpenChange={(o) => {
          if (!o) setConfirmAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmAction?.desc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const action = confirmAction;
                setConfirmAction(null);
                if (action) run(action.key, action.run);
              }}
            >
              Lanjutkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
