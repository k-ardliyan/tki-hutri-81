/**
 * PetugasDashboard — dashboard petugas, mobile-first.
 * CTA "Ambil Tanpa QR" prominent di atas → buka Drawer search (bottom sheet).
 * Detail per tim: accordion siapa sudah ambil.
 */
import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ChevronRight, Loader2, Search, UserPlus, Users } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '../../components/ui/drawer'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import StatCard from '../../components/ui/StatCard'
import FeedbackBanner from '../../components/ui/FeedbackBanner'
import SnackTeamAccordion from '../../components/snack/SnackTeamAccordion'
import { getRedemptionSummary, searchEmployees, redeemSnack } from '../../server/functions/snack'
import { getSession } from '../../server/functions/auth'

export const Route = createFileRoute('/petugas/dashboard')({
  component: PetugasDashboardPage,
})

interface SearchResult {
  id: number
  nama: string
  nip: string | null
  divisi: string | null
}

type Summary = {
  active: { id: number; name: string; quota: number; isActive: boolean; createdAt: Date } | null
  teams: Array<{
    id: number
    nama: string
    kode: string
    kategori: string
    total: number
    redeemed: number
    done: boolean
    full: boolean
  }>
  totalRedeemed: number
  totalQuota: number
  sessions: Array<{ id: number; name: string; quota: number; isActive: boolean; createdAt: Date }>
}

function PetugasDashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [claimedBy, setClaimedBy] = useState('')
  const [sessionId, setSessionId] = useState<number | null>(null)

  // Drawer "Ambil Tanpa QR"
  const [showSearch, setShowSearch] = useState(false)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const [s, sess] = await Promise.all([getRedemptionSummary({ data: {} }), getSession()])
      setSummary(s)
      setClaimedBy(sess.username ?? 'petugas')
      setSessionId(s.active?.id ?? null)
    }
    void init()
  }, [])

  const openSearch = () => {
    setQ(''); setResults([]); setErr(null); setShowSearch(true)
  }

  const doSearch = async () => {
    setErr(null)
    if (!q.trim()) { setResults([]); return }
    setSearching(true)
    try {
      const res = await searchEmployees({ data: { q, limit: 8 } })
      setResults(res)
    } catch {
      setErr('Gagal mencari karyawan')
    } finally {
      setSearching(false)
    }
  }

  const redeemOne = async (id: number) => {
    if (!sessionId) { setErr('Tidak ada sesi aktif'); return }
    setErr(null)
    const res = await redeemSnack({ data: { sessionId, employeeIds: [id], claimedBy } })
    if (!res.ok) { setErr(res.error ?? 'Gagal'); return }
    if (res.skipped.length > 0) {
      const r = res.skipped[0]
      setErr(`${r.claimedBy} sudah ambil pada ${new Date(r.claimedAt).toLocaleString('id-ID')}`)
    } else {
      toast.success('1 porsi dicatat!')
      setResults([]); setQ('')
      const s = await getRedemptionSummary({ data: {} })
      setSummary(s)
    }
  }

  const active = summary?.active
  const teams = summary?.teams ?? []

  return (
    <div className="space-y-4">
      {/* Header */}
      <section>
        <h1 className="text-lg font-extrabold tracking-tight text-foreground">Dashboard Snack</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Sesi: <b>{active?.name ?? '—'}</b> · {active?.quota ?? 0} kuota</p>
      </section>

      {/* CTA prominent — Ambil Tanpa QR (mobile-first, di atas) */}
      <button
        type="button"
        onClick={openSearch}
        className="flex w-full items-center gap-3 rounded-lg bg-primary px-4 py-3.5 text-left shadow-lg shadow-primary/15 transition hover:brightness-110 active:scale-[0.99]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
          <UserPlus size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-extrabold text-white">Ambil Snack Tanpa QR</span>
          <span className="block text-[10px] text-white/80">Cari karyawan, catat pengambilan langsung</span>
        </span>
        <ChevronRight size={16} className="text-white/70" />
      </button>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Users} label="Kelompok Ambil" value={`${active ? teams.filter((t) => t.done).length : 0}/${teams.length}`} />
        <StatCard icon={Users} iconCls="bg-warning/10 text-warning" label="Porsi Terambil" value={`${active ? summary.totalRedeemed : 0}/${active?.quota ?? 0}`} />
      </div>

      {/* Accordion detail per tim */}
      <Card>
        <CardContent className="px-0 py-0">
          <div className="px-4 py-3">
            <p className="text-xs font-bold text-muted-foreground">Detail Kelompok</p>
          </div>
          {teams.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">Belum ada data.</p>
          ) : (
            <SnackTeamAccordion teams={teams} sessionId={active?.id ?? null} />
          )}
        </CardContent>
      </Card>

      {/* Drawer search — Ambil Tanpa QR (bottom sheet mobile / centered desktop) */}
      <Drawer open={showSearch} onOpenChange={setShowSearch}>
        <DrawerContent className="mx-auto max-w-md">
          <DrawerHeader>
            <DrawerTitle>Ambil Tanpa QR</DrawerTitle>
            <DrawerDescription>Cari karyawan, lalu catat pengambilan.</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-3 px-4 pb-6">
            {/* Search input */}
            <div className="space-y-1.5">
              <Label>Cari Karyawan</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground/60" />
                  <Input
                    type="text"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                    placeholder="Nama / NIP"
                    autoFocus
                    className="pl-9"
                  />
                </div>
                <Button onClick={doSearch} disabled={!q.trim() || searching}>
                  {searching ? <Loader2 size={14} className="animate-spin" /> : 'Cari'}
                </Button>
              </div>
            </div>

            {/* Feedback */}
            {err && <FeedbackBanner tone="error">{err}</FeedbackBanner>}

            {/* Empty state */}
            {!searching && results.length === 0 && !err && (
              <div className="rounded-md bg-muted/50 px-4 py-6 text-center">
                <Users size={20} className="mx-auto text-muted-foreground/40" />
                <p className="mt-2 text-xs font-semibold text-muted-foreground">Ketik nama atau NIP untuk mencari</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground/70">Karyawan PKL tidak tampil (tidak eligible)</p>
              </div>
            )}

            {/* Results */}
            {results.length > 0 && (
              <div className="divide-y divide-border rounded-md border border-border">
                {results.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                      {r.nama.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground/90">{r.nama}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{r.divisi ?? '—'}{r.nip ? ` · ${r.nip}` : ''}</p>
                    </div>
                    <Button size="sm" onClick={() => redeemOne(r.id)} className="shrink-0 rounded-full px-3.5">
                      Ambil
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}