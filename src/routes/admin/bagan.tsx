import { createFileRoute } from '@tanstack/react-router';
import { CheckCircle2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { BaganGuide } from '../../components/bagan/BaganGuide';
import {
  type BracketDetailView,
  BracketTree,
  BracketTreeSkeleton,
  type MatchView,
} from '../../components/bagan/BracketTree';
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

export const Route = createFileRoute('/admin/bagan')({
  beforeLoad: () => requireRole(['superadmin', 'admin', 'petugas']),
  component: AdminBagan,
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
        className="h-8 px-2 text-xs font-bold"
        disabled={!changed || busy}
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
  const [setupSeeding, setSetupSeeding] = useState<Seeding>('RANDOM');
  const [setupThirdPlace, setSetupThirdPlace] = useState(true);
  /** Posisi seed manual per kategori: kategori → teamId → posisi (1..N). */
  const [manualPositions, setManualPositions] = useState<Record<string, Record<number, number>>>(
    {}
  );

  // Result dialog
  const [resultTarget, setResultTarget] = useState<MatchView | null>(null);
  const [resultWinner, setResultWinner] = useState<number | null>(null);
  const [resultScore1, setResultScore1] = useState('');
  const [resultScore2, setResultScore2] = useState('');
  const [resultType, setResultType] = useState<'NORMAL' | 'WALKOVER' | 'DISQUALIFIED'>('NORMAL');
  const [resultNotes, setResultNotes] = useState('');

  // Correction dialog
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

  const loadTab = useCallback(async (compId: number, kategori: Kategori) => {
    const key = keyOf(compId, kategori);
    setTabData((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? { detail: null, prizes: [], loading: true }), loading: true },
    }));
    try {
      const [detail, prizes] = await Promise.all([
        getBracket({ data: { competitionId: compId, kategori } }),
        getPrizes({ data: { competitionId: compId, kategori } }),
      ]);
      setTabData((prev) => ({ ...prev, [key]: { detail, prizes, loading: false } }));
    } catch (e) {
      toast.error(errMsg(e, 'Gagal memuat bagan'));
      setTabData((prev) => ({
        ...prev,
        [key]: { ...(prev[key] ?? { detail: null, prizes: [], loading: false }), loading: false },
      }));
    }
  }, []);

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
  }, [loadTab]);

  const active = useMemo(() => {
    const [compIdStr, kategori] = activeKey.split(':');
    const compId = Number(compIdStr);
    const comp = comps.find((c) => c.id === compId);
    if (!comp) return null;
    const k = kategori as Kategori;
    const data = tabData[keyOf(compId, k)];
    return { comp, kategori: k, data: data ?? { detail: null, prizes: [], loading: true } };
  }, [activeKey, comps, tabData]);

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
  const prizes = data.prizes;

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
      toast.error('Pilih pemenang dulu');
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
      toast.error('Pilih pemenang baru dulu');
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Bagan Pertandingan"
          subtitle="Atur bagan gugur, input hasil, dan kelola hadiah juara."
        />
        <BaganGuide status={guideStatus} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar rounded-2xl border border-border bg-card p-2">
        {comps.flatMap((c) =>
          (['putra', 'putri'] as Kategori[]).map((k) => {
            const key = keyOf(c.id, k);
            const label = `${c.short} · ${k === 'putra' ? 'Putra' : 'Putri'}`;
            const hasBracket = !!tabData[key]?.detail;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveKey(key)}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                  activeKey === key
                    ? 'bg-brand-red text-white shadow-xs'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {label}
                {hasBracket && (
                  <CheckCircle2
                    size={12}
                    className={activeKey === key ? 'text-white' : 'text-emerald-500'}
                  />
                )}
              </button>
            );
          })
        )}
      </div>

      {data.loading && !detail ? (
        <BracketTreeSkeleton />
      ) : !detail ? (
        /* ─── Setup: belum ada bracket ─── */
        <Card className="rounded-3xl border border-border bg-card shadow-xs">
          <CardContent className="space-y-4 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <h3 className="font-heading text-base font-black text-foreground">Setup Bagan</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {comp.title} · {kategori === 'putra' ? 'Putra' : 'Putri'} ·{' '}
                  {teamsByKategori[kategori].length} peserta terdaftar
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase text-muted-foreground">Seeding</span>
                <Select value={setupSeeding} onValueChange={(v) => setSetupSeeding(v as Seeding)}>
                  <SelectTrigger className="w-full rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RANDOM">Acak</SelectItem>
                    <SelectItem value="REGISTRATION_ORDER">Urutan Daftar</SelectItem>
                    <SelectItem value="MANUAL">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase text-muted-foreground">
                  Perebutan Juara 3
                </span>
                <Select
                  value={setupThirdPlace ? 'MATCH' : 'NONE'}
                  onValueChange={(v) => setSetupThirdPlace(v === 'MATCH')}
                >
                  <SelectTrigger className="w-full rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MATCH">Aktif (kalah semifinal)</SelectItem>
                    <SelectItem value="NONE">Nonaktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Daftar peserta (informasi: siapa yang ikut) */}
            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Peserta ({teamsByKategori[kategori].length})
                </p>
                <span className="text-[10px] text-muted-foreground">semua ikut serta</span>
              </div>
              <div className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
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
              <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Posisi Seed
                  </p>
                  <span className="text-[10px] text-muted-foreground">1 = match pertama</span>
                </div>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {teamsByKategori[kategori].map((t, i) => (
                    <div key={t.id} className="flex items-center gap-2">
                      <span className="w-6 shrink-0 text-right text-[11px] font-black text-muted-foreground">
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
                        className="h-8 w-16 rounded-lg text-center text-xs"
                        aria-label={`Posisi ${t.nama}`}
                      />
                    </div>
                  ))}
                </div>
                {!manualValid.ok && (
                  <p className="rounded-lg bg-destructive/10 px-2.5 py-1.5 text-[11px] font-bold text-destructive">
                    {manualValid.msg}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <p className="text-[11px] text-muted-foreground">
                Struktur dibuat otomatis: bracket{' '}
                {Math.max(
                  2,
                  2 ** Math.ceil(Math.log2(Math.max(2, teamsByKategori[kategori].length)))
                )}{' '}
                slot. Tim yang dapat BYE otomatis maju.
              </p>
              <Button
                onClick={() => void run('generate', doGenerate)}
                disabled={
                  busy !== null ||
                  teamsByKategori[kategori].length < 2 ||
                  (setupSeeding === 'MANUAL' && !manualValid.ok)
                }
                className="rounded-xl font-bold"
              >
                <Plus size={14} className="mr-1.5" />
                Generate Bagan
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ─── Header lifecycle ─── */}
          <Card className="rounded-3xl border border-border bg-card shadow-xs">
            <CardContent className="space-y-4 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-heading text-base font-black text-foreground">
                      {comp.title} · {kategori === 'putra' ? 'Putra' : 'Putri'}
                    </h3>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${STATUS_STYLE[detail.bracket.status] ?? STATUS_STYLE.DRAFT}`}
                    >
                      {STATUS_LABEL[detail.bracket.status] ?? detail.bracket.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {detail.bracket.participantCount} peserta · {matchCount} match · {roundCount}{' '}
                    round · seeding{' '}
                    {detail.bracket.seedingMethod === 'RANDOM'
                      ? 'acak'
                      : detail.bracket.seedingMethod === 'MANUAL'
                        ? 'manual'
                        : 'urutan daftar'}
                    {detail.bracket.thirdPlaceEnabled ? ' · perebutan juara 3 aktif' : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {isDraft && (
                    <Button
                      size="sm"
                      className="rounded-xl font-bold"
                      onClick={() => void run('publish', doPublish)}
                      disabled={busy !== null}
                    >
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
                          toast.success('Bagan digenerate ulang');
                          await reloadActive();
                        })
                      }
                      disabled={busy !== null}
                    >
                      <RefreshCw size={14} className="mr-1.5" />
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
                          title: 'Reset hasil?',
                          desc: 'Semua hasil match dihapus. Struktur dan seed tetap. Pertandingan harus diinput ulang.',
                          run: async () => {
                            await resetBracketResults({ data: { bracketId: detail.bracket.id } });
                            toast.success('Hasil direset');
                            await reloadActive();
                          },
                        })
                      }
                      disabled={busy !== null}
                    >
                      Reset Hasil
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    className="rounded-xl font-bold"
                    onClick={() =>
                      setConfirmAction({
                        key: 'delete',
                        title: 'Hapus bagan?',
                        desc: 'Seluruh struktur, hasil, dan seed bagan ini dihapus permanen. Tidak bisa dibatalkan.',
                        run: async () => {
                          await deleteBracket({ data: { bracketId: detail.bracket.id } });
                          toast.success('Bagan dihapus');
                          await reloadActive();
                        },
                      })
                    }
                    disabled={busy !== null}
                  >
                    <Trash2 size={14} className="mr-1.5" />
                    Hapus Bagan
                  </Button>
                </div>
              </div>

              {/* Panel undian seed: kenapa pairing begini + siapa dapat BYE */}
              {detail.slots.length > 0 && (
                <div className="rounded-xl border border-border bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Undian Seed
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      Slot 1-2 = Match 1 · S = urutan undian
                    </span>
                  </div>
                  <div className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                    {detail.slots.map((s) => (
                      <div key={s.slot} className="flex items-center gap-2 text-xs">
                        <span className="w-10 shrink-0 text-right font-black text-muted-foreground">
                          Slot {s.slot}
                        </span>
                        {s.bye ? (
                          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                            BYE
                          </span>
                        ) : (
                          <>
                            {s.seed !== null && (
                              <span className="shrink-0 rounded bg-brand-red/10 px-1 text-[9px] font-black leading-4 text-brand-red">
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

          {/* ─── Hadiah ─── */}
          <Card className="rounded-3xl border border-border bg-card shadow-xs">
            <CardContent className="space-y-3 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                <div>
                  <h3 className="font-heading text-base font-black text-foreground">
                    Hadiah Juara
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Podium dihitung otomatis dari hasil match. Hadiah mengikuti peringkat.
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
                      toast.success(`Baris Juara ${next} ditambahkan`);
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
                <p className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  Belum ada hadiah diatur. Klik <b>Tambah Baris Juara</b>.
                </p>
              ) : (
                <div className="space-y-2">
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
                    const emoji =
                      p.place === 1
                        ? '🥇'
                        : p.place === 2
                          ? '🥈'
                          : p.place === 3
                            ? '🥉'
                            : `#${p.place}`;
                    return (
                      <div
                        key={p.place}
                        className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/20 px-3 py-2"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-black">
                          {emoji}
                        </span>
                        <div className="min-w-0 flex-1 basis-40">
                          <p className="text-xs font-black text-foreground">
                            Juara {p.place}
                            {winnerNama && (
                              <span className="ml-1.5 font-extrabold text-emerald-600 dark:text-emerald-400">
                                - {winnerNama}
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
                          className="h-8 w-8 shrink-0 rounded-lg text-destructive hover:bg-destructive/10"
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
        </>
      )}

      {/* ─── Dialog Input Hasil ─── */}
      <ResponsiveDialog
        open={!!resultTarget}
        onOpenChange={(o) => {
          if (!o) setResultTarget(null);
        }}
        title="Input Hasil"
        description={resultTarget ? `Match ${resultTarget.matchNumber} - pilih pemenang` : ''}
      >
        {resultTarget && (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase text-muted-foreground">Pemenang</span>
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
                      className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-bold transition ${
                        resultWinner === p.id
                          ? 'border-brand-red bg-brand-red/5 text-foreground'
                          : 'border-border bg-background text-foreground hover:bg-muted/40'
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded-full border ${resultWinner === p.id ? 'border-brand-red bg-brand-red' : 'border-muted-foreground/40'}`}
                      >
                        {resultWinner === p.id && (
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        )}
                      </span>
                      {p.nama}
                      <span className="ml-auto text-[10px] font-bold text-muted-foreground">
                        Tim {i + 1}
                      </span>
                    </button>
                  ) : null
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase text-muted-foreground">
                  Skor Tim 1
                </span>
                <Input
                  type="number"
                  min={0}
                  value={resultScore1}
                  onChange={(e) => setResultScore1(e.target.value)}
                  aria-label="Skor tim 1"
                  className="h-9 rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase text-muted-foreground">
                  Skor Tim 2
                </span>
                <Input
                  type="number"
                  min={0}
                  value={resultScore2}
                  onChange={(e) => setResultScore2(e.target.value)}
                  aria-label="Skor tim 2"
                  className="h-9 rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold uppercase text-muted-foreground">Tipe Hasil</span>
              <Select
                value={resultType}
                onValueChange={(v) => setResultType(v as typeof resultType)}
              >
                <SelectTrigger className="w-full rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="WALKOVER">Walkover (tim tidak hadir)</SelectItem>
                  <SelectItem value="DISQUALIFIED">Diskualifikasi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold uppercase text-muted-foreground">
                Catatan (opsional)
              </span>
              <Input
                type="text"
                value={resultNotes}
                onChange={(e) => setResultNotes(e.target.value)}
                placeholder="Contoh: adu penalti"
                className="h-9 rounded-lg"
                aria-label="Catatan hasil"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setResultTarget(null)}>
                Batal
              </Button>
              <Button
                size="sm"
                onClick={() => void submitResult()}
                disabled={busy === 'result' || resultWinner === null}
              >
                {busy === 'result' ? 'Menyimpan...' : 'Simpan Hasil'}
              </Button>
            </div>
          </div>
        )}
      </ResponsiveDialog>

      {/* ─── Dialog Koreksi ─── */}
      <ResponsiveDialog
        open={!!correctTarget}
        onOpenChange={(o) => {
          if (!o) {
            setCorrectTarget(null);
            setCorrectBlockMsg(null);
          }
        }}
        title="Koreksi Hasil"
        description={
          correctTarget
            ? `Match ${correctTarget.matchNumber} sudah selesai. Ubah pemenang dengan hati-hati.`
            : ''
        }
      >
        {correctTarget && (
          <div className="space-y-4 py-2">
            {correctBlockMsg && (
              <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                {correctBlockMsg}
              </p>
            )}
            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase text-muted-foreground">
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
                      className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-bold transition ${
                        correctWinner === p.id
                          ? 'border-brand-red bg-brand-red/5 text-foreground'
                          : 'border-border bg-background text-foreground hover:bg-muted/40'
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded-full border ${correctWinner === p.id ? 'border-brand-red bg-brand-red' : 'border-muted-foreground/40'}`}
                      >
                        {correctWinner === p.id && (
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        )}
                      </span>
                      {p.nama}
                      {p.id === correctTarget.winnerId && (
                        <span className="ml-auto text-[10px] font-bold text-muted-foreground">
                          pemenang saat ini
                        </span>
                      )}
                    </button>
                  ) : null
                )}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase text-muted-foreground">
                Alasan (opsional)
              </span>
              <Input
                type="text"
                value={correctReason}
                onChange={(e) => setCorrectReason(e.target.value)}
                placeholder="Contoh: salah input"
                className="h-9 rounded-lg"
                aria-label="Alasan koreksi"
              />
            </div>
            {correctInvalidate && (
              <label className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                <input
                  type="checkbox"
                  checked={correctInvalidate}
                  onChange={(e) => setCorrectInvalidate(e.target.checked)}
                  className="mt-0.5"
                />
                Batalkan hasil pertandingan berikutnya yang sudah tercatat
              </label>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setCorrectTarget(null)}>
                Batal
              </Button>
              <Button
                size="sm"
                variant={correctInvalidate ? 'destructive' : 'default'}
                onClick={() => void submitCorrect()}
                disabled={busy === 'correct' || correctWinner === null}
              >
                {busy === 'correct' ? 'Menyimpan...' : 'Koreksi & Simpan'}
              </Button>
            </div>
          </div>
        )}
      </ResponsiveDialog>

      {/* ─── Konfirmasi aksi ─── */}
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
