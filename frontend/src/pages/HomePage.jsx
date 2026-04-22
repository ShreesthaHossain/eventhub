import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { CalendarIcon, MapPinIcon, ArrowRightIcon, SparklesIcon } from 'lucide-react'

import { Layout } from '@/components/Layout'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

export function HomePage() {
  const { user, isAuthenticated } = useAuth()
  const [events, setEvents] = useState([])
  const [recommended, setRecommended] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedInterests, setSelectedInterests] = useState([])
  const [savingInterests, setSavingInterests] = useState(false)
  const [loading, setLoading] = useState(true)

  const canViewAll = user?.roles?.includes('admin') || user?.roles?.includes('organizer')

  useEffect(() => {
    let cancelled = false

    async function run() {
      setLoading(true)

      const params = {}
      if (canViewAll) {
        params.public_only = 0
      }

      try {
        const [eventsRes, categoriesRes] = await Promise.all([
          api.get('/events', { params }),
          api.get('/categories'),
        ])

        if (!cancelled) {
          const body = eventsRes.data
          setEvents(Array.isArray(body?.data) ? body.data : body)
          setCategories(categoriesRes.data?.data ?? [])
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(err.response?.data?.message ?? 'Could not load events.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [canViewAll])

  useEffect(() => {
    let cancelled = false

    async function runRecommendations() {
      if (!isAuthenticated) {
        setRecommended([])
        setSelectedInterests([])
        return
      }

      try {
        const [recRes, interestsRes] = await Promise.all([
          api.get('/recommendations'),
          api.get('/me/interests'),
        ])
        if (!cancelled) {
          setRecommended(recRes.data?.data ?? [])
          setSelectedInterests(interestsRes.data?.category_ids ?? [])
        }
      } catch {
        if (!cancelled) {
          setRecommended([])
        }
      }
    }

    void runRecommendations()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated])

  const list = Array.isArray(events) ? events : []

  const selectedLookup = useMemo(() => new Set(selectedInterests), [selectedInterests])

  function toggleInterest(categoryId) {
    setSelectedInterests((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId)
      }
      return [...prev, categoryId]
    })
  }

  async function saveInterests() {
    setSavingInterests(true)
    try {
      await api.put('/me/interests', { category_ids: selectedInterests })
      toast.success('Interests saved. Recommendations refreshed.')
      const res = await api.get('/recommendations')
      setRecommended(res.data?.data ?? [])
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to update interests.')
    } finally {
      setSavingInterests(false)
    }
  }

  function EventCard({ ev }) {
    return (
      <Link to={`/events/${ev.id}`} className="group block">
        <Card className="h-full transition-all hover:shadow-md hover:border-primary/30">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base leading-snug group-hover:text-primary transition-colors line-clamp-2">
                {ev.title}
              </CardTitle>
              {canViewAll && ev.status !== 'approved' && (
                <Badge variant="secondary" className="shrink-0 text-xs capitalize">{ev.status}</Badge>
              )}
            </div>
            {ev.category && (
              <Badge variant="outline" className="w-fit text-xs">{ev.category.name}</Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarIcon className="size-3 shrink-0" />
              <span>{new Date(ev.start_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <span className="text-muted-foreground/50">·</span>
              <span>{new Date(ev.start_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            {ev.venue && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPinIcon className="size-3 shrink-0" />
                <span className="truncate">{ev.venue.name}</span>
              </div>
            )}
            <div className="flex items-center justify-end pt-1">
              <span className={buttonVariants({ size: 'sm', variant: 'ghost' }) + ' gap-1 text-primary'}>
                View details <ArrowRightIcon className="size-3" />
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    )
  }

  const SkeletonGrid = () => (
    <div className="grid gap-4 sm:grid-cols-2">
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
    </div>
  )

  return (
    <Layout>
      <div className="space-y-8">

        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-background to-background border px-6 py-10 sm:px-10 sm:py-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Campus EventHub</p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
            Discover events<br className="hidden sm:block" /> happening near you
          </h1>
          <p className="mt-4 text-muted-foreground max-w-md">
            Browse concerts, workshops, hackathons and more. Register with one click and get a QR ticket.
          </p>
          {!isAuthenticated && (
            <div className="mt-6 flex gap-3">
              <Link className={buttonVariants()} to="/register">Get started</Link>
              <Link className={buttonVariants({ variant: 'outline' })} to="/calendar">View calendar</Link>
            </div>
          )}
        </div>

        {/* Smart recommendations */}
        {isAuthenticated && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <SparklesIcon className="size-4 text-primary" />
                Smart recommendations
              </CardTitle>
              <CardDescription>
                Pick the categories you care about — we&apos;ll surface relevant events.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => {
                  const selected = selectedLookup.has(c.id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={buttonVariants({ variant: selected ? 'default' : 'outline', size: 'sm' })}
                      onClick={() => toggleInterest(c.id)}
                    >
                      {c.name}
                    </button>
                  )
                })}
              </div>
              <button
                type="button"
                className={buttonVariants({ size: 'sm' })}
                onClick={saveInterests}
                disabled={savingInterests}
              >
                {savingInterests ? 'Saving…' : 'Save interests'}
              </button>

              {recommended.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2 pt-2">
                  {recommended.map((ev) => <EventCard key={ev.id} ev={ev} />)}
                </div>
              )}
              {recommended.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No recommendations yet — save some interests above.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Event listing */}
        <Tabs defaultValue="all">
          <TabsList variant="line">
            <TabsTrigger value="all">All events</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            {loading ? <SkeletonGrid /> : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  {list.map((ev) => <EventCard key={ev.id} ev={ev} />)}
                </div>
                {list.length === 0 && (
                  <p className="text-muted-foreground text-sm">No events yet.</p>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="mt-4">
            {loading ? <SkeletonGrid /> : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  {list
                    .filter((ev) => new Date(ev.end_at) >= new Date())
                    .map((ev) => <EventCard key={ev.id} ev={ev} />)}
                </div>
                {list.filter((ev) => new Date(ev.end_at) >= new Date()).length === 0 && (
                  <p className="text-muted-foreground text-sm">No upcoming events.</p>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  )
}
