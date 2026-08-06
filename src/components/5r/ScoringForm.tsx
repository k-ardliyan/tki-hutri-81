/**
 * ScoringForm — form isi penilaian 5R (mobile-first, ramah tim audit).
 *
 * UX improvements (design-taste-frontend):
 * - Score buttons: labels visible below number (1=Tidak Ada..5=Sangat Baik)
 * - Better visual feedback: green tint for scored, dashed for empty
 * - Larger category pills on mobile
 * - Thicker progress bar
 * - Bottom submit: full-width with shadow
 * - Shape consistency: radius-md throughout
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FiveRSubmission } from '../../data/5r'
import { getFiveRForm } from '../../data/5r'
import { saveSubmission } from '../../server/functions/5r'
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

// Score labels — shown under each button on mobile
const SCORE_LABELS: Record<number, string> = {
  1: 'Tidak Ada',
  2: 'Sangat Kurang',
  3: 'Kurang',
  4: 'Baik',
  5: 'Sangat Baik',
}

// Component

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
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSummary, setShowSummary] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  // Initialize collapsed: first category open, rest collapsed
  useEffect(() => {
    if (!form || Object.keys(collapsed).length > 0) return
    const init: Record<string, boolean> = {}
    form.categories.forEach((cat, i) => { init[cat.id] = i !== 0 })
    setCollapsed(init)
  }, [form])

  // ── Sticky progress bar morph: card (normal) ↔ full-bleed (stuck) ──
  const progressBarRef = useRef<HTMLDivElement>(null)
  const [stuck, setStuck] = useState(false)

  useEffect(() => {
    const el = progressBarRef.current
    if (!el) return
    const check = () => setStuck(el.getBoundingClientRect().top <= 56)
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
    const mx = window.innerWidth >= 640 ? -24 : -16
    gsap.to(el, {
      marginLeft: stuck ? mx : 0,
      marginRight: stuck ? mx : 0,
      borderRadius: stuck ? 0 : 16,
      borderTopWidth: stuck ? 0 : 1,
      borderRightWidth: stuck ? 0 : 1,
      borderLeftWidth: stuck ? 0 : 1,
      borderBottomWidth: 1,
      duration: 0.3,
      ease: 'power2.out',
      clearProps: stuck ? 'none' : 'all',
    })
  }, [stuck])

  // ── Submit bar auto-hide: scroll down → hide, up → show, bottom → show ──
  const submitBarRef = useRef<HTMLDivElement>(null)
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

  useEffect(() => {
    const el = submitBarRef.current
    if (!el || shouldReduceMotion()) {
      if (el) el.style.transform = submitVisible ? 'translateY(0)' : 'translateY(100%)'
      return
    }
    gsap.to(el, {
      y: submitVisible ? 0 : '100%',
      duration: 0.35,
      ease: 'power3.out',
    })
  }, [submitVisible])

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

  // ── Unsaved guard: notify shell + beforeunload + flush draft ──
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
      saveDraft(roomId, formId, answers, notes) // flush segera
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
      <section className="surface-card p-5 text-sm text-slate-500">
        Pilih salah satu form di atas untuk mulai mengisi.
      </section>
    )
  }

  const setScore = (criterionId: string, score: number) => {
    setAnswers((prev) => ({ ...prev, [criterionId]: score }))
    setSaved(false)
  }
  const setNote = (criterionId: string, note: string) => {
    setNotes((prev) => ({ ...prev, [criterionId]: note }))
  }

  const toggleCollapse = (catId: string) => {
    setCollapsed((prev) => ({ ...prev, [catId]: !prev[catId] }))
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
      setError('Isi nama auditor (penilai).')
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
    setSaved(true)
    setSaving(false)
    setShowSummary(false)
    setAnswers({})
    setNotes({})
  }

  return (
    <section className="relative">
      {/* Sticky progress bar — morph card ↔ full-bleed via GSAP */}
      <div
        ref={progressBarRef}
        className="sticky top-14 z-30 rounded-[var(--radius-lg)] border border-slate-200 bg-white/95 px-4 py-2.5 shadow-sm shadow-slate-900/5 backdrop-blur-xl sm:px-6 lg:top-0"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-extrabold text-slate-900 sm:text-sm">{form.label}</h2>
          <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-bold text-brand-red">
            {answeredCount}/{totalCriteria}
          </span>
        </div>
        {/* Progress bar — thicker */}
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-brand-red transition-all duration-300"
            style={{ width: `${totalCriteria > 0 ? (answeredCount / totalCriteria) * 100 : 0}%` }}
          />
        </div>

        {/* Category pills — larger on mobile */}
        <div className="mt-2.5 flex gap-1.5 overflow-x-auto no-scrollbar">
          {catProgress.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setCollapsed((prev) => ({ ...prev, [cat.id]: false }))
                setTimeout(() => scrollTo(cat.id), 50)
              }}
              className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
                cat.done
                  ? 'bg-status-done-soft text-status-done'
                  : collapsed[cat.id]
                    ? 'bg-slate-100 text-slate-500'
                    : 'bg-brand-red/10 text-brand-red'
              }`}
            >
              {cat.done && <i className="fa-solid fa-check text-[9px]" />}
              {cat.label.split('.')[0]}
              <span className="text-[9px] opacity-60">{cat.filled}/{cat.criteria.length}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Auditor */}
      <div className="px-4 pt-5 sm:px-6">
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Nama Auditor</span>
          <input
            type="text"
            value={auditor}
            onChange={(e) => setAuditor(e.target.value)}
            placeholder="Nama penilai"
            className="mt-1.5 w-full rounded-[var(--radius-md)] border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-red focus:ring-2 focus:ring-brand-red/15"
          />
        </label>
      </div>

      {/* Categories */}
      <div className="space-y-3 px-4 pt-4 pb-5 sm:px-6">
        {form.categories.map((cat) => {
          const cp = catProgress.find((c) => c.id === cat.id)!
          const isCollapsed = collapsed[cat.id] ?? (cat.id !== form.categories[0]?.id)
          return (
            <div key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-[10rem] lg:scroll-mt-28">
              {/* Category header */}
              <button
                type="button"
                onClick={() => toggleCollapse(cat.id)}
                className={`flex w-full items-center justify-between rounded-[var(--radius-md)] px-3.5 py-2.5 text-xs font-extrabold transition ${
                  cp.done
                    ? 'bg-status-done-soft text-status-done'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{cat.label}</span>
                  {cp.done && <i className="fa-solid fa-check-circle text-[10px]" />}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold opacity-60">
                    {cp.filled}/{cat.criteria.length}
                  </span>
                  <i className={`fa-solid fa-chevron-${isCollapsed ? 'down' : 'up'} text-[10px] opacity-40`} />
                </div>
              </button>

              {/* Criteria */}
              {!isCollapsed && (
                <div className="mt-2 space-y-2.5">
                  {cat.criteria.map((c) => {
                    const answered = answers[c.id] !== undefined
                    return (
                      <div
                        key={c.id}
                        className={`rounded-[var(--radius-md)] border p-3 transition ${
                          answered
                            ? 'border-status-done/30 bg-status-done/[0.06]'
                            : 'border-dashed border-slate-200'
                        }`}
                      >
                        <p className="text-sm font-semibold text-slate-800">
                          <span className="text-slate-400">{c.order}.</span> {c.text}
                        </p>

                        {/* Score buttons with labels */}
                        <div className="mt-2.5 grid grid-cols-5 gap-1.5">
                          {c.options.map((opt) => {
                            const selected = answers[c.id] === opt.score
                            return (
                              <button
                                key={opt.score}
                                type="button"
                                onClick={() => setScore(c.id, opt.score)}
                                aria-pressed={selected}
                                className={`flex h-auto min-h-[3rem] flex-col items-center justify-center gap-0.5 rounded-[var(--radius-sm)] border py-1.5 text-center transition active:scale-95 ${
                                  selected
                                    ? 'border-status-done bg-status-done text-white shadow-sm'
                                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                }`}
                              >
                                <span className="text-sm font-bold leading-none">{opt.score}</span>
                                <span className={`hidden text-[8px] font-semibold leading-tight sm:block ${selected ? 'text-white/80' : 'text-slate-400'}`}>
                                  {SCORE_LABELS[opt.score]}
                                </span>
                              </button>
                            )
                          })}
                        </div>

                        {/* Description */}
                        {answered && (
                          <p className="mt-2 rounded-[var(--radius-sm)] bg-status-done-soft/50 px-2.5 py-1.5 text-xs text-slate-600">
                            {c.options.find((o) => o.score === answers[c.id])?.desc}
                          </p>
                        )}

                        {/* Note */}
                        <input
                          type="text"
                          value={notes[c.id] ?? ''}
                          onChange={(e) => setNote(c.id, e.target.value)}
                          placeholder="Catatan (opsional)"
                          className="mt-2 w-full rounded-[var(--radius-sm)] border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-brand-red"
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

      {/* Bottom submit — auto-hide via GSAP, di atas bottom nav (mobile) */}
      <div
        ref={submitBarRef}
        style={{ pointerEvents: submitVisible ? 'auto' : 'none' }}
        className="sticky bottom-[calc(3.25rem+env(safe-area-inset-bottom,0px))] z-40 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3.5 shadow-[0_-2px_10px_-4px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:-mx-6 sm:px-6 lg:bottom-0"
      >
        {error && (
          <p className="mb-2 rounded-[var(--radius-md)] bg-status-danger-soft px-3 py-2 text-xs font-semibold text-status-danger">
            {error}
          </p>
        )}
        {saved && (
          <p className="mb-2 rounded-[var(--radius-md)] bg-status-done-soft px-3 py-2 text-xs font-semibold text-status-done">
            Tersimpan! Bisa isi lagi untuk penilaian berikutnya.
          </p>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="w-full cursor-pointer rounded-[var(--radius-md)] bg-brand-red px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-red/15 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? 'Menyimpan...' : `Submit Penilaian (${answeredCount}/${totalCriteria})`}
        </button>
      </div>

      {/* Summary modal */}
      {showSummary && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
            <h3 className="text-base font-extrabold text-slate-900">Konfirmasi Submit</h3>
            <p className="mt-1 text-xs text-slate-500">Pastikan semua jawaban sudah benar.</p>

            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Ruangan</span>
                <span className="font-bold text-slate-900">{roomId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Form</span>
                <span className="font-bold text-slate-900">{form.label}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Auditor</span>
                <span className="font-bold text-slate-900">{auditor}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Kriteria diisi</span>
                <span className="font-bold text-slate-900">{answeredCount}/{totalCriteria}</span>
              </div>

              <div className="mt-3 border-t border-slate-100 pt-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Skor per Kategori</p>
                <div className="mt-2 grid grid-cols-5 gap-1.5">
                  {catProgress.map((cat) => (
                    <div key={cat.id} className="rounded-[var(--radius-sm)] bg-slate-50 p-1.5 text-center">
                      <p className="text-[9px] font-bold text-slate-400">{cat.label.split('.')[0]}</p>
                      <p className="text-xs font-bold text-slate-800">
                        {cat.done ? `${Math.round((cat.filled / cat.criteria.length) * 100)}%` : '--'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setShowSummary(false)}
                className="flex-1 cursor-pointer rounded-[var(--radius-md)] border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={doSubmit}
                disabled={saving}
                className="flex-1 cursor-pointer rounded-[var(--radius-md)] bg-brand-red px-4 py-2.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
              >
                {saving ? 'Menyimpan...' : 'Ya, Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
