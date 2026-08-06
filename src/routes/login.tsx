/**
 * LoginPage — satu form. Role terdeteksi otomatis dari kredensial (DB users).
 *
 * Cocok superadmin/admin → /admin; petugas → /petugas; audit → /audit.
 * Tidak ada tab selector — deteksi murni server-side.
 */
import { useState } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { ClipboardCheck, ArrowLeft } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { getSession, login } from '../server/functions/auth'
import type { UserRole } from '../lib/auth'

function homeForRole(role: UserRole): string {
  if (role === 'petugas') return '/petugas'
  if (role === 'audit') return '/audit'
  return '/admin'
}

export const Route = createFileRoute('/login')({
  loader: async () => {
    const { role } = await getSession()
    if (role) throw redirect({ to: homeForRole(role) })
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
      if (res.ok && res.role) {
        navigate({ to: homeForRole(res.role) })
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
      <Card className="w-full max-w-sm border-none shadow-none">
        <CardContent className="space-y-6 pt-4">
          {/* Brand */}
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ClipboardCheck size={28} />
            </div>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">HUT RI ke-81</h1>
            <p className="mt-1 text-sm text-muted-foreground">PT TKI x PT FTP</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="login-username">Username</Label>
              <Input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                placeholder="Username"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                placeholder="Masukkan password"
              />
            </div>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full py-3 text-sm font-bold">
              {loading ? 'Masuk...' : 'Masuk'}
            </Button>
          </form>

          <a
            href="/"
            className="flex items-center justify-center gap-1 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft size={14} />
            Kembali ke Situs
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
