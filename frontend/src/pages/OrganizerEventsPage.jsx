import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  PlusIcon, PencilIcon, TrashIcon, SendIcon, ClockIcon,
  CheckCircleIcon, XCircleIcon, CalendarIcon, MapPinIcon,
  UsersIcon, TagIcon, ScanLineIcon, QrCodeIcon, ClipboardListIcon,
} from 'lucide-react'

import { Layout } from '@/components/Layout'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'

/* ── helpers ─────────────────────────────────────────────────── */

function toLocalDateTimeValue(value) {
  if (!value) return ''
  const date = new Date(value)
  const tzOffset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16)
}

function initialForm() {
  return {
    title: '',
    description: '',
    category_id: '',
    venue_id: '',
    start_at: '',
    end_at: '',
    total_seats: 50,
  }
}

const STATUS_META = {
  draft:     { label: 'Draft',     variant: 'secondary',    icon: PencilIcon },
  pending:   { label: 'In review', variant: 'secondary',    icon: ClockIcon },
  approved:  { label: 'Approved',  variant: 'default',      icon: CheckCircleIcon },
  rejected:  { label: 'Rejected',  variant: 'destructive',  icon: XCircleIcon },
  cancelled: { label: 'Cancelled', variant: 'outline',      icon: XCircleIcon },
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? { label: status, variant: 'outline', icon: ClockIcon }
  const Icon = meta.icon
  return (
    <Badge variant={meta.variant} className="gap-1 capitalize">
      <Icon className="size-3" />
      {meta.label}
    </Badge>
  )
}

/* ── EventFormDialog ─────────────────────────────────────────── */

