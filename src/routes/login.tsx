/**
 * LoginPage — satu form. Role terdeteksi otomatis dari kredensial.
 *
 * Cocok PANITIA_* → /panitia-area; cocok AUDIT_* → /audit-area.
 * Tidak ada tab selector — deteksi murni server-side.
 */
import { useState } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { getSession, login } from '../server/functions/5r'

export const Route = createFileRoute('/login')({
  loader: async () => {
    const { role } = await getSession()
    if (role === 'panitia') throw redirect({ to: '/admin' })
    if (role === 'audit') throw redirect({ to: '/audit' })
    return {}
  },
  component: LoginPage,
})

export default function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await login({ data: { username, password } })
      if (res.ok) {
        navigate({ to: res.role === 'panitia' ? '/admin' : '/audit' })
      } else {
        setError(res.error ?? 'Login gagal')
      }
    } catch {
      setError('Terjadi kesalahan jaringan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-slate-50 via-white to-red-50/40 px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand */}
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-brand-red/10 text-brand-red">
            <i className="fa-solid fa-clipboard-check text-2xl" />
          </div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-slate-900">HUT RI ke-81</h1>
          <p className="mt-1 text-sm text-slate-500">PT TKI x PT FTP</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              className="w-full rounded-[var(--radius-md)] border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 transition placeholder:text-slate-300 focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 focus:outline-none"
              placeholder="admin / audit"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full rounded-[var(--radius-md)] border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 transition placeholder:text-slate-300 focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 focus:outline-none"
              placeholder="Masukkan password"
            />
          </div>

          {error && (
            <p className="rounded-[var(--radius-md)] bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-[var(--radius-md)] bg-brand-red py-3 text-sm font-bold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Masuk...' : 'Masuk'}
          </button>
        </form>

        <a
          href="/"
          className="block text-center text-xs font-semibold text-slate-400 transition hover:text-slate-600"
        >
          <i className="fa-solid fa-arrow-left mr-1" />
          Kembali ke Situs
        </a>
      </div>
    </div>
  )
}
