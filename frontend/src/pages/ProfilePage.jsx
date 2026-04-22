import { useState } from 'react'
import { toast } from 'sonner'
import { AlertCircleIcon, UserIcon, MailIcon, KeyRoundIcon, ShieldIcon } from 'lucide-react'

import { Layout } from '@/components/Layout'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

function initials(name) {
  if (!name) return '?'
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

const ROLE_COLOR = {
  admin: 'default',
  organizer: 'secondary',
  sponsor: 'outline',
  attendee: 'outline',
}

export function ProfilePage() {
  const { user, setUser } = useAuth()

  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [savingInfo, setSavingInfo] = useState(false)
  const [infoError, setInfoError] = useState(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPw, setSavingPw] = useState(false)
  const [pwError, setPwError] = useState(null)

  async function saveInfo(e) {
    e.preventDefault()
    setInfoError(null)
    setSavingInfo(true)
    try {
      const res = await api.put('/auth/profile', { name, email })
      if (setUser) setUser(res.data)
      toast.success('Profile updated.')
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Update failed.'
      setInfoError(msg)
    } finally {
      setSavingInfo(false)
    }
  }

  async function savePassword(e) {
    e.preventDefault()
    setPwError(null)
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match.')
      return
    }
    setSavingPw(true)
    try {
      await api.put('/auth/profile', {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Password changed successfully.')
    } catch (err) {
      setPwError(err.response?.data?.message ?? 'Password update failed.')
    } finally {
      setSavingPw(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-xl mx-auto space-y-8">

        {/* Identity card */}
        <div className="flex items-center gap-4">
          <Avatar size="lg" className="size-16 text-lg">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xl">
              {initials(user?.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{user?.name}</h1>
            <p className="text-muted-foreground text-sm">{user?.email}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {user?.roles?.map((r) => (
                <Badge key={r} variant={ROLE_COLOR[r] ?? 'outline'} className="capitalize text-xs">
                  <ShieldIcon className="size-3 mr-1" />
                  {r}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <Separator />

        {/* Update name / email */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserIcon className="size-4" />
              Account information
            </CardTitle>
            <CardDescription>Update your display name or email address.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveInfo} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="name"
                    className="pl-9"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              {infoError && (
                <Alert variant="destructive">
                  <AlertCircleIcon className="size-4" />
                  <AlertDescription>{infoError}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" disabled={savingInfo}>
                {savingInfo ? 'Saving…' : 'Save changes'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change password */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRoundIcon className="size-4" />
              Change password
            </CardTitle>
            <CardDescription>Leave blank if you don&apos;t want to change your password.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={savePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current_password">Current password</Label>
                <Input
                  id="current_password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="new_password">New password</Label>
                  <Input
                    id="new_password"
                    type="password"
                    autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirm</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                </div>
              </div>
              {pwError && (
                <Alert variant="destructive">
                  <AlertCircleIcon className="size-4" />
                  <AlertDescription>{pwError}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" disabled={savingPw}>
                {savingPw ? 'Updating…' : 'Update password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
