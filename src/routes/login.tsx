import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import LogoFtp from '../components/brand/LogoFtp';
import LogoHutRi81 from '../components/brand/LogoHutRi81';
import LogoTki from '../components/brand/LogoTki';
import { LoginForm } from '../components/login-form';
import { LoginSkeleton } from '../components/ui/skeletons';
import type { UserRole } from '../lib/auth';
import { gsap, shouldReduceMotion } from '../lib/gsap';
import { getSession, login } from '../server/functions/auth';

function homeForRole(role: UserRole): string {
  if (role === 'petugas') return '/petugas';
  if (role === 'audit') return '/audit';
  return '/admin';
}

export const Route = createFileRoute('/login')({
  loader: async () => {
    const { role } = await getSession();
    if (role) throw redirect({ to: homeForRole(role) });
    return {};
  },
  component: LoginPage,
  pendingComponent: LoginSkeleton,
});

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || shouldReduceMotion()) return undefined;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        containerRef.current!.querySelectorAll('.anim-login'),
        { opacity: 0, y: 18, scale: 0.98 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.45,
          stagger: 0.08,
          ease: 'power3.out',
          clearProps: 'all',
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await login({ data: { username, password } });
      if (res.ok && res.role) {
        toast.success(`Login berhasil · ${res.role}`);
        navigate({ to: homeForRole(res.role) });
      } else {
        setError(res.error ?? 'Login gagal. Periksa username dan password.');
      }
    } catch {
      setError('Terjadi kesalahan jaringan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-slate-100/70 to-rose-50/40 p-4 sm:p-6 md:p-10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
    >
      {/* Decorative ambient background glows */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-rose-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />

      <div className="relative z-10 flex w-full max-w-sm flex-col gap-5">
        {/* Logos & Brand Heading */}
        <div className="anim-login flex flex-col items-center text-center space-y-3">
          <Link
            to="/"
            className="flex items-center gap-2.5 transition hover:opacity-85 active:scale-98 cursor-pointer"
          >
            <LogoHutRi81 className="h-10 w-auto" animate />
            <div className="h-6 w-px bg-slate-300 dark:bg-slate-700" />
            <div className="flex items-center gap-1.5">
              <LogoTki className="h-4 w-auto" animate />
              <span className="text-[10px] font-bold text-slate-400">×</span>
              <LogoFtp className="h-4 w-auto" animate />
            </div>
          </Link>
          <div className="space-y-0.5">
            <h1 className="text-base font-extrabold tracking-tight text-foreground flex items-center justify-center gap-1.5">
              <ShieldCheck size={16} className="text-primary" />
              Portal Panitia & Auditor
            </h1>
            <p className="text-xs text-muted-foreground">
              Masuk untuk mengelola lomba & penilaian 5R
            </p>
          </div>
        </div>

        {/* Login Form Card */}
        <div className="anim-login">
          <LoginForm
            username={username}
            password={password}
            error={error}
            loading={loading}
            onUsernameChange={setUsername}
            onPasswordChange={setPassword}
            onSubmit={() => void handleSubmit()}
          />
        </div>

        {/* Back to Home Link */}
        <div className="anim-login text-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground hover:underline cursor-pointer"
          >
            <ArrowLeft size={13} />
            Kembali ke Beranda Utama
          </Link>
        </div>
      </div>
    </div>
  );
}
