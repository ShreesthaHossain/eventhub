import { useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'
import {
  Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell,
} from 'recharts'
import {
  CheckCircleIcon, XCircleIcon, ClockIcon, UsersIcon,
  CalendarIcon, BarChart2Icon, ShieldIcon, RefreshCwIcon,
} from 'lucide-react'

import { Layout } from '@/components/Layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api'

/* ── helpers ─────────────────────────────────────────────── */

const STATUS_COLORS = {
  approved: 'bg-green-500/15 text-green-700 dark:text-green-400',
  pending:  'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  rejected: 'bg-red-500/15 text-red-600 dark:text-red-400',
  draft:    'bg-muted text-muted-foreground',
}

const ROLE_COLORS = {
  admin:     'bg-red-500/10 text-red-600',
  organizer: 'bg-blue-500/10 text-blue-600',
  sponsor:   'bg-purple-500/10 text-purple-600',
  attendee:  'bg-muted text-muted-foreground',
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[status] ?? 'bg-muted text-muted-foreground'}`}>
      {status}
    </span>
  )
}

function RoleBadge({ role }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${ROLE_COLORS[role] ?? 'bg-muted text-muted-foreground'}`}>
      {role}
    </span>
  )
}

/* ── AdminPage ───────────────────────────────────────────── */

