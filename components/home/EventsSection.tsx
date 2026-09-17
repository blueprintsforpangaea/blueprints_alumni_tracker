import {
  isGoogleCalendarConfigured,
  getGoogleCalendarConfigIssues,
  getUpcomingCalendarEvents,
  serializeCalendarError,
} from '@/lib/google-calendar'
import type { CalendarEvent } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { connection } from 'next/server'
import { Calendar, MapPin, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

function getDateOnly(dateStr: string): string {
  return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr
}

function formatEventDate(dateStr: string): { month: string; day: string; weekday: string } {
  const d = new Date(dateStr + 'T00:00:00')
  return {
    month: d.toLocaleDateString('en-US', { month: 'short' }),
    day: d.toLocaleDateString('en-US', { day: 'numeric' }),
    weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
  }
}

function formatTime(dateStr: string): string | null {
  if (!dateStr.includes('T')) return null
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().split('T')[0]
}

function isTomorrow(dateStr: string): boolean {
  return dateStr === new Date(Date.now() + 86_400_000).toISOString().split('T')[0]
}

function dateLabel(dateStr: string): string | null {
  if (isToday(dateStr)) return 'Today'
  if (isTomorrow(dateStr)) return 'Tomorrow'
  return null
}

function EventItem({ event }: { event: CalendarEvent }) {
  const date = getDateOnly(event.start)
  const { month, day, weekday } = formatEventDate(date)
  const label = dateLabel(date)
  const today = isToday(date)
  const time = formatTime(event.start)

  return (
    <div className="group flex gap-3 items-start transition-colors duration-150 rounded-lg p-1.5 -mx-1.5 hover:bg-accent/40">
      <div
        className={cn(
          'flex w-12 shrink-0 flex-col items-center rounded-xl py-1.5 text-center ring-1 transition-shadow duration-200',
          today
            ? 'bg-primary text-primary-foreground ring-primary shadow-[0_2px_8px_oklch(0.44_0.19_260/0.25)]'
            : 'ring-border group-hover:ring-border/80'
        )}
      >
        <span className={cn('text-[10px] uppercase tracking-wide', today ? 'opacity-80' : 'text-muted-foreground')}>
          {month}
        </span>
        <span className="text-lg font-bold leading-none">{day}</span>
        <span className={cn('text-[10px]', today ? 'opacity-80' : 'text-muted-foreground')}>
          {weekday}
        </span>
      </div>
      <div className="min-w-0 flex-1 py-0.5 space-y-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-semibold leading-snug">{event.title}</p>
          {label && (
            <Badge variant={today ? 'default' : 'secondary'} className="text-[10px]">
              {label}
            </Badge>
          )}
        </div>
        {event.type && (
          <Badge variant="outline" className="text-[10px]">
            {event.type}
          </Badge>
        )}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          {time && (
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {time}
            </span>
          )}
          {event.location && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3" />
              {event.location}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default async function EventsSection() {
  await connection()

  const configIssues = getGoogleCalendarConfigIssues()

  if (!isGoogleCalendarConfigured()) {
    return (
      <Card className="h-full shadow-sm">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="size-4 text-primary" />
            Upcoming Events
          </CardTitle>
          <CardDescription>What&apos;s on the calendar</CardDescription>
        </CardHeader>
        <CardContent className="pt-3">
          <div className="py-8 text-center">
            <Calendar className="mx-auto size-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">
              Events will appear here once Google Calendar is connected.
            </p>
            {process.env.NODE_ENV !== 'production' && configIssues.length > 0 && (
              <p className="mt-3 rounded-xl bg-secondary/60 px-3 py-2 font-mono text-[11px] text-muted-foreground">
                {configIssues.join(' | ')}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  let events: CalendarEvent[] = []
  let failed = false

  try {
    events = await getUpcomingCalendarEvents()
  } catch (error) {
    console.error(`Failed to load Google Calendar events for home page ${JSON.stringify({
      configIssues,
      error: serializeCalendarError(error),
    })}`)
    failed = true
  }

  return (
    <Card className="h-full shadow-sm">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="size-4 text-primary" />
          Upcoming Events
        </CardTitle>
        <CardDescription>What&apos;s on the calendar</CardDescription>
      </CardHeader>
      <CardContent className="pt-3">
        {failed ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">Could not load events.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Try refreshing the page.</p>
          </div>
        ) : events.length === 0 ? (
          <div className="py-8 text-center">
            <Calendar className="mx-auto size-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No events scheduled for the rest of this week.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <EventItem key={event.id} event={event} />
            ))}
            <Link
              href="/events"
              className="block pt-2 text-center text-xs font-medium text-primary hover:underline"
            >
              View all events &rarr;
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
