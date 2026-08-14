import { createFileRoute } from '@tanstack/react-router';
import {
  Award,
  Ban,
  CheckCircle2,
  Crown,
  Dices,
  Layers,
  ListOrdered,
  Medal,
  MinusCircle,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Trash2,
  UserX,
  Workflow,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AdminBaganSkeleton } from '~/components/loading/skeletons';
import type { HeatDetailView } from '~/lib/tournament/heat-elimination';
import { cn } from '~/lib/utils';
import { BaganGuide } from '../../components/bagan/BaganGuide';
import { BaganPrintModal } from '../../components/bagan/BaganPrintModal';
import {
  type BracketDetailView,
  BracketTree,
  BracketTreeSkeleton,
  type MatchView,
} from '../../components/bagan/BracketTree';
import { HeatTournamentView } from '../../components/bagan/HeatTournamentView';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { PageHeader } from '../../components/ui/page-header';
import { ResponsiveDialog } from '../../components/ui/responsive-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { requireRole } from '../../lib/routeGuard';
import {
  correctMatchResult,
  deleteBracket,
  deletePrize,
  generateBracket,
  getBaganCompetitions,
  getBaganTeams,
  getBracket,
  getPrizes,
  publishBracket,
  regenerateBracket,
  resetBracketResults,
  submitMatchResult,
  upsertPrize,
} from '../../server/functions/bracket';
import { getHeatBracket } from '../../server/functions/bracket-heat';

export const Route = createFileRoute('/admin/bagan')({
  beforeLoad: () => requireRole(['superadmin', 'admin', 'petugas']),
  component: AdminBagan,
  pendingComponent: AdminBaganSkeleton,
});

type Kategori = 'putra' | 'putri';
type Seeding = 'RANDOM' | 'REGISTRATION_ORDER' | 'MANUAL';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Diterbitkan',
  IN_PROGRESS: 'Berlangsung',
  COMPLETED: 'Selesai',
  ARCHIVED: 'Arsip',
};

const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground border-border',
  PUBLISHED: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
  IN_PROGRESS: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  COMPLETED: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
  ARCHIVED: 'bg-muted text-muted-foreground border-border',
};

function errMsg(e: unknown, fallback: string): string {
  const m = e instanceof Error ? e.message : '';
  return m || fallback;
}

interface TabData {
  detail: BracketDetailView | null;
  heatDetail: HeatDetailView | null;
  prizes: Array<{ place: number; hadiah: string }>;
  loading: boolean;
}

