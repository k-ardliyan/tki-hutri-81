/**
 * AdminSnackSessions — admin set sesi snack + kuota porsi.
 * CRUD via Drawer: buat sesi, edit nama+kuota, toggle aktif, hapus (AlertDialog).
 */
import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '../../../components/ui/drawer'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Progress } from '../../../components/ui/progress'
import FeedbackBanner from '../../../components/ui/FeedbackBanner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog'
import { getSessions, createSession, updateSession, deleteSession } from '../../../server/functions/snack'

export const Route = createFileRoute('/admin/snack/sessions')({
  component: AdminSnackSessions,
})

interface SessionRow {
  id: number
  name: string
  quota: number
  isActive: boolean
  createdAt: Date
  redeemed?: number
  remaining?: number
}

function AdminSnackSessions() {
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [err, setErr] = useState<string | null>(null)

  // Create drawer
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newQuota, setNewQuota] = useState('')

  // Edit drawer
  const [editTarget, setEditTarget] = useState<SessionRow | null>(null)
  const [editName, setEditName] = useState('')
  const [editQuota, setEditQuota] = useState('')

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<SessionRow | null>(null)

  const load = async () => { setSessions(await getSessions()) }
  useEffect(() => { void load() }, [])

  const doCreate = async () => {
    setErr(null)
    const q = Number(newQuota)
    if (!newName.trim()) { setErr('Nama sesi wajib'); return }
    if (Number.isNaN(q) || q < 0) { setErr('Kuota harus angka >= 0'); return }
    await createSession({ data: { name: newName.trim(), quota: q } })
    setNewName(''); setNewQuota(''); setShowCreate(false); toast.success('Sesi dibuat!')
    await load()
  }

  const doEdit = async () => {
    setErr(null)
    if (!editTarget) return
    const q = Number(editQuota)
    if (!editName.trim()) { setErr('Nama sesi wajib'); return }
    if (Number.isNaN(q) || q < 0) { setErr('Kuota harus angka >= 0'); return }
    // Guard: kuota total baru tidak boleh kurang dari yang sudah terambil
    const taken = editTarget.redeemed ?? 0
    if (q < taken) {
      setErr(`Kuota ${q} kurang dari ${taken} yang sudah terambil. Minimal ${taken}.`)
      return
    }
    await updateSession({ data: { id: editTarget.id, name: editName.trim(), quota: q } })
    setEditTarget(null); toast.success('Sesi diupdate!')
    await load()
  }

  const toggleActive = async (s: SessionRow) => {
    await updateSession({ data: { id: s.id, isActive: !s.isActive } })
    await load()
    toast.success(s.isActive ? 'Sesi dinonaktifkan' : 'Sesi diaktifkan')
  }

  const remove = async () => {
    if (!deleteTarget) return
    await deleteSession({ data: { id: deleteTarget.id } }); setDeleteTarget(null); await load()
    toast.success('Sesi dihapus')
  }

  return (
    <div className="space-y-5">
      <section className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-foreground sm:text-xl">Sesi Snack & Kuota</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Buat sesi, set porsi kuota, aktifkan/nonaktifkan.</p>
        </div>
        <Button onClick={() => { setNewName(''); setNewQuota(''); setShowCreate(true) }}>
          <Plus size={14} className="mr-1" />Sesi
        </Button>
      </section>

      {err && <FeedbackBanner tone="error">{err}</FeedbackBanner>}

      {/* Session list */}
      <Card className="divide-y divide-border">
        {sessions.length === 0 && <p className="px-4 py-6 text-center text-xs text-muted-foreground">Belum ada sesi.</p>}
        {sessions.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground">
                {s.name}
                {s.isActive && <span className="ml-2 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">AKTIF</span>}
              </p>
              <p className="text-[10px] text-muted-foreground">#{s.id} · Kuota {s.quota}</p>
              {s.remaining !== undefined && (
                <div className="mt-1.5 flex items-center gap-2">
                  <Progress
                    value={s.quota > 0 ? Math.max(0, Math.min(100, ((s.quota - s.remaining) / s.quota) * 100)) : 0}
                    className={`h-1.5 w-32 [&_[data-slot=progress-indicator]]:${s.remaining === 0 ? 'bg-destructive' : s.remaining <= s.quota * 0.2 ? 'bg-warning' : 'bg-success'}`}
                  />
                  <span className={`text-[10px] font-bold ${s.remaining === 0 ? 'text-destructive' : s.remaining <= s.quota * 0.2 ? 'text-warning' : 'text-success'}`}>
                    Sisa {s.remaining}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="secondary" size="sm" onClick={() => { setEditTarget(s); setEditName(s.name); setEditQuota(String(s.quota)) }} className="h-6 px-2.5 text-[10px] font-bold">
                Edit
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => toggleActive(s)}
                className={`h-6 px-2.5 text-[10px] font-bold ${s.isActive ? 'bg-warning/15 text-warning hover:bg-warning/25' : 'bg-success/10 text-success hover:bg-success/20'}`}
              >
                {s.isActive ? 'Nonaktif' : 'Aktifkan'}
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(s)} className="text-destructive hover:bg-rose-50">
                <Trash2 size={13} />
              </Button>
            </div>
          </div>
        ))}
      </Card>

      {/* Create Drawer */}
      <Drawer open={showCreate} onOpenChange={setShowCreate}>
        <DrawerContent className="mx-auto max-w-md">
          <DrawerHeader>
            <DrawerTitle>Buat Sesi Baru</DrawerTitle>
            <DrawerDescription>Tentukan nama dan kuota porsi.</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-3 px-4">
            <div className="space-y-1.5">
              <Label htmlFor="sess-name">Nama Sesi</Label>
              <Input id="sess-name" type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Contoh: Snack Pagi" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sess-quota">Kuota Porsi</Label>
              <Input id="sess-quota" type="number" value={newQuota} onChange={(e) => setNewQuota(e.target.value)} placeholder="0" min={0} />
            </div>
          </div>
          <DrawerFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Batal</Button>
            <Button onClick={() => void doCreate()}>Simpan</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Edit Drawer */}
      <Drawer open={!!editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null) }}>
        <DrawerContent className="mx-auto max-w-md">
          <DrawerHeader>
            <DrawerTitle>Edit Sesi</DrawerTitle>
            <DrawerDescription>Ubah nama dan kuota total.</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-3 px-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-sess-name">Nama Sesi</Label>
              <Input id="edit-sess-name" type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nama sesi" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-sess-quota">Kuota Total</Label>
              <Input id="edit-sess-quota" type="number" value={editQuota} onChange={(e) => setEditQuota(e.target.value)} min={0} />
              <p className="text-[10px] text-muted-foreground">
                Isi angka total, misal naik 100 → 110. Sisa dihitung otomatis.
              </p>
            </div>
            {editTarget && (
              <div className="grid grid-cols-2 gap-2 rounded-md bg-muted/50 px-3 py-2.5 text-center">
                <div>
                  <p className="text-sm font-extrabold text-foreground/80">{editTarget.redeemed ?? 0}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Terambil</p>
                </div>
                <div>
                  <p className={`text-sm font-extrabold ${(() => {
                    const q = Number(editQuota)
                    const taken = editTarget.redeemed ?? 0
                    if (Number.isNaN(q) || q < 0) return 'text-destructive'
                    return q - taken < 0 ? 'text-destructive' : 'text-success'
                  })()}`}>
                    {(() => {
                      const q = Number(editQuota)
                      const taken = editTarget.redeemed ?? 0
                      if (Number.isNaN(q)) return '—'
                      return Math.max(0, q - taken)
                    })()}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Sisa Setelah</p>
                </div>
              </div>
            )}
          </div>
          <DrawerFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Batal</Button>
            <Button onClick={() => void doEdit()}>Simpan</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus sesi?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name}. Data redemption ikut terhapus. Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}