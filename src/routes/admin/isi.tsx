/**
 * IsiPage — form picker + scoring form.
 *
 * Flow (preserved):
 * 1. No room param → show room picker grid
 * 2. Room selected, no form → show form picker for that room
 * 3. Room + form → show ScoringForm
 *
 * Nav "Isi" works without pre-selecting room from dashboard.
 */
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
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
          <h1 className="text-lg font-extrabold tracking-tight text-slate-900">Isi Penilaian 5R</h1>
          <p className="mt-0.5 text-sm text-slate-500">Pilih ruangan untuk mulai mengisi form.</p>
        </section>
        <RiwayatHariIni />
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => navigate({ to: '/admin/isi', search: { room: r.id } })}
              className="surface-card flex cursor-pointer items-center gap-3 px-4 py-3.5 text-left transition hover:border-slate-300 active:scale-[0.99]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-slate-100 text-slate-400">
                <i className={`fa-solid ${r.icon} text-sm`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-slate-900">{r.name}</p>
                <p className="text-[10px] text-slate-400">{r.pic}</p>
              </div>
              <i className="fa-solid fa-chevron-right text-xs text-slate-300" />
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
        <section className="surface-card px-4 py-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-brand-red">
            Isi Penilaian 5R
          </p>
          <h1 className="mt-1 text-lg font-extrabold text-slate-900">{roomObj.name}</h1>
          <button
            type="button"
            onClick={() => navigate({ to: '/admin/isi' })}
            className="mt-2 text-xs font-semibold text-slate-400 transition hover:text-slate-600"
          >
            <i className="fa-solid fa-arrow-left mr-1" />
            Ganti ruangan
          </button>
        </section>

        <section className="surface-card space-y-2 px-4 py-4">
          <p className="text-xs font-bold text-slate-600">Pilih Form</p>
          {forms.map((f) => {
            const total = f.categories.reduce((s, c) => s + c.criteria.length, 0)
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => navigate({ to: '/admin/isi', search: { room, form: f.id } })}
                className="flex w-full cursor-pointer items-center justify-between rounded-[var(--radius-md)] border border-slate-200 bg-white px-3.5 py-3 text-left transition hover:border-brand-red"
              >
                <div>
                  <p className="text-sm font-bold text-slate-900">{f.label}</p>
                  <p className="text-xs text-slate-500">{total} kriteria / skor 1-5</p>
                </div>
                <i className="fa-solid fa-chevron-right text-xs text-slate-300" />
              </button>
            )
          })}
        </section>
      </div>
    )
  }

  // Stage 3: Room + form — scoring form
  return (
    <div className="space-y-4">
      <section className="surface-card px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <button
            type="button"
            onClick={() => navigate({ to: '/admin/isi', search: { room } })}
            className="font-semibold transition hover:text-slate-600"
          >
            {roomObj.name}
          </button>
          <i className="fa-solid fa-chevron-right text-[8px]" />
          <span className="font-semibold text-slate-600">
            {forms.find((f) => f.id === form)?.label}
          </span>
        </div>
      </section>
      <ScoringForm roomId={room} formId={form} />
    </div>
  )
}