export function AdminPage() {
  const [summary, setSummary]                   = useState(null)
  const [pendingEvents, setPendingEvents]        = useState([])
  const [allEvents, setAllEvents]               = useState([])
  const [users, setUsers]                       = useState([])
  const [pendingSponsorships, setPendingSponsorships] = useState([])
  const [rejectReasons, setRejectReasons]       = useState({})
  const [eventFilter, setEventFilter]           = useState('all')
  const [loading, setLoading]                   = useState(true)

  /* ── load functions ── */

  async function loadSummary() {
    const { data } = await api.get('/admin/analytics/summary')
    setSummary(data)
  }

  async function loadPendingEvents() {
    const { data } = await api.get('/admin/events/pending')
    setPendingEvents(Array.isArray(data?.data) ? data.data : data)
  }

  async function loadAllEvents() {
    const { data } = await api.get('/events', { params: { public_only: 0 } })
    setAllEvents(data?.data ?? [])
  }

  async function loadUsers() {
    const { data } = await api.get('/admin/users')
    setUsers(data?.data ?? [])
  }

  async function loadSponsorships() {
    try {
      const evRes = await api.get('/events', { params: { public_only: 0 } })
      const approvedEvents = (evRes.data?.data ?? []).filter((e) => e.status === 'approved')
      const lists = await Promise.all(
        approvedEvents.map((ev) =>
          api.get(`/events/${ev.id}/sponsorships`)
            .then((r) => r.data?.data ?? [])
            .catch(() => [])
        )
      )
      setPendingSponsorships(lists.flat().filter((s) => s.status === 'pending'))
    } catch {
      // non-critical
    }
  }

  async function loadAll() {
    setLoading(true)
    try {
      await Promise.all([
        loadSummary(),
        loadPendingEvents(),
        loadAllEvents(),
        loadUsers(),
        loadSponsorships(),
      ])
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Failed to load admin data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadAll() }, [])

  /* ── actions ── */

  async function approve(id) {
    try {
      await api.post(`/admin/events/${id}/approve`)
      toast.success('Event approved.')
      await Promise.all([loadPendingEvents(), loadAllEvents(), loadSummary()])
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Approve failed.')
    }
  }

  async function reject(id) {
    const reason = rejectReasons[id]?.trim()
    if (!reason) {
      toast.error('Please enter a rejection reason first.')
      return
    }
    try {
      await api.post(`/admin/events/${id}/reject`, { reason })
      setRejectReasons((prev) => ({ ...prev, [id]: '' }))
      toast.success('Event rejected.')
      await Promise.all([loadPendingEvents(), loadAllEvents(), loadSummary()])
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Reject failed.')
    }
  }

  async function reviewSponsorship(id, status) {
    try {
      await api.post(`/admin/sponsorships/${id}/review`, { status })
      toast.success(`Sponsorship ${status}.`)
      await loadSponsorships()
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Failed to review sponsorship.')
    }
  }

  /* ── derived ── */

  const filteredEvents = useMemo(() =>
    eventFilter === 'all' ? allEvents : allEvents.filter((e) => e.status === eventFilter),
    [allEvents, eventFilter]
  )

  /* ── render ── */

  return (
    <Layout>
      <div className="space-y-6">

        {/* Page header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage events, users, and sponsorships.</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={loadAll} disabled={loading}>
            <RefreshCwIcon className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* KPI strip */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Users',         value: summary.users_total,         icon: UsersIcon,       color: 'text-foreground' },
              { label: 'Events',        value: summary.events_total,        icon: CalendarIcon,    color: 'text-foreground' },
              { label: 'Pending review',value: summary.events_pending,      icon: ClockIcon,       color: 'text-amber-600 dark:text-amber-400' },
              { label: 'Registrations', value: summary.registrations_total ?? 0, icon: CheckCircleIcon, color: 'text-green-600 dark:text-green-400' },
              { label: 'Check-ins',     value: summary.attendance_total ?? 0,    icon: BarChart2Icon,   color: 'text-foreground' },
            ].map((k) => {
              const Icon = k.icon
              return (
                <Card key={k.label}>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-muted-foreground">{k.label}</p>
                      <Icon className={`size-4 ${k.color}`} />
                    </div>
                    <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        <Separator />

        {/* Main tabs */}
        <Tabs defaultValue="review">
          <TabsList variant="line">
            <TabsTrigger value="review">
              Event review
              {pendingEvents.length > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 text-xs">
                  {pendingEvents.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="events">All events</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="sponsorships">
              Sponsorships
              {pendingSponsorships.length > 0 && (
                <span className="ml-1.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-1.5 text-xs">
                  {pendingSponsorships.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* ── Tab: Event review ── */}
          <TabsContent value="review" className="mt-4 space-y-4">
            <div>
              <h2 className="text-base font-semibold">Pending event submissions</h2>
              <p className="text-sm text-muted-foreground">Approve or reject events submitted by organizers.</p>
            </div>

            {pendingEvents.length === 0 ? (
              <div className="rounded-xl border bg-muted/30 p-8 text-center">
                <CheckCircleIcon className="size-8 mx-auto text-green-500 mb-2" />
                <p className="font-medium">All caught up!</p>
                <p className="text-sm text-muted-foreground mt-1">No events are waiting for review.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingEvents.map((ev) => (
                  <Card key={ev.id}>
                    <CardContent className="pt-4">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-sm">{ev.title}</h3>
                            <StatusBadge status={ev.status} />
                            {ev.category && (
                              <span className="text-xs text-muted-foreground border rounded-full px-2 py-0.5">{ev.category.name}</span>
                            )}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                            <p>Organizer: <span className="text-foreground">{ev.organizer?.name} ({ev.organizer?.email})</span></p>
                            {ev.start_at && (
                              <p>Date: {new Date(ev.start_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                            )}
                            {ev.venue && <p>Venue: {ev.venue.name}</p>}
                            <p>Seats: {ev.total_seats}</p>
                          </div>
                          {ev.description && (
                            <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{ev.description}</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 sm:w-64">
                          <Input
                            placeholder="Rejection reason (required to reject)"
                            className="text-xs h-8"
                            value={rejectReasons[ev.id] ?? ''}
                            onChange={(e) => setRejectReasons((prev) => ({ ...prev, [ev.id]: e.target.value }))}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" className="flex-1 gap-1.5" onClick={() => approve(ev.id)}>
                              <CheckCircleIcon className="size-3.5" /> Approve
                            </Button>
                            <Button size="sm" variant="destructive" className="flex-1 gap-1.5" onClick={() => reject(ev.id)}>
                              <XCircleIcon className="size-3.5" /> Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Tab: All events ── */}
          <TabsContent value="events" className="mt-4 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-base font-semibold">All events</h2>
                <p className="text-sm text-muted-foreground">{filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} shown</p>
              </div>
              <Select value={eventFilter} onValueChange={setEventFilter}>
                <SelectTrigger className="w-36 h-8 text-sm">
                  <SelectValue>
                    {eventFilter === 'all' ? 'All statuses' : eventFilter.charAt(0).toUpperCase() + eventFilter.slice(1)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Title</TableHead>
                    <TableHead>Organizer</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Seats</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No events found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEvents.map((ev) => (
                      <TableRow key={ev.id}>
                        <TableCell className="font-medium max-w-[220px]">
                          <p className="truncate">{ev.title}</p>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{ev.organizer?.name ?? '—'}</TableCell>
                        <TableCell className="text-sm">{ev.category?.name ?? '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {ev.start_at ? new Date(ev.start_at).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'}
                        </TableCell>
                        <TableCell className="text-sm">{ev.total_seats}</TableCell>
                        <TableCell><StatusBadge status={ev.status} /></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ── Tab: Users ── */}
          <TabsContent value="users" className="mt-4 space-y-4">
            <div>
              <h2 className="text-base font-semibold">Registered users</h2>
              <p className="text-sm text-muted-foreground">{users.length} user{users.length !== 1 ? 's' : ''} total</p>
            </div>

            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No users found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {u.roles.length > 0
                              ? u.roles.map((r) => <RoleBadge key={r} role={r} />)
                              : <span className="text-xs text-muted-foreground">—</span>
                            }
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.created_at}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ── Tab: Sponsorships ── */}
          <TabsContent value="sponsorships" className="mt-4 space-y-4">
            <div>
              <h2 className="text-base font-semibold">Pending sponsorship applications</h2>
              <p className="text-sm text-muted-foreground">Review and approve or reject sponsor applications.</p>
            </div>

            {pendingSponsorships.length === 0 ? (
              <div className="rounded-xl border bg-muted/30 p-8 text-center">
                <ShieldIcon className="size-8 mx-auto text-muted-foreground mb-2" />
                <p className="font-medium">No pending sponsorships</p>
                <p className="text-sm text-muted-foreground mt-1">All sponsorship applications have been reviewed.</p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Event</TableHead>
                      <TableHead>Sponsor</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingSponsorships.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.event?.title ?? '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{s.sponsor?.email ?? '—'}</TableCell>
                        <TableCell className="capitalize text-sm">{s.tier}</TableCell>
                        <TableCell className="text-sm">${Number(s.amount).toLocaleString()}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[180px]">
                          <p className="truncate">{s.notes || '—'}</p>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" className="gap-1.5" onClick={() => reviewSponsorship(s.id, 'approved')}>
                              <CheckCircleIcon className="size-3.5" /> Approve
                            </Button>
                            <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => reviewSponsorship(s.id, 'rejected')}>
                              <XCircleIcon className="size-3.5" /> Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* ── Tab: Analytics ── */}
          <TabsContent value="analytics" className="mt-4 space-y-4">
            <div>
              <h2 className="text-base font-semibold">Analytics</h2>
              <p className="text-sm text-muted-foreground">Event and category breakdowns.</p>
            </div>

            {summary ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {summary.events_by_status && Object.keys(summary.events_by_status).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold">Events by status</CardTitle>
                      <CardDescription>Total count per approval status</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart
                          data={Object.entries(summary.events_by_status).map(([status, c]) => ({ status, count: c }))}
                          margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                        >
                          <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {Object.keys(summary.events_by_status).map((status) => (
                              <Cell
                                key={status}
                                fill={
                                  status === 'approved' ? '#10b981'
                                  : status === 'pending'  ? '#f59e0b'
                                  : status === 'rejected' ? '#ef4444'
                                  : '#6366f1'
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {summary.top_categories && summary.top_categories.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold">Top categories</CardTitle>
                      <CardDescription>Approved events per category</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart
                          layout="vertical"
                          data={summary.top_categories.map((c) => ({ name: c.name, count: c.c }))}
                          margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                        >
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                          <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Loading analytics…</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  )
}
