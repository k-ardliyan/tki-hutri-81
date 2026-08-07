/**
 * AdminEmployees — kelola master karyawan via Drawer.
 * Create/Edit: drawer (nama, nip, divisi, eligible). Inline: search, delete.
 */
import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Checkbox } from '../../components/ui/checkbox'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '../../components/ui/drawer'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import FeedbackBanner from '../../components/ui/FeedbackBanner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog'
import { listEmployees, createEmployee, updateEmployee, deleteEmployee } from '../../server/functions/admin'

export const Route = createFileRoute('/admin/employees')({
  beforeLoad: async () => {
    const { requireRole } = await import('../../lib/routeGuard')
    await requireRole(['superadmin', 'admin'])
  },
  component: AdminEmployees,
})

const PAGE_SIZE = 30

interface EmployeeRow { id: number; nama: string; nip: string | null; divisi: string | null; isSnackEligible: boolean }

function AdminEmployees() {
  const [rows, setRows] = useState<EmployeeRow[]>([])
  const [q, setQ] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [err, setErr] = useState<string | null>(null)

  // Drawer state
  const [showDrawer, setShowDrawer] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [nama, setNama] = useState('')
  const [nip, setNip] = useState('')
  const [divisi, setDivisi] = useState('')
  const [eligible, setEligible] = useState(true)

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<EmployeeRow | null>(null)

  const load = async (query?: string) => {
    setRows(await listEmployees({ data: { q: query ?? (q || undefined), limit: 200 } }))
    setVisibleCount(PAGE_SIZE)
  }
  useEffect(() => { void load() }, [])

  const openCreate = () => { setEditId(null); setNama(''); setNip(''); setDivisi(''); setEligible(true); setShowDrawer(true) }
  const openEdit = (r: EmployeeRow) => { setEditId(r.id); setNama(r.nama); setNip(r.nip ?? ''); setDivisi(r.divisi ?? ''); setEligible(r.isSnackEligible); setShowDrawer(true) }

  const submit = async () => {
    setErr(null)
    if (!nama.trim()) { setErr('Nama wajib'); return }
    if (editId !== null) {
      await updateEmployee({ data: { id: editId, nama: nama.trim(), nip: nip || null, divisi: divisi || null, isSnackEligible: eligible } })
      toast.success('Karyawan diupdate!')
    } else {
      await createEmployee({ data: { nama: nama.trim(), nip: nip || null, divisi: divisi || null, isSnackEligible: eligible } })
      toast.success('Karyawan ditambah!')
    }
    setShowDrawer(false); await load()
  }

  const remove = async () => {
    if (!deleteTarget) return
    await deleteEmployee({ data: { id: deleteTarget.id } }); setDeleteTarget(null); await load()
    toast.success('Karyawan dihapus')
  }

  const visibleRows = rows.slice(0, visibleCount)
  const hasMore = rows.length > visibleCount

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-foreground sm:text-xl">Karyawan</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{rows.length} karyawan · master data</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground/60" />
            <Input
              type="text"
              value={q}
              onChange={(e) => { setQ(e.target.value); void load(e.target.value) }}
              placeholder="Cari nama / NIP..."
              className="w-40 pl-9 sm:w-56"
            />
          </div>
          <Button onClick={openCreate}>
            <Plus size={14} className="mr-1" />Karyawan
          </Button>
        </div>
      </section>

      {err && <FeedbackBanner tone="error">{err}</FeedbackBanner>}

      <Card className="divide-y divide-border">
        {visibleRows.length === 0 && <p className="px-4 py-6 text-center text-xs text-muted-foreground">Tidak ada karyawan.</p>}
        {visibleRows.map((r) => (
          <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground/90">{r.nama}</p>
              <p className="text-[10px] text-muted-foreground">{r.divisi ?? '—'}{r.nip ? ` · ${r.nip}` : ''}</p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.isSnackEligible ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
              {r.isSnackEligible ? 'Eligible' : 'Tidak'}
            </span>
            <Button variant="secondary" size="sm" onClick={() => openEdit(r)} className="h-6 px-2 text-[10px] font-bold">Edit</Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(r)} className="text-destructive hover:bg-rose-50">
              <Trash2 size={13} />
            </Button>
          </div>
        ))}
        {hasMore && (
          <Button
            variant="ghost"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="w-full rounded-none py-3 text-xs font-bold text-primary"
          >
            Muat Lagi ({rows.length - visibleCount} tersisa)
          </Button>
        )}
      </Card>

      {/* Create/Edit Drawer */}
      <Drawer open={showDrawer} onOpenChange={setShowDrawer}>
        <DrawerContent className="mx-auto max-w-md">
          <DrawerHeader>
            <DrawerTitle>{editId !== null ? 'Edit Karyawan' : 'Tambah Karyawan'}</DrawerTitle>
            <DrawerDescription>Lengkapi data karyawan.</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-3 px-4">
            <div className="space-y-1.5">
              <Label htmlFor="emp-nama">Nama Lengkap</Label>
              <Input id="emp-nama" type="text" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama lengkap" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="emp-nip">NIP</Label>
                <Input id="emp-nip" type="text" value={nip} onChange={(e) => setNip(e.target.value)} placeholder="Opsional" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emp-divisi">Divisi</Label>
                <Input id="emp-divisi" type="text" value={divisi} onChange={(e) => setDivisi(e.target.value)} placeholder="Opsional" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Checkbox checked={eligible} onCheckedChange={(v) => setEligible(!!v)} />
              Eligible snack
            </label>
          </div>
          <DrawerFooter>
            <Button variant="outline" onClick={() => setShowDrawer(false)}>Batal</Button>
            <Button onClick={submit}>{editId !== null ? 'Simpan' : 'Tambah'}</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus karyawan?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.nama}. Tindakan ini tidak bisa dibatalkan.
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