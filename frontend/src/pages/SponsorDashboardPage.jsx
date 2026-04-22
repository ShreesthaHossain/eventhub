import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { Layout } from '@/components/Layout'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'

const TIERS = ['bronze', 'silver', 'gold', 'platinum']

const TIER_COLORS = {
  bronze: 'bg-amber-700',
  silver: 'bg-slate-400',
  gold: 'bg-yellow-400',
  platinum: 'bg-cyan-400',
}

const STATUS_VARIANT = {
  pending: 'secondary',
  approved: 'default',
  rejected: 'destructive',
}

function ApplyForm({ onApplied }) {
  const [eventId, setEventId] = useState('')
  const [events, setEvents] = useState([])
  const [tier, setTier] = useState('bronze')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.get('/events').then((r) => setEvents(r.data?.data ?? [])).catch(() => {})
  }, [])

  async function submit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await api.post(`/events/${eventId}/sponsor`, { tier, amount: Number(amount), notes })
      setEventId('')
      setTier('bronze')
      setAmount('')
      setNotes('')
      onApplied()
    } catch (err) {
      const fieldErrors = err.response?.data?.errors
      setError(fieldErrors ? Object.values(fieldErrors).flat().join(' ') : err.response?.data?.message ?? 'Failed to submit.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Apply to sponsor an event</CardTitle>
        <CardDescription>Choose an approved event and submit your sponsorship proposal.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          <div className="sm:col-span-2 space-y-1">
            <Label>Event</Label>
            <Select value={eventId} onValueChange={setEventId} required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an event">
                  {events.find((ev) => String(ev.id) === eventId)?.title}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {events.map((ev) => (
                  <SelectItem key={ev.id} value={String(ev.id)}>
                    {ev.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Tier</Label>
            <Select value={tier} onValueChange={setTier}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select tier">
                  {tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {TIERS.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="amount">Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="sm:col-span-2 space-y-1">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe what you'd like in return, branding requirements, etc."
            />
          </div>
          {error && <p className="sm:col-span-2 text-sm text-destructive">{error}</p>}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={submitting || !eventId}>
              {submitting ? 'Submitting…' : 'Submit application'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export function SponsorDashboardPage() {
  const [sponsorships, setSponsorships] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ tier: '', amount: '', notes: '' })
  const [editError, setEditError] = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/sponsorships/mine')
      setSponsorships(res.data?.data ?? [])
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load sponsorships.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  function startEdit(s) {
    setEditingId(s.id)
    setEditForm({ tier: s.tier, amount: String(s.amount), notes: s.notes ?? '' })
    setEditError(null)
  }

  async function saveEdit(e) {
    e.preventDefault()
    setEditError(null)
    try {
      await api.put(`/sponsorships/${editingId}`, {
        tier: editForm.tier,
        amount: Number(editForm.amount),
        notes: editForm.notes,
      })
      setEditingId(null)
      await load()
    } catch (err) {
      setEditError(err.response?.data?.message ?? 'Save failed.')
    }
  }

  async function withdraw(id) {
    try {
      await api.delete(`/sponsorships/${id}`)
      toast.success('Sponsorship application withdrawn.')
      await load()
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Withdraw failed.')
    }
  }

  const totalApproved = sponsorships
    .filter((s) => s.status === 'approved')
    .reduce((sum, s) => sum + Number(s.amount), 0)

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Sponsor dashboard</h1>
          <p className="text-muted-foreground">Manage your event sponsorship applications.</p>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total applications</p>
              <p className="text-2xl font-bold mt-1">{sponsorships.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Approved</p>
              <p className="text-2xl font-bold mt-1 text-emerald-600">
                {sponsorships.filter((s) => s.status === 'approved').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total approved $</p>
              <p className="text-2xl font-bold mt-1">${totalApproved.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        <ApplyForm onApplied={load} />

        <Separator />

        <div>
          <h2 className="text-lg font-medium mb-3">My applications</h2>
          {error && <p className="text-sm text-destructive mb-2">{error}</p>}
          {loading && <p className="text-muted-foreground">Loading…</p>}
          {!loading && sponsorships.length === 0 && (
            <p className="text-muted-foreground">No sponsorship applications yet.</p>
          )}
          {!loading && sponsorships.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sponsorships.map((s) => (
                  <React.Fragment key={s.id}>
                    <TableRow>
                      <TableCell>
                        <Link to={`/events/${s.event?.id}`} className="hover:underline font-medium">
                          {s.event?.title ?? '—'}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {s.event?.start_at ? new Date(s.event.start_at).toLocaleDateString() : ''}
                        </p>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-block h-2 w-2 rounded-full mr-1.5 ${TIER_COLORS[s.tier]}`} />
                        <span className="capitalize">{s.tier}</span>
                      </TableCell>
                      <TableCell>${Number(s.amount).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[s.status] ?? 'secondary'} className="capitalize">
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {s.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                                onClick={() => startEdit(s)}
                              >
                                Edit
                              </button>
                              <AlertDialog>
                                <AlertDialogTrigger className={buttonVariants({ variant: 'destructive', size: 'sm' })}>
                                  Withdraw
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Withdraw application?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This sponsorship application will be permanently removed.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Keep it</AlertDialogCancel>
                                    <AlertDialogAction variant="destructive" onClick={() => withdraw(s.id)}>
                                      Yes, withdraw
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                          {s.status === 'rejected' && (
                            <button
                              type="button"
                              className={buttonVariants({ size: 'sm' })}
                              onClick={() => startEdit(s)}
                            >
                              Reapply
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {editingId === s.id && (
                      <TableRow key={`edit-${s.id}`}>
                        <TableCell colSpan={5} className="bg-muted/50 p-4">
                          <form className="grid gap-3 sm:grid-cols-3" onSubmit={saveEdit}>
                            <div className="space-y-1">
                              <Label>Tier</Label>
                              <Select value={editForm.tier} onValueChange={(v) => setEditForm((p) => ({ ...p, tier: v }))}>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select tier">
                                    {editForm.tier ? editForm.tier.charAt(0).toUpperCase() + editForm.tier.slice(1) : undefined}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {TIERS.map((t) => (
                                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label>Amount ($)</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={editForm.amount}
                                onChange={(e) => setEditForm((p) => ({ ...p, amount: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label>Notes</Label>
                              <Input
                                value={editForm.notes}
                                onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                              />
                            </div>
                            {editError && <p className="sm:col-span-3 text-sm text-destructive">{editError}</p>}
                            <div className="sm:col-span-3 flex gap-2">
                              <Button type="submit" size="sm">Save</Button>
                              <button
                                type="button"
                                className={buttonVariants({ variant: 'outline', size: 'sm' })}
                                onClick={() => setEditingId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </Layout>
  )
}
