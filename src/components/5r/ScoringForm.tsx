/**
 * ScoringForm — form isi penilaian 5R (mobile-first, ramah tim audit).
 * Enhancements:
 * 1. Auditor Name auto-populated from active session (getSession)
 * 2. Category Section Cards (bulletproof, zero Accordion overlap bugs)
 * 3. GSAP full-bleed morphing animation on scroll for sticky header
 * 4. Full-width 5-column grid for category jump pills (A, B, C, D, E)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Check, CheckCircle2, ChevronDown, Loader2, UserCheck, AlertTriangle } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Progress } from '../ui/progress'
import { Alert, AlertDescription } from '../ui/alert'
import type { FiveRSubmission } from '../../data/5r'
import { getFiveRForm } from '../../data/5r'
import { saveSubmission } from '../../server/functions/5r'
import { getSession } from '../../server/functions/auth'
import { gsap, shouldReduceMotion } from '../../lib/gsap'
import { setFormDirty } from '../../lib/unsavedGuard'

// Helpers

function draftKey(roomId: string, formId: string) {
  return `tki5r:draft:${roomId}:${formId}`
}
const AUDITOR_KEY = 'tki5r:lastAuditor'

function loadAuditor(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(AUDITOR_KEY) ?? ''
}
function saveAuditor(name: string) {
  try { localStorage.setItem(AUDITOR_KEY, name) } catch { /* noop */ }
}
function loadDraft(roomId: string, formId: string): { answers: Record<string, number>; notes: Record<string, string> } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(draftKey(roomId, formId))
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
function saveDraft(roomId: string, formId: string, answers: Record<string, number>, notes: Record<string, string>) {
  try { localStorage.setItem(draftKey(roomId, formId), JSON.stringify({ answers, notes })) } catch { /* noop */ }
}
function clearDraft(roomId: string, formId: string) {
  try { localStorage.removeItem(draftKey(roomId, formId)) } catch { /* noop */ }
}

// Score labels — 1=Tidak Ada .. 5=Sangat Baik
const SCORE_LABELS: Record<number, string> = {
  1: 'Tidak Ada',
  2: 'Sangat Kurang',
  3: 'Kurang',
  4: 'Baik',
  5: 'Sangat Baik',
}

