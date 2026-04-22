import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Layout } from '@/components/Layout'
import { api } from '@/lib/api'

function toDateStr(date) {
  return date.toISOString().slice(0, 10)
}

// Map category names to soft background colours so events are visually distinct
const CATEGORY_COLORS = [
  '#6366f1', // indigo
  '#0ea5e9', // sky
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
]
const categoryColorMap = {}
let colorIndex = 0
function colorForCategory(cat) {
  if (!cat) return '#6366f1'
  if (!categoryColorMap[cat]) {
    categoryColorMap[cat] = CATEGORY_COLORS[colorIndex % CATEGORY_COLORS.length]
    colorIndex++
  }
  return categoryColorMap[cat]
}

export function CalendarPage() {
  const navigate = useNavigate()
  const calendarRef = useRef(null)
  const [error, setError] = useState(null)

  // FullCalendar calls this whenever the visible date range changes
  const fetchEvents = useCallback(async (fetchInfo, successCallback, failureCallback) => {
    setError(null)
    try {
      const from = toDateStr(fetchInfo.start)
      const to = toDateStr(fetchInfo.end)
      const res = await api.get('/events/calendar', { params: { from, to } })
      const raw = res.data?.data ?? []

      const events = raw.map((ev) => ({
        id: String(ev.id),
        title: ev.title,
        start: ev.start_at,
        end: ev.end_at,
        backgroundColor: colorForCategory(ev.category),
        borderColor: colorForCategory(ev.category),
        extendedProps: {
          venue: ev.venue,
          category: ev.category,
        },
      }))
      successCallback(events)
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load calendar events.')
      failureCallback(err)
    }
  }, [])

  function handleEventClick({ event }) {
    navigate(`/events/${event.id}`)
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Event calendar</h1>
          <p className="text-muted-foreground text-sm">
            Browse events by month, week, or day. Click any event to view details.
          </p>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth',
            }}
            buttonText={{
              today: 'Today',
              month: 'Month',
              week: 'Week',
              day: 'Day',
              list: 'List',
            }}
            events={fetchEvents}
            eventClick={handleEventClick}
            eventDisplay="block"
            eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
            dayMaxEvents={3}
            nowIndicator
            height="auto"
            eventMouseEnter={(info) => {
              info.el.style.cursor = 'pointer'
            }}
            eventContent={(arg) => (
              <div className="truncate px-1 py-0.5 text-xs text-white font-medium">
                {arg.timeText && (
                  <span className="opacity-80 mr-1">{arg.timeText}</span>
                )}
                {arg.event.title}
              </div>
            )}
          />
        </div>
      </div>
    </Layout>
  )
}