function EventFormDialog({ open, onOpenChange, editingEvent, categories, venues, onSaved }) {
  const [form, setForm] = useState(initialForm())
  const [saving, setSaving] = useState(false)

  /* Populate form when editing */
  useEffect(() => {
    if (editingEvent) {
      setForm({
        title: editingEvent.title ?? '',
        description: editingEvent.description ?? '',
        category_id: String(editingEvent.category_id ?? ''),
        venue_id: String(editingEvent.venue_id ?? ''),
        start_at: toLocalDateTimeValue(editingEvent.start_at),
        end_at: toLocalDateTimeValue(editingEvent.end_at),
        total_seats: editingEvent.total_seats ?? 50,
      })
    } else {
      setForm(initialForm())
    }
  }, [editingEvent, open])

  function onChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      ...form,
      category_id: form.category_id ? Number(form.category_id) : null,
      venue_id: form.venue_id ? Number(form.venue_id) : null,
      total_seats: Number(form.total_seats),
    }
    try {
      if (editingEvent) {
        await api.put(`/events/${editingEvent.id}`, payload)
        toast.success('Event updated.')
      } else {
        await api.post('/events', payload)
        toast.success('Event created as draft.')
      }
      onOpenChange(false)
      onSaved()
    } catch (err) {
      const fieldErrors = err.response?.data?.errors
      toast.error(
        fieldErrors
          ? Object.values(fieldErrors).flat().join(' ')
          : err.response?.data?.message ?? 'Save failed.',
      )
    } finally {
      setSaving(false)
    }
  }

  const isLocked =
    editingEvent &&
    ['approved', 'pending'].includes(editingEvent.status)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {editingEvent ? `Edit "${editingEvent.title}"` : 'Create new event'}
          </DialogTitle>
          <DialogDescription>
            {editingEvent
              ? 'Update the event details below. Dates and seats are locked once submitted.'
              : 'Fill in the details. Your event will be saved as a draft and can be submitted for admin approval when ready.'}
          </DialogDescription>
        </DialogHeader>

        <form id="event-form" onSubmit={handleSubmit} className="space-y-5 py-1">

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="ev-title">
              Event title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ev-title"
              placeholder="e.g. Annual Tech Hackathon 2025"
              value={form.title}
              onChange={(e) => onChange('title', e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="ev-desc">Description</Label>
            <Textarea
              id="ev-desc"
              placeholder="What is this event about? Who should attend? What will participants gain?"
              className="min-h-[100px] resize-y"
              value={form.description}
              onChange={(e) => onChange('description', e.target.value)}
            />
          </div>

          <Separator />

          {/* Category + Venue */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <TagIcon className="size-3.5" /> Category
              </Label>
              <Select
                value={form.category_id}
                onValueChange={(v) => onChange('category_id', v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a category">
                    {categories.find((c) => String(c.id) === form.category_id)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.length === 0 && (
                    <SelectItem value="_none" disabled>No categories available</SelectItem>
                  )}
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <MapPinIcon className="size-3.5" /> Venue
              </Label>
              <Select
                value={form.venue_id}
                onValueChange={(v) => onChange('venue_id', v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a venue">
                    {venues.find((v) => String(v.id) === form.venue_id)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {venues.length === 0 && (
                    <SelectItem value="_none" disabled>No venues available</SelectItem>
                  )}
                  {venues.map((v) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {v.name}{v.city ? ` — ${v.city}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Dates + Seats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ev-start" className="flex items-center gap-1.5">
                <CalendarIcon className="size-3.5" /> Start date &amp; time <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ev-start"
                type="datetime-local"
                value={form.start_at}
                onChange={(e) => onChange('start_at', e.target.value)}
                disabled={isLocked}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-end" className="flex items-center gap-1.5">
                <CalendarIcon className="size-3.5" /> End date &amp; time <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ev-end"
                type="datetime-local"
                value={form.end_at}
                min={form.start_at || undefined}
                onChange={(e) => onChange('end_at', e.target.value)}
                disabled={isLocked}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-seats" className="flex items-center gap-1.5">
                <UsersIcon className="size-3.5" /> Total seats <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ev-seats"
                type="number"
                min="0"
                placeholder="50"
                value={form.total_seats}
                onChange={(e) => onChange('total_seats', e.target.value)}
                disabled={isLocked}
                required
              />
            </div>
          </div>

          {isLocked && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              Dates and seat count are locked while the event is pending or approved. Only title, description, category, and venue can be changed.
            </p>
          )}
        </form>

        <DialogFooter>
          <button
            type="button"
            className={buttonVariants({ variant: 'outline' })}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </button>
          <Button type="submit" form="event-form" disabled={saving}>
            {saving ? 'Saving…' : editingEvent ? 'Save changes' : 'Create draft'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ── EventCard ───────────────────────────────────────────────── */

function EventCard({ ev, onEdit, onSubmit, onDelete }) {
  const canEdit = ['draft', 'rejected'].includes(ev.status)
  const canSubmit = ev.status === 'draft'

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug line-clamp-2">{ev.title}</CardTitle>
          <StatusBadge status={ev.status} />
        </div>
        {ev.category && (
          <Badge variant="outline" className="w-fit text-xs gap-1 mt-1">
            <TagIcon className="size-3" /> {ev.category.name}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between gap-4">
        <div className="space-y-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CalendarIcon className="size-3.5 shrink-0" />
            <span>{new Date(ev.start_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
          </div>
          {ev.venue && (
            <div className="flex items-center gap-2">
              <MapPinIcon className="size-3.5 shrink-0" />
              <span className="truncate">{ev.venue.name}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <UsersIcon className="size-3.5 shrink-0" />
            <span>{ev.total_seats} seats</span>
          </div>
        </div>

        {ev.rejection_reason && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
            <span className="font-medium">Rejection reason: </span>
            {ev.rejection_reason}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onEdit(ev)}>
              <PencilIcon className="size-3.5" /> Edit
            </Button>
          )}
          {canSubmit && (
            <Button size="sm" className="gap-1.5" onClick={() => onSubmit(ev.id)}>
              <SendIcon className="size-3.5" /> Submit for review
            </Button>
          )}
          {ev.status === 'pending' && (
            <span className="text-xs text-muted-foreground self-center">Waiting for admin review…</span>
          )}
          {ev.status === 'approved' && canEdit && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onEdit(ev)}>
              <PencilIcon className="size-3.5" /> Edit details
            </Button>
          )}
          {['draft', 'rejected'].includes(ev.status) && (
            <AlertDialog>
              <AlertDialogTrigger className={buttonVariants({ size: 'sm', variant: 'ghost' }) + ' text-destructive hover:text-destructive gap-1.5'}>
                <TrashIcon className="size-3.5" /> Delete
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete &quot;{ev.title}&quot;?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. The event will be permanently removed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep it</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={() => onDelete(ev.id)}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/* ── OrganizerEventsPage ─────────────────────────────────────── */

export function OrganizerEventsPage() {
  const { user } = useAuth()

  const [events, setEvents] = useState([])
  const [categories, setCategories] = useState([])
  const [venues, setVenues] = useState([])
  const [loading, setLoading] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [activeTab, setActiveTab] = useState('drafts')

  /* ── Attendance state ── */
  const [attendanceEventId, setAttendanceEventId] = useState('')
  const [attendanceRows, setAttendanceRows] = useState([])
  const [scanPayload, setScanPayload] = useState('')
  const [scanning, setScanning] = useState(false)

  /* ── Registrations state ── */
  const [regEventId, setRegEventId] = useState('')
  const [regData, setRegData] = useState(null)
  const [regLoading, setRegLoading] = useState(false)

  // Use Number() to guard against API returning organizer_id as a string
  const organizerId = user?.id
  const myEvents = useMemo(
    () => events.filter((e) => Number(e.organizer_id) === Number(organizerId)),
    [events, organizerId],
  )

  const draftEvents    = myEvents.filter((e) => e.status === 'draft')
  const pendingEvents  = myEvents.filter((e) => e.status === 'pending')
  const approvedEvents = myEvents.filter((e) => e.status === 'approved')
  const rejectedEvents = myEvents.filter((e) => e.status === 'rejected')

  async function load() {
    setLoading(true)
    try {
      const [evRes, catRes, venueRes] = await Promise.all([
        api.get('/events', { params: { public_only: 0 } }),
        api.get('/categories'),
        api.get('/venues'),
      ])
      setEvents(evRes.data?.data ?? [])
      setCategories(catRes.data?.data ?? [])
      setVenues(venueRes.data?.data ?? [])
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Failed to load data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  function openCreate() {
    setEditingEvent(null)
    setDialogOpen(true)
  }

  function openEdit(ev) {
    setEditingEvent(ev)
    setDialogOpen(true)
  }

  async function submitForApproval(id) {
    try {
      await api.post(`/events/${id}/submit`)
      toast.success('Submitted for admin review.')
      await load()
      setActiveTab('pending')   // auto-switch so the user sees it immediately
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Submit failed.')
    }
  }

  async function removeEvent(id) {
    try {
      await api.delete(`/events/${id}`)
      toast.success('Event deleted.')
      await load()
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Delete failed.')
    }
  }

  /* ── Attendance helpers ── */
  const myApprovedEvents = useMemo(
    () => events.filter(
      (e) => e.status === 'approved' && Number(e.organizer_id) === Number(organizerId)
    ),
    [events, organizerId],
  )

  async function loadAttendance(eventId) {
    if (!eventId) { setAttendanceRows([]); return }
    try {
      const res = await api.get(`/events/${eventId}/attendance`)
      setAttendanceRows(res.data?.data ?? [])
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Failed to load attendance.')
      setAttendanceRows([])
    }
  }

  useEffect(() => { void loadAttendance(attendanceEventId) }, [attendanceEventId])

  async function loadRegistrations(eventId) {
    if (!eventId) { setRegData(null); return }
    setRegLoading(true)
    try {
      const res = await api.get(`/events/${eventId}/registrations`)
      setRegData(res.data)
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Failed to load registrations.')
      setRegData(null)
    } finally {
      setRegLoading(false)
    }
  }

  useEffect(() => { void loadRegistrations(regEventId) }, [regEventId])

  async function handleScan() {
    if (!scanPayload.trim()) return
    setScanning(true)
    try {
      await api.post('/attendance/scan', { payload: scanPayload })
      toast.success('Check-in successful!')
      setScanPayload('')
      await loadAttendance(attendanceEventId)
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Scan failed.')
    } finally {
      setScanning(false)
    }
  }

  /* Workflow step indicator */
  const steps = [
    { label: 'Create draft', done: myEvents.length > 0 },
    { label: 'Submit for review', done: myEvents.some((e) => e.status !== 'draft') },
    { label: 'Admin approves', done: approvedEvents.length > 0 },
  ]

  function EventGrid({ list, emptyMsg }) {
    if (loading) {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      )
    }
    if (!list.length) {
      return <p className="text-sm text-muted-foreground py-4">{emptyMsg}</p>
    }
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((ev) => (
          <EventCard
            key={ev.id}
            ev={ev}
            onEdit={openEdit}
            onSubmit={submitForApproval}
            onDelete={removeEvent}
          />
        ))}
      </div>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">

        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Organizer workspace</h1>
            <p className="text-muted-foreground mt-1">
              Create events, manage drafts, and submit for admin approval.
            </p>
          </div>
          <Button className="shrink-0 gap-2" onClick={openCreate}>
            <PlusIcon className="size-4" />
            New event
          </Button>
        </div>

        {/* Workflow steps */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground rounded-xl border bg-muted/30 px-4 py-3">
          {steps.map((s, i) => (
            <div key={s.label} className="flex items-center gap-2">
              {i > 0 && <span className="text-border">→</span>}
              <span className={s.done ? 'text-foreground font-medium' : ''}>
                {s.done ? '✓ ' : `${i + 1}. `}{s.label}
              </span>
            </div>
          ))}
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Drafts',   count: draftEvents.length,    color: 'text-muted-foreground' },
            { label: 'In review', count: pendingEvents.length,  color: 'text-amber-600' },
            { label: 'Approved', count: approvedEvents.length, color: 'text-green-600' },
            { label: 'Rejected', count: rejectedEvents.length,  color: 'text-destructive' },
          ].map((k) => (
            <Card key={k.label}>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className={`text-2xl font-bold mt-0.5 ${k.color}`}>{k.count}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator />

        {/* Workspace tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList variant="line">
            <TabsTrigger value="drafts">
              Drafts {draftEvents.length > 0 && <span className="ml-1.5 rounded-full bg-muted px-1.5 text-xs">{draftEvents.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="pending">
              In review {pendingEvents.length > 0 && <span className="ml-1.5 rounded-full bg-amber-100 text-amber-700 px-1.5 text-xs">{pendingEvents.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved {approvedEvents.length > 0 && <span className="ml-1.5 rounded-full bg-green-100 text-green-700 px-1.5 text-xs">{approvedEvents.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected {rejectedEvents.length > 0 && <span className="ml-1.5 rounded-full bg-destructive/10 text-destructive px-1.5 text-xs">{rejectedEvents.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="registrations">
              <ClipboardListIcon className="size-3.5 mr-1.5" />
              Registrations
            </TabsTrigger>
            <TabsTrigger value="attendance">
              <ScanLineIcon className="size-3.5 mr-1.5" />
              Attendance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="drafts" className="mt-4">
            <EventGrid list={draftEvents} emptyMsg="No draft events yet. Click 'New event' to get started." />
          </TabsContent>
          <TabsContent value="pending" className="mt-4">
            <EventGrid list={pendingEvents} emptyMsg="No events currently under review." />
          </TabsContent>
          <TabsContent value="approved" className="mt-4">
            <EventGrid list={approvedEvents} emptyMsg="No approved events yet." />
          </TabsContent>
          <TabsContent value="rejected" className="mt-4">
            <EventGrid list={rejectedEvents} emptyMsg="No rejected events." />
          </TabsContent>

          {/* ── Registrations tab ── */}
          <TabsContent value="registrations" className="mt-4 space-y-4">
            <div>
              <h2 className="text-base font-semibold">Registrations</h2>
              <p className="text-sm text-muted-foreground">See who has signed up for your approved events.</p>
            </div>

            {myApprovedEvents.length === 0 ? (
              <div className="rounded-xl border bg-muted/30 p-8 text-center">
                <ClipboardListIcon className="size-8 mx-auto text-muted-foreground mb-2" />
                <p className="font-medium">No approved events yet</p>
                <p className="text-sm text-muted-foreground mt-1">Once an event is approved, registrations will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <Select value={regEventId} onValueChange={setRegEventId}>
                  <SelectTrigger className="w-full sm:w-80">
                    <SelectValue placeholder="Select an approved event">
                      {myApprovedEvents.find((ev) => String(ev.id) === regEventId)?.title}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {myApprovedEvents.map((ev) => (
                      <SelectItem key={ev.id} value={String(ev.id)}>{ev.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {regEventId && (
                  regLoading ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                  ) : regData ? (
                    <>
                      {/* KPI row */}
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: 'Registered',  value: regData.registered,  color: 'text-green-600 dark:text-green-400' },
                          { label: 'Waitlist',    value: regData.waitlist,    color: 'text-amber-600 dark:text-amber-400' },
                          { label: 'Total seats', value: regData.total_seats, color: 'text-foreground' },
                        ].map((k) => (
                          <Card key={k.label}>
                            <CardContent className="pt-4 pb-3">
                              <p className="text-xs text-muted-foreground">{k.label}</p>
                              <p className={`text-2xl font-bold mt-0.5 ${k.color}`}>{k.value}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      <div className="rounded-lg border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead>Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Registered at</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {regData.data.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                  No registrations yet.
                                </TableCell>
                              </TableRow>
                            ) : (
                              regData.data.map((r) => (
                                <TableRow key={r.id}>
                                  <TableCell className="font-medium">{r.user.name}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground">{r.user.email}</TableCell>
                                  <TableCell>
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                                      r.status === 'registered'
                                        ? 'bg-green-500/15 text-green-700 dark:text-green-400'
                                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                                    }`}>
                                      {r.status}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {new Date(r.registered_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  ) : null
                )}
              </div>
            )}
          </TabsContent>

          {/* ── Attendance tab ── */}
          <TabsContent value="attendance" className="mt-4 space-y-4">
            <div>
              <h2 className="text-base font-semibold">Attendance scanner</h2>
              <p className="text-sm text-muted-foreground">Check in attendees by scanning or pasting their QR ticket payload.</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {/* Scanner card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <QrCodeIcon className="size-4" /> Scan ticket
                  </CardTitle>
                  <CardDescription>Select an event, then paste the QR payload to check in an attendee.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {myApprovedEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No approved events to scan for yet.</p>
                  ) : (
                    <>
                      <Select value={attendanceEventId} onValueChange={setAttendanceEventId}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select an event">
                            {myApprovedEvents.find((ev) => String(ev.id) === attendanceEventId)?.title}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {myApprovedEvents.map((ev) => (
                            <SelectItem key={ev.id} value={String(ev.id)}>{ev.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Textarea
                        placeholder={`Paste QR payload JSON, e.g. {"t":"token","v":1}`}
                        className="font-mono text-xs min-h-[80px]"
                        value={scanPayload}
                        onChange={(e) => setScanPayload(e.target.value)}
                      />

                      <Button
                        size="sm"
                        className="w-full gap-2"
                        disabled={!attendanceEventId || !scanPayload.trim() || scanning}
                        onClick={handleScan}
                      >
                        <ScanLineIcon className="size-4" />
                        {scanning ? 'Checking in…' : 'Check in attendee'}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Checked-in list */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <UsersIcon className="size-4" /> Checked-in attendees
                  </CardTitle>
                  <CardDescription>
                    {attendanceEventId
                      ? `${attendanceRows.length} check-in${attendanceRows.length !== 1 ? 's' : ''} recorded`
                      : 'Select an event to see attendance'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!attendanceEventId ? (
                    <p className="text-sm text-muted-foreground">No event selected.</p>
                  ) : attendanceRows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No check-ins yet for this event.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceRows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="font-medium">{row.user?.name ?? '—'}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{row.user?.email ?? '—'}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(row.checked_in_at).toLocaleTimeString(undefined, { timeStyle: 'short' })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create / Edit Dialog */}
      <EventFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingEvent={editingEvent}
        categories={categories}
        venues={venues}
        onSaved={load}
      />
    </Layout>
  )
}
