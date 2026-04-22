import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { Layout } from '@/components/Layout'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'

const STATUS_VARIANT = {
  registered: 'default',
  waitlist: 'secondary',
  cancelled: 'outline',
}

export function RegistrationsPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const res = await api.get('/registrations/mine')
      const body = res.data
      setRows(Array.isArray(body?.data) ? body.data : body)
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Could not load registrations.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function cancel(eventId) {
    setCancelling(eventId)
    try {
      await api.delete(`/events/${eventId}/register`)
      toast.success('Registration cancelled.')
      await load()
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Could not cancel registration.')
    } finally {
      setCancelling(null)
    }
  }

  const list = Array.isArray(rows) ? rows : []
  const active = list.filter((r) => r.status !== 'cancelled')
  const past = list.filter((r) => r.status === 'cancelled')

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">My registrations</h1>

        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {!loading && active.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Active registrations</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {active.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.event?.title ?? 'Event'}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[r.status] ?? 'secondary'}>
                          {r.status === 'waitlist' ? 'On waitlist' : r.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {r.event?.start_at ? new Date(r.event.start_at).toLocaleString() : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                            to={`/events/${r.event_id}`}
                          >
                            View
                          </Link>
                          <AlertDialog>
                            <AlertDialogTrigger
                              className={buttonVariants({ variant: 'destructive', size: 'sm' })}
                              disabled={cancelling === r.event_id}
                            >
                              {cancelling === r.event_id ? 'Cancelling…' : 'Cancel'}
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
                                <AlertDialogAction variant="destructive" onClick={() => cancel(r.event_id)}>
                                  Yes, cancel
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {!loading && past.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-muted-foreground">Cancelled</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {past.map((r) => (
                    <TableRow key={r.id} className="opacity-60">
                      <TableCell>{r.event?.title ?? 'Event'}</TableCell>
                      <TableCell>
                        {r.event?.start_at ? new Date(r.event.start_at).toLocaleString() : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                          to={`/events/${r.event_id}`}
                        >
                          Re-register
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {!loading && list.length === 0 && (
          <p className="text-muted-foreground">You have not registered for any events yet.</p>
        )}
      </div>
    </Layout>
  )
}