function HadiahInput({
  initial,
  onSave,
}: {
  initial: string;
  onSave: (value: string) => Promise<void>;
}) {
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  const changed = text !== initial;
  const save = async () => {
    setBusy(true);
    try {
      await onSave(text);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex w-full items-center gap-1.5">
      <Input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="h-8 flex-1 text-xs"
        placeholder="Contoh: Rp 500.000 + Sertifikat"
        aria-label="Hadiah"
      />
      <Button
        size="sm"
        variant="outline"
        className="h-8 px-2.5 text-xs font-bold"
        disabled={!changed}
        loading={busy}
        onClick={() => void save()}
      >
        Simpan
      </Button>
    </div>
  );
}

function AdminBagan() {
  const [comps, setComps] = useState<
    Array<{ id: number; slug: string; short: string; title: string }>
  >([]);
  const [teamsByKategori, setTeamsByKategori] = useState<
    Record<Kategori, Array<{ id: number; nama: string }>>
  >({ putra: [], putri: [] });
  const [activeKey, setActiveKey] = useState('');
  const [tabData, setTabData] = useState<Record<string, TabData>>({});
  const [busy, setBusy] = useState<string | null>(null);

  // Setup state (per tab aktif, hanya saat belum ada bracket)
  const [setupFormat, setSetupFormat] = useState<'SE' | 'HEAT'>('HEAT');
  const [setupSeeding, setSetupSeeding] = useState<Seeding>('RANDOM');
  const [setupThirdPlace, setSetupThirdPlace] = useState(true);
  /** Posisi seed manual per kategori: kategori ➔ teamId ➔ posisi (1..N). */
  const [manualPositions, setManualPositions] = useState<Record<string, Record<number, number>>>(
    {}
  );

  // Result dialog (Single Elimination)
  const [resultTarget, setResultTarget] = useState<MatchView | null>(null);
  const [resultWinner, setResultWinner] = useState<number | null>(null);
  const [resultScore1, setResultScore1] = useState('');
  const [resultScore2, setResultScore2] = useState('');
  const [resultType, setResultType] = useState<'NORMAL' | 'WALKOVER' | 'DISQUALIFIED'>('NORMAL');
  const [resultNotes, setResultNotes] = useState('');

  // Correction dialog (Single Elimination)
  const [correctTarget, setCorrectTarget] = useState<MatchView | null>(null);
  const [correctWinner, setCorrectWinner] = useState<number | null>(null);
  const [correctReason, setCorrectReason] = useState('');
  const [correctInvalidate, setCorrectInvalidate] = useState(false);
  const [correctBlockMsg, setCorrectBlockMsg] = useState<string | null>(null);

  // Confirm dialogs
  const [confirmAction, setConfirmAction] = useState<{
    key: string;
    title: string;
    desc: string;
    run: () => Promise<void>;
  } | null>(null);

  const keyOf = (compId: number, kategori: Kategori) => `${compId}:${kategori}`;

  const loadTab = useCallback(
    async (compId: number, kategori: Kategori) => {
      const key = keyOf(compId, kategori);
      setTabData((prev) => ({
        ...prev,
        [key]: {
          ...(prev[key] ?? { detail: null, heatDetail: null, prizes: [], loading: true }),
          loading: true,
        },
      }));
      try {
        const [detail, heatDetail, prizes] = await Promise.all([
          getBracket({ data: { competitionId: compId, kategori } }),
          getHeatBracket({ data: { competitionId: compId, kategori } }),
          getPrizes({ data: { competitionId: compId, kategori } }),
        ]);
        setTabData((prev) => ({ ...prev, [key]: { detail, heatDetail, prizes, loading: false } }));
      } catch (e) {
        toast.error(errMsg(e, 'Gagal memuat bagan'));
        setTabData((prev) => ({
          ...prev,
          [key]: {
            ...(prev[key] ?? { detail: null, heatDetail: null, prizes: [], loading: false }),
            loading: false,
          },
        }));
      }
    },
    [keyOf]
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [cs, tp, tw] = await Promise.all([
          getBaganCompetitions(),
          getBaganTeams({ data: { kategori: 'putra' } }),
          getBaganTeams({ data: { kategori: 'putri' } }),
        ]);
        if (!alive) return;
        setComps(cs);
        setTeamsByKategori({ putra: tp, putri: tw });
        if (cs.length > 0) {
          const first = keyOf(cs[0].id, 'putra');
          setActiveKey(first);
          await loadTab(cs[0].id, 'putra');
          await loadTab(cs[0].id, 'putri');
          if (cs[1]) {
            await loadTab(cs[1].id, 'putra');
            await loadTab(cs[1].id, 'putri');
          }
        }
      } catch (e) {
        toast.error(errMsg(e, 'Gagal memuat data bagan'));
      }
    })();
    return () => {
      alive = false;
    };
  }, [loadTab, keyOf]);

  const active = useMemo(() => {
    const [compIdStr, kategori] = activeKey.split(':');
    const compId = Number(compIdStr);
    const comp = comps.find((c) => c.id === compId);
    if (!comp) return null;
    const k = kategori as Kategori;
    const data = tabData[keyOf(compId, k)];
    return {
      comp,
      kategori: k,
      data: data ?? { detail: null, heatDetail: null, prizes: [], loading: true },
    };
  }, [activeKey, comps, tabData, keyOf]);

  const reloadActive = useCallback(async () => {
    if (!active) return;
    await loadTab(active.comp.id, active.kategori);
  }, [active, loadTab]);

  const run = (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    void fn()
      .catch((e) => toast.error(errMsg(e, 'Aksi gagal')))
      .finally(() => setBusy(null));
  };

  // Init posisi manual per kategori saat pertama kali dipilih (default = urutan daftar).
  useEffect(() => {
    if (setupSeeding !== 'MANUAL' || !active) return;
    const k = active.kategori;
    setManualPositions((prev) => {
      if (prev[k]) return prev;
      const init: Record<number, number> = {};
      teamsByKategori[k].forEach((t, i) => {
        init[t.id] = i + 1;
      });
      return { ...prev, [k]: init };
    });
  }, [active, setupSeeding, teamsByKategori]);

  /** Validasi posisi manual untuk kategori aktif (unused saat bukan MANUAL). */
  const manualValid = useMemo(() => {
    if (!active || setupSeeding !== 'MANUAL') return { ok: true, msg: '' };
    const k = active.kategori;
    const teams = teamsByKategori[k];
    const n = teams.length;
    const pos = manualPositions[k] ?? {};
    const vals = teams.map((t) => pos[t.id]);
    const missing = vals.filter((v) => v === undefined).length;
    if (missing > 0) return { ok: false, msg: `Isi posisi semua tim (${missing} belum diatur)` };
    if (vals.some((v) => !Number.isInteger(v) || v! < 1 || v! > n))
      return { ok: false, msg: `Posisi harus angka 1 sampai ${n}` };
    if (new Set(vals).size !== n) return { ok: false, msg: 'Posisi tidak boleh dobel' };
    return { ok: true, msg: '' };
  }, [active, setupSeeding, teamsByKategori, manualPositions]);

  if (!active) {
    return (
      <div className="space-y-5">
        <PageHeader title="Bagan Pertandingan" subtitle="Memuat bagan..." />
        <BracketTreeSkeleton />
      </div>
    );
  }

  const { comp, kategori, data } = active;
  const detail = data.detail;
  const heatDetail = data.heatDetail;
  const prizes = data.prizes;

  const isHeat = !!heatDetail;

  // Single elimination handlers
  const openResult = (match: MatchView) => {
    setResultTarget(match);
    setResultWinner(null);
    setResultScore1('');
    setResultScore2('');
    setResultType('NORMAL');
    setResultNotes('');
  };

  const submitResult = async () => {
    if (!resultTarget || resultWinner === null) {
      toast.error('Pilih pemenang terlebih dahulu');
      return;
    }
    setBusy('result');
    try {
      await submitMatchResult({
        data: {
          matchId: resultTarget.id,
          winnerId: resultWinner,
          score1: resultScore1 === '' ? null : Number(resultScore1),
          score2: resultScore2 === '' ? null : Number(resultScore2),
          resultType,
          notes: resultNotes || null,
          expectedVersion: resultTarget.version,
        },
      });
      toast.success('Hasil pertandingan disimpan');
      setResultTarget(null);
      await reloadActive();
    } catch (e) {
      toast.error(errMsg(e, 'Gagal menyimpan hasil'));
    } finally {
      setBusy(null);
    }
  };

  const openCorrect = (match: MatchView) => {
    setCorrectTarget(match);
    setCorrectWinner(null);
    setCorrectReason('');
    setCorrectInvalidate(false);
    setCorrectBlockMsg(null);
  };

  const submitCorrect = async () => {
    if (!correctTarget || correctWinner === null) {
      toast.error('Pilih pemenang baru terlebih dahulu');
      return;
    }
    setBusy('correct');
    try {
      const res = await correctMatchResult({
        data: {
          matchId: correctTarget.id,
          winnerId: correctWinner,
          reason: correctReason || null,
          invalidateDownstream: correctInvalidate,
          expectedVersion: correctTarget.version,
        },
      });
      toast.success(
        res.invalidated > 0
          ? `Koreksi disimpan. ${res.invalidated} hasil berikutnya dibatalkan.`
          : 'Koreksi disimpan'
      );
      setCorrectTarget(null);
      await reloadActive();
    } catch (e) {
      const msg = errMsg(e, 'Gagal mengoreksi hasil');
      if (msg.includes('membatalkan')) {
        setCorrectBlockMsg(msg);
        setCorrectInvalidate(true);
      } else {
        toast.error(msg);
      }
    } finally {
      setBusy(null);
    }
  };

  const doGenerate = async () => {
    setBusy('generate');
    try {
      const manual =
        setupSeeding === 'MANUAL'
          ? Object.fromEntries(
              Object.entries(manualPositions[kategori] ?? {}).map(([k, v]) => [k, v])
            )
          : undefined;
      await generateBracket({
        data: {
          competitionId: comp.id,
          kategori,
          seedingMethod: setupSeeding,
          thirdPlaceEnabled: setupThirdPlace,
          manualPositions: manual,
        },
      });
      toast.success('Bagan berhasil dibuat (draft). Periksa lalu publish.');
      await reloadActive();
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
      await publishBracket({ data: { bracketId: detail.bracket.id } });
      toast.success('Bagan dipublish. Struktur terkunci.');
      await reloadActive();
    } catch (e) {
      toast.error(errMsg(e, 'Gagal publish'));
    } finally {
      setBusy(null);
    }
  };

  const matchCount = detail
    ? detail.rounds
        .filter((r) => r.roundType === 'MAIN')
        .reduce((a, r) => a + r.matches.length, 0) + (detail.thirdPlaceMatch ? 1 : 0)
    : 0;
  const roundCount = detail ? detail.rounds.filter((r) => r.roundType === 'MAIN').length : 0;
  const isDraft = detail?.bracket.status === 'DRAFT';
  const guideStatus: 'setup' | 'draft' | 'berlangsung' | 'selesai' = !detail
    ? 'setup'
    : isDraft
      ? 'draft'
      : detail.bracket.status === 'COMPLETED' || detail.bracket.status === 'ARCHIVED'
        ? 'selesai'
        : 'berlangsung';

  return (
    <div className="w-full min-w-0 max-w-full space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Bagan Pertandingan"
          subtitle="Atur bagan pertandingan, input hasil, dan kelola hadiah juara perlombaan."
        />
        {!isHeat && (detail || setupFormat === 'SE') && <BaganGuide status={guideStatus} />}
      </div>

      {/* ─── Competition & Gender Switcher Pills ─── */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar rounded-2xl border border-border bg-card p-2 w-full min-w-0 max-w-full shadow-2xs">
        {comps.flatMap((c) =>
          (['putra', 'putri'] as Kategori[]).map((k) => {
            const key = keyOf(c.id, k);
            const label = `${c.short} · ${k === 'putra' ? 'Putra' : 'Putri'}`;
            const tData = tabData[key];
            const hasBracket = !!tData?.detail || !!tData?.heatDetail;
            const isTabActive = activeKey === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveKey(key)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition cursor-pointer ${
                  isTabActive
                    ? 'bg-brand-red text-white shadow-md shadow-red-600/25'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <span>{label}</span>
                {hasBracket && (
                  <CheckCircle2
                    size={13}
                    className={isTabActive ? 'text-white' : 'text-emerald-500'}
                  />
                )}
              </button>
            );
          })
        )}
      </div>

      {/* ─── Body Switcher ─── */}
      {data.loading && !detail && !heatDetail ? (
        <BracketTreeSkeleton />
      ) : isHeat ? (
        /* ─── HEAT ELIMINATION RUNTIME ─── */
        <HeatTournamentView
          comp={comp}
          kategori={kategori}
          teams={teamsByKategori[kategori]}
          detail={heatDetail}
          loading={data.loading}
          onReload={reloadActive}
        />
      ) : !detail ? (
        /* ─── Setup: belum ada bracket dibuat ─── */
        <div className="space-y-6">
          {/* Pilih format pertandingan */}
          <Card className="rounded-3xl border border-border bg-card shadow-xs">
            <CardContent className="space-y-4 p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <h3 className="font-heading text-base sm:text-lg font-black text-foreground">
                    Pilih Format Pertandingan
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {comp.title} · Kategori {kategori === 'putra' ? 'Putra' : 'Putri'} ·{' '}
                    <span className="font-bold text-foreground">
                      {teamsByKategori[kategori].length} tim terdaftar
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Opsi 1: Sistem Sesi (Heat) */}
                <button
                  type="button"
                  onClick={() => setSetupFormat('HEAT')}
                  className={`flex flex-col rounded-2xl border p-5 text-left transition-all cursor-pointer ${
                    setupFormat === 'HEAT'
                      ? 'border-brand-red bg-brand-red/5 ring-2 ring-brand-red/30 shadow-xs'
                      : 'border-border bg-card hover:border-muted-foreground/40 hover:bg-muted/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red">
                      <Layers size={18} />
                    </span>
                    <span className="rounded-full bg-brand-red/10 px-2.5 py-0.5 text-[10px] font-black uppercase text-brand-red">
                      Rekomendasi Estafet
                    </span>
                  </div>
                  <p className="text-sm font-black text-foreground">Sistem Sesi / Heat</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Beberapa tim bertanding sekaligus dalam satu sesi (contoh: 4 tim, 2 lolos).
                    Jumlah tim, tim lolos, dan ukuran babak final fleksibel.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5 pt-2 border-t border-border/60">
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                      Estafet Balon
                    </span>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                      Estafet Air
                    </span>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                      Multi-tim per sesi
                    </span>
                  </div>
                </button>

                {/* Opsi 2: Single Elimination */}
                <button
                  type="button"
                  onClick={() => setSetupFormat('SE')}
                  className={`flex flex-col rounded-2xl border p-5 text-left transition-all cursor-pointer ${
                    setupFormat === 'SE'
                      ? 'border-brand-red bg-brand-red/5 ring-2 ring-brand-red/30 shadow-xs'
                      : 'border-border bg-card hover:border-muted-foreground/40 hover:bg-muted/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <Workflow size={18} />
                    </span>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-black uppercase text-muted-foreground">
                      Klasik 1 vs 1
                    </span>
                  </div>
                  <p className="text-sm font-black text-foreground">
                    Single Elimination (Sistem Gugur)
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Dua tim bertanding head-to-head per pertandingan, pemenang langsung melaju ke
                    babak berikutnya. Tersedia perebutan juara 3.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5 pt-2 border-t border-border/60">
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                      Head-to-head 2 tim
                    </span>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                      Binary Bracket Tree
                    </span>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Form Setup sesuai format yang dipilih */}
          {setupFormat === 'HEAT' ? (
            <HeatTournamentView
              comp={comp}
              kategori={kategori}
              teams={teamsByKategori[kategori]}
              detail={null}
              loading={data.loading}
              onReload={reloadActive}
            />
          ) : (
            <Card className="rounded-3xl border border-border bg-card shadow-xs">
              <CardContent className="space-y-5 p-5 sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                  <div>
                    <h3 className="font-heading text-base font-black text-foreground">
                      Setup Bagan — Single Elimination
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {comp.title} · Kategori {kategori === 'putra' ? 'Putra' : 'Putri'} ·{' '}
                      {teamsByKategori[kategori].length} tim terdaftar
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                      Metode Seeding (Undian)
                    </span>
                    <Select
                      value={setupSeeding}
                      onValueChange={(v) => setSetupSeeding(v as Seeding)}
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
                            <span>Urutan Daftar</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="MANUAL">
                          <div className="flex items-center gap-2">
                            <Pencil size={14} className="text-muted-foreground" />
                            <span>Manual</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                      Pertandingan Juara 3
                    </span>
                    <Select
                      value={setupThirdPlace ? 'MATCH' : 'NONE'}
                      onValueChange={(v) => setSetupThirdPlace(v === 'MATCH')}
                    >
                      <SelectTrigger className="w-full rounded-xl font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MATCH">
                          <div className="flex items-center gap-2">
                            <Medal size={14} className="text-amber-600 dark:text-amber-400" />
                            <span>Aktif (Kalah Semifinal)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="NONE">
                          <div className="flex items-center gap-2">
                            <MinusCircle size={14} className="text-muted-foreground" />
                            <span>Nonaktif</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Daftar peserta terdaftar */}
                <div className="rounded-2xl border border-border bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-xs font-black uppercase tracking-wider text-foreground">
                      Daftar Tim Terdaftar ({teamsByKategori[kategori].length})
                    </p>
                    <span className="text-[10px] font-bold text-muted-foreground">
                      Semua ikut serta
                    </span>
                  </div>
                  <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                    {teamsByKategori[kategori].map((t, i) => (
                      <div key={t.id} className="flex items-center gap-2 text-xs">
                        <span className="w-5 shrink-0 text-right font-black text-muted-foreground">
                          {i + 1}.
                        </span>
                        <span className="truncate font-bold text-foreground">{t.nama}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {setupSeeding === 'MANUAL' && (
                  <div className="space-y-3 rounded-2xl border border-brand-red/30 bg-brand-red/5 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-black uppercase tracking-wider text-foreground">
                        Posisi Seed Manual
                      </p>
                      <span className="text-[11px] font-bold text-brand-red">
                        1 = Match pertama
                      </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {teamsByKategori[kategori].map((t, i) => (
                        <div
                          key={t.id}
                          className="flex items-center gap-2 rounded-xl bg-card p-2 border border-border"
                        >
                          <span className="w-6 shrink-0 text-right text-xs font-black text-muted-foreground">
                            {i + 1}.
                          </span>
                          <span className="min-w-0 flex-1 truncate text-xs font-bold text-foreground">
                            {t.nama}
                          </span>
                          <Input
                            type="number"
                            min={1}
                            max={teamsByKategori[kategori].length}
                            value={manualPositions[kategori]?.[t.id] ?? ''}
                            onChange={(e) => {
                              const v = e.target.value === '' ? NaN : Number(e.target.value);
                              setManualPositions((prev) => ({
                                ...prev,
                                [kategori]: { ...prev[kategori], [t.id]: v },
                              }));
                            }}
                            className="h-8 w-20 rounded-lg text-center text-xs font-black"
                            aria-label={`Posisi ${t.nama}`}
                          />
                        </div>
                      ))}
                    </div>
                    {!manualValid.ok && (
                      <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive">
                        {manualValid.msg}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground">
                    Struktur bagan dibuat otomatis:{' '}
                    {Math.max(
                      2,
                      2 ** Math.ceil(Math.log2(Math.max(2, teamsByKategori[kategori].length)))
                    )}{' '}
                    slot pertandingan.
                  </p>
                  <Button
                    onClick={() => void run('generate', doGenerate)}
                    disabled={
                      busy !== null ||
                      teamsByKategori[kategori].length < 2 ||
                      (setupSeeding === 'MANUAL' && !manualValid.ok)
                    }
                    className="rounded-xl font-black shadow-md"
                  >
                    <Plus size={16} className="mr-1.5" />
                    Generate Bagan Single Elimination
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        /* ─── Single Elimination Runtime ─── */
        <div className="space-y-6">
          {/* Header Lifecycle Single Elimination */}
          <Card className="rounded-3xl border border-border bg-card shadow-xs">
            <CardContent className="space-y-4 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="font-heading text-base sm:text-lg font-black text-foreground">
                      {comp.title} · Kategori {kategori === 'putra' ? 'Putra' : 'Putri'}
                    </h3>
                    <span
                      className={`rounded-full border px-3 py-0.5 text-[10px] font-black uppercase tracking-wider ${STATUS_STYLE[detail.bracket.status] ?? STATUS_STYLE.DRAFT}`}
                    >
                      {STATUS_LABEL[detail.bracket.status] ?? detail.bracket.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {detail.bracket.participantCount} peserta · {matchCount} pertandingan ·{' '}
                    {roundCount} babak · Seeding{' '}
                    {detail.bracket.seedingMethod === 'RANDOM'
                      ? 'Acak'
                      : detail.bracket.seedingMethod === 'MANUAL'
                        ? 'Manual'
                        : 'Urutan Daftar'}
                    {detail.bracket.thirdPlaceEnabled ? ' · Juara 3 aktif' : ''}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {isDraft && (
                    <Button
                      size="sm"
                      className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                      onClick={() => void run('publish', doPublish)}
                      loading={busy === 'publish'}
                      disabled={busy !== null && busy !== 'publish'}
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
                      onClick={() =>
                        void run('regenerate', async () => {
                          await regenerateBracket({ data: { competitionId: comp.id, kategori } });
                          toast.success('Bagan berhasil digenerate ulang');
                          await reloadActive();
                        })
                      }
                      loading={busy === 'regenerate'}
                      disabled={busy !== null && busy !== 'regenerate'}
                    >
                      <RefreshCw
                        size={14}
                        className={cn('mr-1.5', busy === 'regenerate' && 'animate-spin')}
                      />
                      Acak Ulang
                    </Button>
                  )}
                  {!isDraft && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl font-bold"
                      onClick={() =>
                        setConfirmAction({
                          key: 'reset',
                          title: 'Reset hasil pertandingan?',
                          desc: 'Semua hasil match akan dihapus. Struktur dan undian tetap utuh.',
                          run: async () => {
                            await resetBracketResults({ data: { bracketId: detail.bracket.id } });
                            toast.success('Hasil pertandingan berhasil direset');
                            await reloadActive();
                          },
                        })
                      }
                      loading={busy === 'reset'}
                      disabled={busy !== null && busy !== 'reset'}
                    >
                      Reset Hasil
                    </Button>
                  )}
                  <BaganPrintModal
                    title={comp.title}
                    kategori={kategori}
                    format="SINGLE_ELIMINATION"
                    status={STATUS_LABEL[detail.bracket.status] ?? detail.bracket.status}
                    singleBracket={detail}
                    prizes={prizes}
                    trigger={
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl font-bold shadow-2xs"
                      >
                        <Printer size={14} className="mr-1.5" />
                        Cetak / PDF
                      </Button>
                    }
                  />

                  <Button
                    size="sm"
                    variant="destructive"
                    className="rounded-xl font-bold"
                    onClick={() =>
                      setConfirmAction({
                        key: 'delete',
                        title: 'Hapus seluruh bagan?',
                        desc: 'Seluruh struktur pertandingan, hasil, dan seed bagan ini akan dihapus permanen.',
                        run: async () => {
                          await deleteBracket({ data: { bracketId: detail.bracket.id } });
                          toast.success('Bagan berhasil dihapus');
                          await reloadActive();
                        },
                      })
                    }
                    loading={busy === 'delete'}
                    disabled={busy !== null && busy !== 'delete'}
                  >
                    <Trash2 size={14} className="mr-1.5" />
                    Hapus Bagan
                  </Button>
                </div>
              </div>

              {/* Panel Undian Seed */}
              {detail.slots.length > 0 && (
                <div className="rounded-2xl border border-border bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-xs font-black uppercase tracking-wider text-foreground">
                      Hasil Undian Slot &amp; Seed
                    </p>
                    <span className="text-[10px] text-muted-foreground font-bold">
                      Slot 1-2 = Match 1
                    </span>
                  </div>
                  <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                    {detail.slots.map((s) => (
                      <div key={s.slot} className="flex items-center gap-2 text-xs">
                        <span className="w-12 shrink-0 text-right font-black text-muted-foreground">
                          Slot {s.slot}
                        </span>
                        {s.bye ? (
                          <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground border border-border">
                            BYE (Lolos Otomatis)
                          </span>
                        ) : (
                          <>
                            {s.seed !== null && (
                              <span className="shrink-0 rounded bg-brand-red/10 px-1.5 py-0.5 text-[10px] font-black text-brand-red border border-brand-red/20">
                                S{s.seed}
                              </span>
                            )}
                            <span className="truncate font-bold text-foreground">{s.nama}</span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bracket Tree */}
              <BracketTree
                detail={detail}
                prizes={prizes}
                admin={{
                  onSubmit: openResult,
                  onCorrect: openCorrect,
                }}
              />
            </CardContent>
          </Card>

          {/* Hadiah Juara Single Elimination */}
          <Card className="rounded-3xl border border-border bg-card shadow-xs">
            <CardContent className="space-y-4 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                <div>
                  <h3 className="font-heading text-base font-black text-foreground">
                    Hadiah Juara
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Podium dihitung otomatis dari hasil match. Hadiah mengikuti peringkat juara.
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
                      await reloadActive();
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
                    const teamId =
                      p.place === 1
                        ? detail.podium.rank1
                        : p.place === 2
                          ? detail.podium.rank2
                          : p.place === 3
                            ? detail.podium.rank3
                            : null;
                    const winnerNama =
                      teamId !== null
                        ? (detail.participants.find((x) => x.teamId === teamId)?.nama ?? null)
                        : null;

                    const renderPlaceBadge = () => {
                      if (p.place === 1) {
                        return (
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-xs">
                            <Crown size={15} />
                          </span>
                        );
                      }
                      if (p.place === 2) {
                        return (
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-400 to-slate-600 text-white shadow-xs">
                            <Medal size={15} />
                          </span>
                        );
                      }
                      if (p.place === 3) {
                        return (
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 text-white shadow-xs">
                            <Award size={15} />
                          </span>
                        );
                      }
                      return (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted text-xs font-black text-foreground">
                          #{p.place}
                        </span>
                      );
                    };

                    return (
                      <div
                        key={p.place}
                        className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-muted/20 px-3.5 py-2.5"
                      >
                        {renderPlaceBadge()}
                        <div className="min-w-0 flex-1 basis-48">
                          <p className="text-xs font-black text-foreground">
                            Juara {p.place}
                            {winnerNama && (
                              <span className="ml-2 font-extrabold text-emerald-600 dark:text-emerald-400">
                                • {winnerNama}
                              </span>
                            )}
                          </p>
                          <HadiahInput
                            key={`h-${comp.id}-${kategori}-${p.place}`}
                            initial={p.hadiah}
                            onSave={async (value) => {
                              await upsertPrize({
                                data: {
                                  competitionId: comp.id,
                                  kategori,
                                  place: p.place,
                                  hadiah: value,
                                },
                              });
                              toast.success(`Hadiah Juara ${p.place} disimpan`);
                              await reloadActive();
                            }}
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
                              await reloadActive();
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
        </div>
      )}

      {/* ─── Dialog Input Hasil Single Elimination ─── */}
      <ResponsiveDialog
        open={!!resultTarget}
        onOpenChange={(o) => {
          if (!o) setResultTarget(null);
        }}
        title="Input Hasil Pertandingan"
        description={resultTarget ? `Match ${resultTarget.matchNumber} — pilih tim pemenang` : ''}
      >
        {resultTarget && (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                Pemenang
              </span>
              <div className="space-y-2">
                {[
                  { id: resultTarget.participant1Id, nama: resultTarget.participant1Nama },
                  { id: resultTarget.participant2Id, nama: resultTarget.participant2Nama },
                ].map((p, i) =>
                  p.id !== null ? (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setResultWinner(p.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left text-xs font-bold transition cursor-pointer ${
                        resultWinner === p.id
                          ? 'border-brand-red bg-brand-red/5 text-foreground ring-1 ring-brand-red/30'
                          : 'border-border bg-card text-foreground hover:bg-muted/40'
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                          resultWinner === p.id
                            ? 'border-brand-red bg-brand-red text-white'
                            : 'border-muted-foreground/40'
                        }`}
                      >
                        {resultWinner === p.id && (
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        )}
                      </span>
                      <span className="flex-1 truncate">{p.nama}</span>
                      <span className="text-[10px] font-bold text-muted-foreground">
                        Tim {i + 1}
                      </span>
                    </button>
                  ) : null
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  Skor Tim 1
                </span>
                <Input
                  type="number"
                  min={0}
                  value={resultScore1}
                  onChange={(e) => setResultScore1(e.target.value)}
                  aria-label="Skor tim 1"
                  className="h-9 rounded-xl font-bold"
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  Skor Tim 2
                </span>
                <Input
                  type="number"
                  min={0}
                  value={resultScore2}
                  onChange={(e) => setResultScore2(e.target.value)}
                  aria-label="Skor tim 2"
                  className="h-9 rounded-xl font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                Tipe Hasil
              </span>
              <Select
                value={resultType}
                onValueChange={(v) => setResultType(v as typeof resultType)}
              >
                <SelectTrigger className="w-full rounded-xl font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMAL">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span>Normal</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="WALKOVER">
                    <div className="flex items-center gap-2">
                      <UserX size={14} className="text-amber-600" />
                      <span>Walkover (WO)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="DISQUALIFIED">
                    <div className="flex items-center gap-2">
                      <Ban size={14} className="text-destructive" />
                      <span>Diskualifikasi</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                Catatan (Opsional)
              </span>
              <Input
                type="text"
                value={resultNotes}
                onChange={(e) => setResultNotes(e.target.value)}
                placeholder="Contoh: Menang tipis"
                className="h-9 rounded-xl text-xs"
                aria-label="Catatan hasil"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setResultTarget(null)}>
                Batal
              </Button>
              <Button
                size="sm"
                className="font-black"
                onClick={() => void submitResult()}
                disabled={resultWinner === null}
                loading={busy === 'result'}
              >
                Simpan Hasil
              </Button>
            </div>
          </div>
        )}
      </ResponsiveDialog>

      {/* ─── Dialog Koreksi Single Elimination ─── */}
      <ResponsiveDialog
        open={!!correctTarget}
        onOpenChange={(o) => {
          if (!o) {
            setCorrectTarget(null);
            setCorrectBlockMsg(null);
          }
        }}
        title="Koreksi Hasil Pertandingan"
        description={
          correctTarget
            ? `Match ${correctTarget.matchNumber} sudah selesai. Ubah pemenang dengan hati-hati.`
            : ''
        }
      >
        {correctTarget && (
          <div className="space-y-4 py-2">
            {correctBlockMsg && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs font-bold text-amber-800 dark:text-amber-300">
                <p>{correctBlockMsg}</p>
              </div>
            )}
            <div className="space-y-1.5">
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                Pemenang Baru
              </span>
              <div className="space-y-2">
                {[
                  { id: correctTarget.participant1Id, nama: correctTarget.participant1Nama },
                  { id: correctTarget.participant2Id, nama: correctTarget.participant2Nama },
                ].map((p) =>
                  p.id !== null ? (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setCorrectWinner(p.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left text-xs font-bold transition cursor-pointer ${
                        correctWinner === p.id
                          ? 'border-brand-red bg-brand-red/5 text-foreground ring-1 ring-brand-red/30'
                          : 'border-border bg-card text-foreground hover:bg-muted/40'
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                          correctWinner === p.id
                            ? 'border-brand-red bg-brand-red text-white'
                            : 'border-muted-foreground/40'
                        }`}
                      >
                        {correctWinner === p.id && (
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        )}
                      </span>
                      <span className="flex-1 truncate">{p.nama}</span>
                    </button>
                  ) : null
                )}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                Alasan Koreksi (Opsional)
              </span>
              <Input
                type="text"
                value={correctReason}
                onChange={(e) => setCorrectReason(e.target.value)}
                placeholder="Contoh: Salah catat skor juri"
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
                <span>Batalkan dan hitung ulang pertandingan lanjutan yang terdampak</span>
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
                disabled={correctWinner === null}
                loading={busy === 'correct'}
              >
                Koreksi &amp; Simpan
              </Button>
            </div>
          </div>
        )}
      </ResponsiveDialog>

      {/* ─── Alert Dialog Konfirmasi ─── */}
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
