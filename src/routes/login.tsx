/**
 * LoginPage — satu form (block login-03). Role terdeteksi otomatis server-side.
 * Cocok superadmin/admin → /admin; petugas → /petugas; audit → /audit.
 */
import { useState } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ArrowLeft, ClipboardCheck } from 'lucide-react'
import { LoginForm } from '../components/login-form'
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

  const handleSubmit = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await login({ data: { username, password } })
      if (res.ok && res.role) {
        toast.success(`Login berhasil · ${res.role}`)
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
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="/" className="flex items-center gap-2 self-center font-bold text-lg text-foreground">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ClipboardCheck className="size-5" />
          </div>
          HUT RI ke-81
        </a>

        <LoginForm
          username={username}
          password={password}
          error={error}
          loading={loading}
          onUsernameChange={setUsername}
          onPasswordChange={setPassword}
          onSubmit={() => void handleSubmit()}
        />

        <a
          href="/"
          className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Kembali ke Situs Utama
        </a>
      </div>
    </div>
  )
}
