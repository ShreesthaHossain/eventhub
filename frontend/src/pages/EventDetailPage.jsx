import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Layout } from '@/components/Layout'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import echo from '@/lib/echo'
import { useAuth } from '@/context/AuthContext'

export function EventDetailPage() {
  const { id } = useParams()
  const { isAuthenticated } = useAuth()
  const [payload, setPayload] = useState(null)
  const [ticket, setTicket] = useState(null)
  const [registration, setRegistration] = useState(null) // current user's registration
  const [error, setError] = useState(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [liveSeats, setLiveSeats] = useState(null)

  useEffect(() => {
    // Reset all state whenever the event id changes
    setPayload(null)
    setTicket(null)
    setRegistration(null)
    setError(null)
    setLiveSeats(null)
    setLoading(true)

    api
      .get(`/events/${id}`)
      .then((res) => setPayload(res.data))
      .catch((err) => setError(err.response?.data?.message ?? 'Not found.'))
      .finally(() => setLoading(false))
  }, [id])

  // Subscribe to real-time seat updates via Reverb
  useEffect(() => {
    if (!id) return
    const channel = echo.channel(`event.${id}`)
    channel.listen('.seats.updated', (data) => {
      setLiveSeats({
        seatsRemaining: data.seats_remaining,
        registeredCount: data.registered_count,
        totalSeats: data.total_seats,
      })
    })
    return () => {
      echo.leaveChannel(`event.${id}`)
    }
  }, [id])

  // Fetch ticket + registration status for authenticated users
  useEffect(() => {
    if (!isAuthenticated || !id) return

    api.get(`/events/${id}/ticket`)
      .then((res) => {
        setTicket(res.data)
        setRegistration({ status: 'registered' }) // ticket exists → registered
      })
      .catch(() => {
        setTicket(null)
        // Check if on waitlist (ticket not yet generated for waitlist users)
        api.get('/registrations/mine')
          .then((res) => {
            const all = res.data?.data ?? []
            const found = all.find((r) => r.event_id === Number(id))
            setRegistration(found ?? null)
          })
          .catch(() => setRegistration(null))
      })
  }, [isAuthenticated, id])

  async function register() {
    setActionBusy(true)
    try {
      await api.post(`/events/${id}/register`)
      const t = await api.get(`/events/${id}/ticket`).catch(() => null)
      setTicket(t?.data ?? null)
      setRegistration({ status: t ? 'registered' : 'waitlist' })
      toast.success(t ? 'Registered! Your QR ticket is below.' : 'Added to waitlist.')
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Could not register.')
    } finally {
      setActionBusy(false)
    }
  }

  async function cancelRegistration() {
    setActionBusy(true)
    try {
      await api.delete(`/events/${id}/register`)
      setRegistration({ status: 'cancelled' })
      setTicket(null)
      toast.success('Registration cancelled.')
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Could not cancel.')
    } finally {
      setActionBusy(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="space-y-3 max-w-2xl">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </div>
      </Layout>
    )
  }

  if (error || !payload?.event) {
    return (
      <Layout>
        <p className="text-destructive">{error ?? 'Event not found.'}</p>
      </Layout>
    )
  }

  const ev = payload.event
  const seatsRemaining = liveSeats?.seatsRemaining ?? payload.seats_remaining
  const registeredCount = liveSeats?.registeredCount ?? payload.registered_count
  const totalSeats = liveSeats?.totalSeats ?? ev.total_seats

  const isRegistered = registration?.status === 'registered'
  const isWaitlisted = registration?.status === 'waitlist'
  const isCancelled = !registration || registration?.status === 'cancelled'

  return (
    <Layout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <Badge variant={ev.status === 'approved' ? 'default' : 'secondary'}>{ev.status}</Badge>
          <h1 className="text-3xl font-semibold tracking-tight mt-1">{ev.title}</h1>
          <p className="text-muted-foreground mt-2 whitespace-pre-wrap">
            {ev.description || 'No description.'}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>When & where</CardTitle>
            <CardDescription>
              {new Date(ev.start_at).toLocaleString()} — {new Date(ev.end_at).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <p>
                <span className="text-muted-foreground">Seats remaining:</span>{' '}
                {seatsRemaining} / {totalSeats}
              </p>
              {liveSeats && (
                <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  Live
                </span>
              )}
            </div>
            <Progress value={totalSeats > 0 ? (registeredCount / totalSeats) * 100 : 0} />
            {ev.category && (
              <p>
                <span className="text-muted-foreground">Category:</span> {ev.category.name}
              </p>
            )}
            {ev.venue && (
              <p>
                <span className="text-muted-foreground">Venue:</span> {ev.venue.name}
              </p>
            )}
          </CardContent>
        </Card>

        <Separator />

        {isAuthenticated && ev.status === 'approved' && (
          <div className="flex flex-col gap-3">
            {isRegistered && (
              <div className="flex items-center gap-3">
                <Badge className="text-sm px-3 py-1">You&apos;re registered</Badge>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive" size="sm" disabled={actionBusy}>
                      Cancel registration
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel registration?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Your spot will be released. You can re-register if seats are still available.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep registration</AlertDialogCancel>
                      <AlertDialogAction variant="destructive" onClick={cancelRegistration}>
                        {actionBusy ? 'Cancelling…' : 'Yes, cancel'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
            {isWaitlisted && (
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-sm px-3 py-1">On waitlist</Badge>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="outline" size="sm" disabled={actionBusy}>
                      Leave waitlist
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Leave waitlist?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You will lose your position. You can rejoin if seats open up later.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Stay on waitlist</AlertDialogCancel>
                      <AlertDialogAction variant="destructive" onClick={cancelRegistration}>
                        {actionBusy ? 'Leaving…' : 'Leave waitlist'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
            {isCancelled && (
              <Button type="button" disabled={actionBusy} onClick={register}>
                {actionBusy ? 'Registering…' : 'Register for this event'}
              </Button>
            )}
          </div>
        )}

        {ticket?.qr_svg && (
          <Card>
            <CardHeader>
              <CardTitle>Your check-in QR</CardTitle>
              <CardDescription>Present at the door. One use.</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="max-w-[300px] border rounded-lg p-3 bg-white dark:bg-white"
                dangerouslySetInnerHTML={{ __html: ticket.qr_svg }}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  )
}
