/**
 * DuplicateWarning — layar merah anti-duplikasi.
 * Muncul saat team/employee sudah pernah ambil snack di sesi ini.
 */
import type { SnackTeam } from '../../server/functions/snack'
import type { RedemptionInfo } from '../../server/functions/snack'

interface DuplicateWarningProps {
  team: SnackTeam
  sessionName: string
  skipped: RedemptionInfo[]
  onReset: () => void
}

export default function DuplicateWarning({ team, sessionName, skipped, onReset }: DuplicateWarningProps) {
  return (
    <div className="space-y-3">
      <section className="surface-card border-status-danger/40 bg-status-danger/[0.03] px-4 py-5 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-status-danger/10 text-status-danger">
          <i className="fa-solid fa-triangle-exclamation text-2xl" />
        </div>
        <h1 className="mt-3 text-lg font-extrabold text-status-danger">Sudah Pernah Ambil!</h1>
        <p className="mt-1 text-sm text-slate-600">
          {team.nama} — {sessionName}
        </p>
        <p className="mt-2 rounded-[var(--radius-md)] bg-white/70 px-3 py-2 text-xs text-slate-500">
          Kelompok ini sudah mengambil snack pada sesi yang sama. Pengambilan ganda ditolak.
        </p>
      </section>

      {/* Metadata pengambilan sebelumnya */}
      {skipped.length > 0 && (
        <section className="surface-card px-4 py-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Pengambilan sebelumnya
          </p>
          <div className="mt-2 space-y-2">
            {skipped.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-[var(--radius-md)] bg-slate-50 px-3 py-2 text-xs">
                <span className="font-semibold text-slate-700">
                  <i className="fa-solid fa-clock mr-1 text-slate-400" />
                  {formatDate(r.claimedAt)}
                </span>
                <span className="text-slate-500">
                  <i className="fa-solid fa-user mr-1 text-slate-400" />
                  {r.claimedBy}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={onReset}
        className="w-full cursor-pointer rounded-[var(--radius-md)] border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
      >
        Scan Kelompok Lain
      </button>
    </div>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
