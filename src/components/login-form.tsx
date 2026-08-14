import { LogIn } from 'lucide-react';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '~/components/ui/field';
import { Input } from '~/components/ui/input';
import { cn } from '~/lib/utils';

export function LoginForm({
  username,
  password,
  error,
  loading,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
  className,
  ...props
}: React.ComponentProps<'div'> & {
  username: string;
  password: string;
  error?: string;
  loading?: boolean;
  onUsernameChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className="border-border/80 bg-card/95 shadow-xl shadow-slate-900/5 backdrop-blur-sm">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-xl font-bold tracking-tight">Masuk Akun</CardTitle>
          <CardDescription className="text-xs">
            Gunakan akun panitia atau auditor yang telah dibagikan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
            className="flex flex-col gap-4"
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="login-username">Username</FieldLabel>
                <Input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={(e) => onUsernameChange(e.target.value)}
                  autoComplete="username"
                  required
                  placeholder="Masukkan username"
                  className="h-10"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="login-password">Password</FieldLabel>
                <Input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  autoComplete="current-password"
                  required
                  placeholder="Masukkan password"
                  className="h-10"
                />
              </Field>
              {error && (
                <Alert variant="destructive" className="py-2.5">
                  <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
                </Alert>
              )}
              <Field className="pt-1">
                <Button
                  type="submit"
                  loading={loading}
                  className="w-full h-10 font-bold shadow-sm cursor-pointer"
                >
                  {loading ? (
                    'Memverifikasi...'
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Masuk Dashboard
                    </>
                  )}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
