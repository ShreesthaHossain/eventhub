import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  CalendarIcon, MapPinIcon, UsersIcon, TicketIcon,
  ClockIcon, CheckCircleIcon, XCircleIcon, ArrowRightIcon,
} from 'lucide-react'

import { Layout } from '@/components/Layout'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'

/* ── helpers ─────────────────────────────────────────────── */

const REG_META = {
  registered: { label: 'Registered', color: 'bg-green-500/15 text-green-700 dark:text-green-400' },
  waitlist:   { label: 'On waitlist', color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' },
  cancelled:  { label: 'Cancelled',  color: 'bg-muted text-muted-foreground' },
}

function RegBadge({ status }) {
  const m = REG_META[status] ?? REG_META.registered
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${m.color}`}>
      {m.label}
    </span>
  )
}

function EventCard({ ev, onRegister, registering }) {
  const seatsLeft = ev.seats_remaining ?? (ev.total_seats - (ev.registered_count ?? 0))
  const full = seatsLeft <= 0
  return (
    <Card className="flex flex-col">
      <CardContent className="pt-4 flex-1 flex flex-col gap-3">
        <div>
          <p className="font-semibold text-sm leading-snug line-clamp-2">{ev.title}</p>
          {ev.category && (
            <span className="mt-1 inline-block text-xs border rounded-full px-2 py-0.5 text-muted-foreground">
              {ev.category.name}
            </span>
          )}
        </div>
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CalendarIcon className="size-3.5 shrink-0" />
            {new Date(ev.start_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
          </div>
          {ev.venue && (
            <div className="flex items-center gap-1.5">
              <MapPinIcon className="size-3.5 shrink-0" />
              {ev.venue.name}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <UsersIcon className="size-3.5 shrink-0" />
            {full ? <span className="text-destructive">Fully booked</span> : `${seatsLeft} seats left`}
          </div>
        </div>
        <div className="mt-auto flex gap-2">
          <Link
            to={`/events/${ev.id}`}
            className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' flex-1'}
          >
            Details
          </Link>
          <Button
            size="sm"
            className="flex-1"
            disabled={registering === ev.id}
            onClick={() => onRegister(ev)}
          >
            {registering === ev.id ? 'Joining…' : full ? 'Join waitlist' : 'Register'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/* ── AttendeeDashboardPage ───────────────────────────────── */

export function AttendeeDashboardPage() {
  const { user } = useAuth()
  const navigate  = useNavigate()

  const [registrations, setRegistrations] = useState([])
  const [events, setEvents]               = useState([])
  const [loadingRegs, setLoadingRegs]     = useState(true)
  const [loadingEvs, setLoadingEvs]       = useState(true)
  const [cancelling, setCancelling]       = useState(null)
  const [registering, setRegistering]     = useState(null)

  async function loadRegistrations() {
    setLoadingRegs(true)
    try {
      const res = await api.get('/registrations/mine')
      const body = res.data
      setRegistrations(Array.isArray(body?.data) ? body.data : (Array.isArray(body) ? body : []))
    } catch {
      toast.error('Could not load your registrations.')
    } finally {
      setLoadingRegs(false)
    }
  }

  async function loadEvents() {
    setLoadingEvs(true)
    try {
      const res = await api.get('/events')
      setEvents(res.data?.data ?? [])
    } catch {
      // non-critical
    } finally {
      setLoadingEvs(false)
    }
  }

  useEffect(() => {
    void loadRegistrations()
    void loadEvents()
  }, [])

  async function cancelReg(eventId) {
    setCancelling(eventId)
    try {
      await api.delete(`/events/${eventId}/register`)
      toast.success('Registration cancelled.')
      await loadRegistrations()
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Could not cancel.')
    } finally {
      setCancelling(null)
    }
  }

  async function registerForEvent(ev) {
    setRegistering(ev.id)
    try {
      await api.post(`/events/${ev.id}/register`)
      toast.success(`Registered for "${ev.title}"!`)
      await loadRegistrations()
    } catch (e) {
      const msg = e.response?.data?.message ?? 'Registration failed.'
      if (msg.toLowerCase().includes('already')) {
        navigate(`/events/${ev.id}`)
      } else {
        toast.error(msg)
      }
    } finally {
      setRegistering(null)
    }
  }

  /* derived */
  const activeRegs    = registrations.filter((r) => r.status !== 'cancelled')
  const cancelledRegs = registrations.filter((r) => r.status === 'cancelled')
  const registeredIds = new Set(activeRegs.map((r) => r.event_id))

  const upcomingEvents = useMemo(() =>
    events
      .filter((e) => !registeredIds.has(e.id) && new Date(e.start_at) > new Date())
      .slice(0, 9),
    [events, registeredIds]
  )

  const upcoming = activeRegs.filter((r) => r.event?.start_at && new Date(r.event.start_at) > new Date())
  const past     = activeRegs.filter((r) => r.event?.start_at && new Date(r.event.start_at) <= new Date())

  return (
    <Layout>
      <div className="space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {user?.name?.split(' ')[0] ?? 'there'} 👋
          </h1>
          <p className="text-muted-foreground mt-1">Here's your EventHub activity at a glance.</p>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: 'Registered',
              value: activeRegs.filter((r) => r.status === 'registered').length,
              icon: CheckCircleIcon,
              color: 'text-green-600 dark:text-green-400',
            },
            {
              label: 'On waitlist',
              value: activeRegs.filter((r) => r.status === 'waitlist').length,
              icon: ClockIcon,
              color: 'text-amber-600 dark:text-amber-400',
            },
            {
              label: 'Upcoming',
              value: upcoming.length,
              icon: CalendarIcon,
              color: 'text-foreground',
            },
            {
              label: 'Events attended',
              value: past.length,
              icon: TicketIcon,
              color: 'text-foreground',
            },
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

        <Separator />

        <Tabs defaultValue="my-events">
          <TabsList variant="line">
            <TabsTrigger value="my-events">
              My events
              {activeRegs.length > 0 && (
                <span className="ml-1.5 rounded-full bg-muted px-1.5 text-xs">{activeRegs.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="browse">
              Browse &amp; register
            </TabsTrigger>
          </TabsList>

          {/* ── My Events tab ── */}
          <TabsContent value="my-events" className="mt-4 space-y-5">

            {loadingRegs ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}
              </div>
            ) : activeRegs.length === 0 ? (
              <div className="rounded-xl border bg-muted/30 p-8 text-center">
                <TicketIcon className="size-8 mx-auto text-muted-foreground mb-2" />
                <p className="font-medium">No registrations yet</p>
                <p className="text-sm text-muted-foreground mt-1">Browse upcoming events and register to get started.</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => document.querySelector('[data-value="browse"]')?.click()}>
                  Browse events
                </Button>
              </div>
            ) : (
              <>
                {/* Upcoming */}
                {upcoming.length > 0 && (
                  <div className="space-y-2">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Upcoming</h2>
                    <div className="divide-y rounded-xl border overflow-hidden">
                      {upcoming.map((r) => (
                        <div key={r.id} className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/30 transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{r.event?.title ?? 'Event'}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {r.event?.start_at ? new Date(r.event.start_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                            </p>
                          </div>
                          <RegBadge status={r.status} />
                          <div className="flex items-center gap-1.5">
                            {r.status === 'registered' && (
                              <Link
                                to={`/events/${r.event_id}`}
                                className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' gap-1'}
                              >
                                <TicketIcon className="size-3.5" /> Ticket
                              </Link>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' text-destructive hover:text-destructive'}>
                                <XCircleIcon className="size-4" />
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Cancel registration?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Your spot for &quot;{r.event?.title}&quot; will be released.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Keep it</AlertDialogCancel>
                                  <AlertDialogAction variant="destructive" onClick={() => cancelReg(r.event_id)}>
                                    Yes, cancel
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Past */}
                {past.length > 0 && (
                  <div className="space-y-2">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Past</h2>
                    <div className="divide-y rounded-xl border overflow-hidden opacity-70">
                      {past.map((r) => (
                        <div key={r.id} className="flex items-center gap-3 px-4 py-3 bg-card">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{r.event?.title ?? 'Event'}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {r.event?.start_at ? new Date(r.event.start_at).toLocaleDateString(undefined, { dateStyle: 'medium' }) : ''}
                            </p>
                          </div>
                          <RegBadge status={r.status} />
                          <Link
                            to={`/events/${r.event_id}`}
                            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                          >
                            View
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cancelled */}
                {cancelledRegs.length > 0 && (
                  <div className="space-y-2">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Cancelled</h2>
                    <div className="divide-y rounded-xl border overflow-hidden opacity-50">
                      {cancelledRegs.map((r) => (
                        <div key={r.id} className="flex items-center gap-3 px-4 py-3 bg-card">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate line-through">{r.event?.title ?? 'Event'}</p>
                          </div>
                          <Link to={`/events/${r.event_id}`} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                            Re-register
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* ── Browse tab ── */}
          <TabsContent value="browse" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {upcomingEvents.length} upcoming event{upcomingEvents.length !== 1 ? 's' : ''} you haven't registered for yet
              </p>
              <Link to="/" className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' gap-1.5'}>
                All events <ArrowRightIcon className="size-3.5" />
              </Link>
            </div>

            {loadingEvs ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1,2,3].map((i) => <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />)}
              </div>
            ) : upcomingEvents.length === 0 ? (
              <div className="rounded-xl border bg-muted/30 p-8 text-center">
                <CheckCircleIcon className="size-8 mx-auto text-green-500 mb-2" />
                <p className="font-medium">You're registered for all upcoming events!</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {upcomingEvents.map((ev) => (
                  <EventCard
                    key={ev.id}
                    ev={ev}
                    onRegister={registerForEvent}
                    registering={registering}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  )
}
