import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircleIcon } from 'lucide-react'

import { Layout } from '@/components/Layout'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'
import { dashboardPath } from '@/lib/api'

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const user = await login(email, password)
      navigate(dashboardPath(user))
    } catch (err) {
      setError(err.response?.data?.message ?? 'Login failed.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Layout>
      <div className="flex min-h-[70vh] items-center justify-center">
        <Card className="w-full max-w-md shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>Sign in to your EventHub account.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircleIcon className="size-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? 'Signing in…' : 'Sign in'}
              </Button>

              <p className="text-sm text-muted-foreground text-center">
                No account?{' '}
                <Link to="/register" className="text-primary underline-offset-4 hover:underline font-medium">
                  Create one
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
