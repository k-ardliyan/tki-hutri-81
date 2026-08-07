/**
 * IsiPage — form picker + scoring form.
 * Flow: room picker → form picker → ScoringForm.
 */
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '../../components/ui/breadcrumb'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import RoomIcon from '../../components/ui/RoomIcon'
import { getRooms, getForms } from '../../server/functions/5r'
import ScoringForm from '../../components/5r/ScoringForm'
import RiwayatHariIni from '../../components/5r/RiwayatHariIni'

import { PageHeader } from '../../components/ui/page-header'
import { InteractiveCard } from '../../components/ui/interactive-card'

const searchSchema = z.object({
  room: z.string().optional(),
  form: z.string().optional(),
})

export const Route = createFileRoute('/admin/isi')({
  validateSearch: searchSchema,
  loader: async () => {
    const [rooms, forms] = await Promise.all([getRooms(), getForms()])
    return { rooms, forms }
  },
  component: IsiPage,
})

function IsiPage() {
  const { rooms, forms } = Route.useLoaderData()
  const { room, form } = Route.useSearch()
  const navigate = useNavigate()
  const roomObj = rooms.find((r) => r.id === room)

  // Stage 1: No room selected — room picker
  if (!room || !roomObj) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Isi Penilaian 5R"
          subtitle="Pilih ruangan untuk mulai mengisi form."
        />
        <RiwayatHariIni />
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((r) => (
            <InteractiveCard
              key={r.id}
              onClick={() => navigate({ to: '/admin/isi', search: { room: r.id } })}
            >
              <CardContent className="flex items-center gap-3 p-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground/60">
                  <RoomIcon name={r.icon} size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-foreground text-sm">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.pic}</p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-muted-foreground/40" />
              </CardContent>
            </InteractiveCard>
          ))}
        </div>
      </div>
    )
  }

  // Stage 2: Room selected, no form — form picker
  if (!form) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent>
            <p className="text-[10px] font-bold uppercase tracking-wide text-primary">
              Isi Penilaian 5R
            </p>
            <h1 className="mt-1 text-lg font-extrabold text-foreground">{roomObj.name}</h1>
            <button
              type="button"
              onClick={() => navigate({ to: '/admin/isi' })}
              className="mt-2 flex items-center gap-1 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft size={12} />
              Ganti ruangan
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-bold text-muted-foreground">Pilih Form</p>
            <div className="mt-3 space-y-2.5">
              {forms.map((f) => {
                const total = f.categories.reduce((s, c) => s + c.criteria.length, 0)
                return (
                  <Button
                    key={f.id}
                    type="button"
                    variant="outline"
                    onClick={() => navigate({ to: '/admin/isi', search: { room, form: f.id } })}
                    className="flex h-auto w-full justify-between px-4 py-3.5"
                  >
                    <div className="text-left">
                      <p className="text-sm font-bold text-foreground">{f.label}</p>
                      <p className="text-xs text-muted-foreground">{total} kriteria / skor 1-5</p>
                    </div>
                    <ChevronRight size={14} className="text-muted-foreground/40" />
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Stage 3: Room + form — scoring form
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <button
                  type="button"
                  onClick={() => navigate({ to: '/admin/isi', search: { room } })}
                  className="text-xs font-semibold text-muted-foreground transition hover:text-foreground"
                >
                  {roomObj.name}
                </button>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-xs font-semibold text-foreground/70">
                  {forms.find((f) => f.id === form)?.label}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </CardContent>
      </Card>
      <ScoringForm roomId={room} formId={form} />
    </div>
  )
}