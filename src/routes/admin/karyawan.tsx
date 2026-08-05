/**
 * KaryawanPage — placeholder statis (menyusul dinamis).
 * Daftar karyawan peserta lomba.
 */
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/karyawan')({
  component: KaryawanPage,
})

function KaryawanPage() {
  return (
    <div className="space-y-4">
      <section>
        <h1 className="text-lg font-extrabold tracking-tight text-slate-900">Karyawan</h1>
        <p className="mt-0.5 text-sm text-slate-500">Daftar karyawan peserta lomba.</p>
      </section>

      <div className="surface-card flex flex-col items-center px-6 py-12 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-red/10 text-brand-red">
          <i className="fa-solid fa-users text-lg" />
        </div>
        <h2 className="text-sm font-bold text-slate-900">Modul Karyawan</h2>
        <p className="mt-1 max-w-xs text-xs text-slate-500">
          Daftar karyawan akan tampil di sini. Saat ini masih tahap persiapan — modul menyusul.
        </p>
      </div>
    </div>
  )
}
