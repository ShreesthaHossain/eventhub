import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircleIcon, UserIcon, BriefcaseIcon, SparklesIcon } from 'lucide-react'

import { Layout } from '@/components/Layout'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/context/AuthContext'
import { dashboardPath } from '@/lib/api'

const ROLES = [
  {
    value: 'attendee',
    label: 'Attendee',
    description: 'Browse and register for events',
    icon: UserIcon,
  },
  {
    value: 'organizer',
    label: 'Organizer',
    description: 'Create and manage events',
    icon: BriefcaseIcon,
  },
  {
    value: 'sponsor',
    label: 'Sponsor',
    description: 'Sponsor events and get visibility',
    icon: SparklesIcon,
  },
]

export function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [role, setRole] = useState('attendee')
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const user = await register({ name, email, password, password_confirmation: passwordConfirmation, role })
      navigate(dashboardPath(user))
    } catch (err) {
      const msg = err.response?.data?.message
      const errors = err.response?.data?.errors
      setError(errors ? Object.values(errors).flat().join(' ') : msg ?? 'Registration failed.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Layout>
      <div className="flex min-h-[70vh] items-center justify-center">
        <Card className="w-full max-w-md shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl">Create account</CardTitle>
            <CardDescription>
              Join EventHub — choose the role that fits you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">

              {/* Role selector — prominent cards at the top */}
              <div className="space-y-2">
                <Label>I want to</Label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map((r) => {
                    const Icon = r.icon
                    const active = role === r.value
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setRole(r.value)}
                        className={[
                          'flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center text-xs transition-all',
                          active
                            ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                            : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground',
                        ].join(' ')}
                      >
                        <Icon className="size-4" />
                        <span className="font-medium">{r.label}</span>
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {ROLES.find((r) => r.value === role)?.description}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  placeholder="Jane Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="jane@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password_confirmation">Confirm</Label>
                  <Input
                    id="password_confirmation"
                    type="password"
                    autoComplete="new-password"
                    value={passwordConfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                    required
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircleIcon className="size-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? 'Creating account…' : 'Create account'}
              </Button>

              <p className="text-sm text-muted-foreground text-center">
                Already have an account?{' '}
                <Link to="/login" className="text-primary underline-offset-4 hover:underline font-medium">
                  Log in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
