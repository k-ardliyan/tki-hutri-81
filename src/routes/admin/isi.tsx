/**
 * IsiPage — form picker + scoring form.
 * Flow: room picker → form picker → ScoringForm.
 */
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '../../components/ui/card'
import RoomIcon from '../../components/ui/RoomIcon'
import { getRooms, getForms } from '../../server/functions/5r'
import ScoringForm from '../../components/5r/ScoringForm'
import RiwayatHariIni from '../../components/5r/RiwayatHariIni'

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
        <section>
          <h1 className="text-lg font-extrabold tracking-tight text-foreground">Isi Penilaian 5R</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Pilih ruangan untuk mulai mengisi form.</p>
        </section>
        <RiwayatHariIni />
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => navigate({ to: '/admin/isi', search: { room: r.id } })}
              className="cursor-pointer text-left transition active:scale-[0.99]"
            >
              <Card className="h-full hover:bg-muted/40">
                <CardContent className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground/60">
                    <RoomIcon name={r.icon} size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-foreground">{r.name}</p>
                    <p className="text-[10px] text-muted-foreground">{r.pic}</p>
                  </div>
                  <ChevronRight size={14} className="shrink-0 text-muted-foreground/40" />
                </CardContent>
              </Card>
            </button>
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

        <Card className="space-y-2">
          <CardContent>
            <p className="mb-2 text-xs font-bold text-muted-foreground">Pilih Form</p>
            {forms.map((f) => {
              const total = f.categories.reduce((s, c) => s + c.criteria.length, 0)
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => navigate({ to: '/admin/isi', search: { room, form: f.id } })}
                  className="flex w-full cursor-pointer items-center justify-between rounded-md border border-border bg-white px-3.5 py-3 text-left transition hover:border-primary"
                >
                  <div>
                    <p className="text-sm font-bold text-foreground">{f.label}</p>
                    <p className="text-xs text-muted-foreground">{total} kriteria / skor 1-5</p>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground/40" />
                </button>
              )
            })}
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
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => navigate({ to: '/admin/isi', search: { room } })}
              className="font-semibold transition hover:text-foreground"
            >
              {roomObj.name}
            </button>
            <ChevronRight size={10} />
            <span className="font-semibold text-foreground/70">
              {forms.find((f) => f.id === form)?.label}
            </span>
          </div>
        </CardContent>
      </Card>
      <ScoringForm roomId={room} formId={form} />
    </div>
  )
}