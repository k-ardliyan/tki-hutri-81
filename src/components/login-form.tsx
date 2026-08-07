import { cn } from "~/lib/utils"
import { Alert, AlertDescription } from "~/components/ui/alert"
import { Button } from "~/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field"
import { Input } from "~/components/ui/input"

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
}: React.ComponentProps<"div"> & {
  username: string
  password: string
  error?: string
  loading?: boolean
  onUsernameChange: (v: string) => void
  onPasswordChange: (v: string) => void
  onSubmit: () => void
}) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Masuk Dashboard</CardTitle>
          <CardDescription>
            Gunakan akun yang dibagikan panitia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              onSubmit()
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
                  placeholder="Username"
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
                />
              </Field>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Field>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Masuk..." : "Masuk"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
