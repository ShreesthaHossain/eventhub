import { useEffect, useMemo, useState } from 'react'

import { Layout } from '@/components/Layout'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'

export function AttendancePage() {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [selectedEventId, setSelectedEventId] = useState('')
  const [attendanceRows, setAttendanceRows] = useState([])
  const [payload, setPayload] = useState('')
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  const manageableEvents = useMemo(() => {
    if (user?.roles?.includes('admin')) {
      return events
    }
    return events.filter((ev) => ev.organizer_id === user?.id)
  }, [events, user])

  async function loadEvents() {
    try {
      const res = await api.get('/events', { params: { public_only: 0 } })
      setEvents(res.data?.data ?? [])
    } catch {
      setEvents([])
    }
  }

  async function loadAttendance(eventId) {
    if (!eventId) {
      setAttendanceRows([])
      return
    }
    try {
      const res = await api.get(`/events/${eventId}/attendance`)
      setAttendanceRows(res.data?.data ?? [])
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load attendance.')
      setAttendanceRows([])
    }
  }

  useEffect(() => {
    void loadEvents()
  }, [])

  useEffect(() => {
    void loadAttendance(selectedEventId)
  }, [selectedEventId])

  async function scan() {
    setError(null)
    setMessage(null)
    try {
      await api.post('/attendance/scan', { payload })
      setMessage('Check-in success.')
      setPayload('')
      await loadAttendance(selectedEventId)
    } catch (err) {
      setError(err.response?.data?.message ?? 'Scan failed.')
    }
  }

  return (
    <Layout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold">Attendance scanner</h1>
          <p className="text-muted-foreground">Uses `/attendance/scan` and `/events/{'{id}'}/attendance`.</p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {message && <p className="text-sm text-muted-foreground">{message}</p>}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select event</CardTitle>
            <CardDescription>Only your events are shown for organizers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select
              value={selectedEventId}
              onValueChange={(value) => setSelectedEventId(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose event">
                  {manageableEvents.find((ev) => String(ev.id) === selectedEventId)?.title}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {manageableEvents.map((ev) => (
                  <SelectItem key={ev.id} value={String(ev.id)}>
                    {ev.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Textarea
              placeholder='Paste QR payload JSON, e.g. {"t":"token","v":1}'
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
            />

            <button
              type="button"
              className={buttonVariants({ size: 'sm' })}
              disabled={!selectedEventId || !payload.trim()}
              onClick={() => void scan()}
            >
              Check in attendee
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Checked-in attendees</CardTitle>
            <CardDescription>Live list for selected event.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Check-in time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {attendanceRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.user?.name ?? 'Unknown user'}</TableCell>
                  <TableCell>{row.user?.email ?? 'N/A'}</TableCell>
                  <TableCell>{new Date(row.checked_in_at).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge>checked in</Badge>
                  </TableCell>
                </TableRow>
              ))}
              </TableBody>
            </Table>
            {selectedEventId && attendanceRows.length === 0 && (
              <p className="mt-3 text-sm text-muted-foreground">No attendance records yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