export default function ScoringForm({
  roomId,
  formId,
}: {
  roomId: string
  formId?: string
}) {
  const form = useMemo(() => (formId ? getFiveRForm(formId) : undefined), [formId])

  const draft = useMemo(
    () => (roomId && formId ? loadDraft(roomId, formId) : null),
    [roomId, formId],
  )
  const [answers, setAnswers] = useState<Record<string, number>>(draft?.answers ?? {})
  const [notes, setNotes] = useState<Record<string, string>>(draft?.notes ?? {})
  const [auditor, setAuditor] = useState(loadAuditor)
  const [auditorRole, setAuditorRole] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSummary, setShowSummary] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  // Auto-populate Auditor Name from active logged-in user session
  useEffect(() => {
    void getSession().then((sess) => {
      if (sess.username) {
        setAuditor(sess.username)
        setAuditorRole(sess.role ?? null)
      }
    })
  }, [])

  // Default EXPAND: semua kategori terbuka (false)
  useEffect(() => {
    if (!form || Object.keys(collapsed).length > 0) return
    const init: Record<string, boolean> = {}
    form.categories.forEach((cat) => { init[cat.id] = false })
    setCollapsed(init)
  }, [form])

  // ── GSAP sticky progress bar morph: card (normal) ↔ full-bleed (stuck) ──
  const progressBarRef = useRef<HTMLDivElement>(null)
  const [stuck, setStuck] = useState(false)

  useEffect(() => {
    const el = progressBarRef.current
    if (!el) return
    const check = () => {
      const top = el.getBoundingClientRect().top
      setStuck(top <= 64)
    }
    check()
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    return () => {
      window.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
  }, [])

  useEffect(() => {
    const el = progressBarRef.current
    if (!el || shouldReduceMotion()) return
    const mx = window.innerWidth >= 1024 ? -24 : window.innerWidth >= 640 ? -24 : -16

    gsap.to(el, {
      marginLeft: stuck ? mx : 0,
      marginRight: stuck ? mx : 0,
      borderRadius: stuck ? 0 : 12,
      borderTopWidth: stuck ? 0 : 1,
      borderLeftWidth: stuck ? 0 : 1,
      borderRightWidth: stuck ? 0 : 1,
      borderBottomWidth: 1,
      duration: 0.3,
      ease: 'power2.out',
    })
  }, [stuck])

  // ── Submit bar auto-hide ──
  const [submitVisible, setSubmitVisible] = useState(true)

  useEffect(() => {
    let lastScrollY = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      const delta = y - lastScrollY
      const atBottom = window.innerHeight + y >= document.documentElement.scrollHeight - 30
      const atTop = y <= 40
      if (atBottom || atTop) {
        setSubmitVisible(true)
      } else if (Math.abs(delta) > 8) {
        setSubmitVisible(delta < 0)
        lastScrollY = y
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const totalCriteria = form
    ? form.categories.reduce((s, c) => s + c.criteria.length, 0)
    : 0
  const answeredCount = Object.keys(answers).filter(
    (k) => answers[k] !== undefined,
  ).length

  // Auto-save draft (debounce 2 detik)
  useEffect(() => {
    if (!form || !roomId || !formId) return
    const t = setTimeout(() => saveDraft(roomId, formId, answers, notes), 2000)
    return () => clearTimeout(t)
  }, [answers, notes, form, roomId, formId])

  // ── Unsaved guard ──
  const isDirty =
    answeredCount > 0 ||
    Object.keys(notes).some((k) => notes[k].trim() !== '') ||
    auditor.trim() !== ''

  useEffect(() => {
    setFormDirty(isDirty)
    return () => setFormDirty(false)
  }, [isDirty])

  useEffect(() => {
    if (!isDirty || !form || !roomId || !formId) return
    const handler = (e: BeforeUnloadEvent) => {
      saveDraft(roomId, formId, answers, notes)
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty, answers, notes, form, roomId, formId])

  const scrollTo = useCallback((catId: string) => {
    document.getElementById(`cat-${catId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  if (!form) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        Pilih salah satu form di atas untuk mulai mengisi.
      </Card>
    )
  }

  const setScore = (criterionId: string, score: number) => {
    setAnswers((prev) => ({ ...prev, [criterionId]: score }))
  }
  const setNote = (criterionId: string, note: string) => {
    setNotes((prev) => ({ ...prev, [criterionId]: note }))
  }

  // Count per kategori
  const catProgress = form.categories.map((cat) => {
    const filled = cat.criteria.filter((c) => answers[c.id] !== undefined).length
    return { ...cat, filled, done: filled === cat.criteria.length }
  })

  const handleSubmit = () => {
    setError(null)
    if (answeredCount < totalCriteria) {
      const firstIncomplete = catProgress.find((c) => !c.done)
      if (firstIncomplete) {
        setCollapsed((prev) => ({ ...prev, [firstIncomplete.id]: false }))
        setTimeout(() => scrollTo(firstIncomplete.id), 100)
      }
      setError(`Masih ada ${totalCriteria - answeredCount} kriteria belum diisi.`)
      return
    }
    if (!auditor.trim()) {
      setError('Akun auditor tidak terdeteksi. Silakan re-login.')
      return
    }
    setShowSummary(true)
  }

  const doSubmit = async () => {
    setError(null)
    setSaving(true)
    const now = new Date().toISOString()
    const submission: FiveRSubmission = {
      id: crypto.randomUUID(),
      roomId,
      formId: form.id,
      auditor: auditor.trim(),
      answers,
      notes,
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
    }

    const res = await saveSubmission({ data: submission }).catch(() => ({
      ok: false,
      error: 'Gagal terhubung server',
    }))
    if (!res.ok) {
      setError(res.error ?? 'Gagal menyimpan')
      setSaving(false)
      setShowSummary(false)
      return
    }

    saveAuditor(auditor.trim())
    clearDraft(roomId, form.id)
    toast.success('Penilaian tersimpan!')
    setSaving(false)
    setShowSummary(false)
    setAnswers({})
    setNotes({})
  }

  const pctProgress = totalCriteria > 0 ? Math.round((answeredCount / totalCriteria) * 100) : 0

  return (
    <section className="relative space-y-3.5">
      {/* Compact Sticky Progress Header — Morphs full-bleed on scroll */}
      <div
        ref={progressBarRef}
        className="sticky top-14 z-30 overflow-hidden border border-border bg-background/95 shadow-sm backdrop-blur-md transition-shadow lg:top-0 rounded-xl"
      >
        <CardContent className="p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="truncate text-xs font-extrabold text-foreground sm:text-sm">{form.label}</h2>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">· Ruangan: <span className="font-semibold text-foreground">{roomId}</span></span>
            </div>
            <Badge variant={answeredCount === totalCriteria ? 'default' : 'outline'} className="font-mono text-xs shrink-0">
              {answeredCount}/{totalCriteria} ({pctProgress}%)
            </Badge>
          </div>

          <Progress value={pctProgress} className="h-1.5" />

          {/* Category quick navigation pills — Full-width 5-column grid */}
          <div className="grid grid-cols-5 gap-1.5 pt-0.5">
            {catProgress.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setCollapsed((prev) => ({ ...prev, [cat.id]: false }))
                  setTimeout(() => scrollTo(cat.id), 50)
                }}
                className={`flex items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-xs font-extrabold transition active:scale-95 ${
                  cat.done
                    ? 'bg-success/15 text-success hover:bg-success/20 border border-success/30'
                    : collapsed[cat.id]
                      ? 'bg-muted text-muted-foreground hover:bg-muted/80 border border-transparent'
                      : 'bg-primary/15 text-primary hover:bg-primary/20 border border-primary/30'
                }`}
              >
                {cat.done && <Check size={11} className="shrink-0" />}
                <span>{cat.label.split('.')[0]}</span>
                <span className="text-[10px] opacity-75 font-normal">({cat.filled}/{cat.criteria.length})</span>
              </button>
            ))}
          </div>
        </CardContent>
      </div>

      {/* Auditor Info Card (Auto-filled from session) */}
      <Card>
        <CardContent className="p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserCheck size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Auditor / Penilai</p>
              <p className="truncate text-xs font-bold text-foreground">{auditor || '—'}</p>
            </div>
          </div>
          {auditorRole && (
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
              {auditorRole}
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Robust Category Section Cards (No Accordion Overlap Bugs) */}
      <div className="space-y-3">
        {form.categories.map((cat) => {
          const cp = catProgress.find((c) => c.id === cat.id)!
          const isCollapsed = collapsed[cat.id] ?? false

          return (
            <div
              key={cat.id}
              id={`cat-${cat.id}`}
              className="scroll-mt-28 overflow-hidden rounded-xl border border-border bg-card shadow-xs"
            >
              {/* Category Header Bar */}
              <button
                type="button"
                onClick={() => setCollapsed((prev) => ({ ...prev, [cat.id]: !isCollapsed }))}
                className={`flex w-full items-center justify-between px-4 py-3 text-left transition ${
                  cp.done ? 'bg-success/10 text-success hover:bg-success/15' : 'bg-muted/40 text-foreground hover:bg-muted/60'
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-extrabold">
                  {cp.done ? <CheckCircle2 size={16} className="text-success shrink-0" /> : null}
                  <span>{cat.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={cp.done ? 'default' : 'outline'} className="text-xs font-mono">
                    {cp.filled}/{cat.criteria.length}
                  </Badge>
                  <ChevronDown
                    size={16}
                    className={`text-muted-foreground transition-transform duration-200 ${
                      !isCollapsed ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Category Criteria Body */}
              {!isCollapsed && (
                <div className="p-4 space-y-3 border-t border-border bg-card">
                  {cat.criteria.map((c) => {
                    const answered = answers[c.id] !== undefined
                    const selectedScore = answers[c.id]
                    const selectedOpt = c.options.find((o) => o.score === selectedScore)

                    return (
                      <div
                        key={c.id}
                        className={`rounded-xl border p-3.5 space-y-2.5 transition ${
                          answered
                            ? 'border-success/40 bg-success/[0.03]'
                            : 'border-border bg-card'
                        }`}
                      >
                        {/* Criterion title */}
                        <div className="flex items-start gap-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                            {c.order}
                          </span>
                          <p className="text-sm font-semibold text-foreground leading-snug">
                            {c.text}
                          </p>
                        </div>

                        {/* Rating 1-5 Pills */}
                        <div className="grid grid-cols-5 gap-1.5">
                          {c.options.map((opt) => {
                            const selected = selectedScore === opt.score
                            return (
                              <button
                                key={opt.score}
                                type="button"
                                onClick={() => setScore(c.id, opt.score)}
                                aria-pressed={selected}
                                className={`flex flex-col items-center justify-center rounded-lg border py-2 px-1 text-center transition active:scale-95 ${
                                  selected
                                    ? 'border-success bg-success text-white shadow-xs'
                                    : 'border-border bg-background hover:border-muted-foreground/30 text-foreground'
                                }`}
                              >
                                <span className="text-sm font-extrabold leading-none">{opt.score}</span>
                                <span className={`mt-1 text-[9px] font-semibold leading-tight text-center ${selected ? 'text-white/90' : 'text-muted-foreground'}`}>
                                  {SCORE_LABELS[opt.score]}
                                </span>
                              </button>
                            )
                          })}
                        </div>

                        {/* Selected option description snippet */}
                        {answered && selectedOpt && (
                          <div className="rounded-lg bg-success/10 px-3 py-1.5 text-xs font-medium text-success border border-success/20">
                            <span className="font-bold">Skor {selectedScore}: </span>
                            {selectedOpt.desc}
                          </div>
                        )}

                        {/* Optional Note */}
                        <Input
                          type="text"
                          value={notes[c.id] ?? ''}
                          onChange={(e) => setNote(c.id, e.target.value)}
                          placeholder="Catatan tambahan (opsional)..."
                          className="h-8 bg-background/50 text-xs"
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Safe Sticky Bottom Submit Bar */}
      <div
        className={`sticky bottom-0 z-40 -mx-4 border-t border-border bg-background/95 px-4 py-3 shadow-lg backdrop-blur-md transition-transform duration-300 ease-in-out sm:-mx-6 sm:px-6 ${
          submitVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="space-y-2 max-w-5xl mx-auto">
          {error && (
            <p className="rounded-lg bg-destructive/10 px-3.5 py-2 text-xs font-bold text-destructive">
              {error}
            </p>
          )}
          <Button
            onClick={handleSubmit}
            disabled={saving}
            size="lg"
            className="w-full text-sm font-bold shadow-md shadow-primary/20"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Menyimpan...
              </>
            ) : (
              `Submit Penilaian (${answeredCount}/${totalCriteria})`
            )}
          </Button>
        </div>
      </div>

      {/* Summary Confirmation Dialog */}
      <Dialog open={showSummary} onOpenChange={(o) => { if (!o) setShowSummary(false) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
              Konfirmasi Submit Penilaian
            </DialogTitle>
            <DialogDescription>Review hasil penilaian sebelum dikirim ke sistem.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Alert className="border-warning/40 bg-warning/10 text-warning-foreground py-2.5">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
              <AlertDescription className="text-xs leading-relaxed">
                Periksa kembali seluruh jawaban sebelum mengirim. Data penilaian yang sudah dikirim akan tersimpan ke sistem.
              </AlertDescription>
            </Alert>

            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ruangan</span>
                <span className="font-bold text-foreground">{roomId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Form Checklist</span>
                <span className="font-bold text-foreground">{form.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Auditor / Penilai</span>
                <span className="font-bold text-foreground">{auditor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Kriteria</span>
                <span className="font-bold text-foreground">{answeredCount}/{totalCriteria} diisi</span>
              </div>
            </div>

            <div className="border-t border-border pt-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Progres per Kategori</p>
              <div className="grid grid-cols-5 gap-1.5">
                {catProgress.map((cat) => (
                  <div key={cat.id} className="rounded-lg bg-muted p-2 text-center">
                    <p className="text-[10px] font-bold text-muted-foreground">{cat.label.split('.')[0]}</p>
                    <p className="text-xs font-extrabold text-foreground mt-0.5">
                      {cat.done ? `${Math.round((cat.filled / cat.criteria.length) * 100)}%` : '--'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:flex-row mt-2">
            <Button variant="outline" onClick={() => setShowSummary(false)} className="flex-1">
              Review Kembali
            </Button>
            <Button onClick={() => void doSubmit()} disabled={saving} className="flex-1">
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-1.5" />
                  Mengirim...
                </>
              ) : (
                'Ya, Kirim Sekarang'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}