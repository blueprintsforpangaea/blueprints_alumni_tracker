import Link from 'next/link'
import type { CalendarEvent } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { MapPin, Clock, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

function getDateOnly(dateStr: string): string {
  return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr
}

function formatDate(dateStr: string): { month: string; day: string; weekday: string } {
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

function groupByDate(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const groups = new Map<string, CalendarEvent[]>()
  for (const event of events) {
    const date = getDateOnly(event.start)
    const group = groups.get(date) ?? []
    group.push(event)
    groups.set(date, group)
  }
  return groups
}

function EventItem({ event }: { event: CalendarEvent }) {
  const time = formatTime(event.start)

  return (
    <Link
      href={`/events/${encodeURIComponent(event.id)}`}
      className="group flex gap-3 items-start transition-colors duration-150 rounded-lg p-2 -mx-2 hover:bg-accent/40"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-semibold leading-snug">{event.title}</p>
          <Badge variant="outline" className="text-[10px]">
            {event.type}
          </Badge>
        </div>
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
        {event.description && (
          <p className="text-xs text-muted-foreground/80 line-clamp-2">{event.description}</p>
        )}
      </div>
    </Link>
  )
}

export default function EventList({ events }: { events: CalendarEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="brand-panel flex flex-col items-center justify-center rounded-[2rem] py-16">
        <Calendar className="size-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No events found</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Try adjusting your filters or check another month.
        </p>
      </div>
    )
  }

  const grouped = groupByDate(events)

  return (
    <div className="space-y-4">
      {Array.from(grouped.entries()).map(([date, dateEvents]) => {
        const { month, day, weekday } = formatDate(date)
        const label = dateLabel(date)
        const today = isToday(date)

        return (
          <div key={date} className="flex gap-4">
            {/* Date box */}
            <div
              className={cn(
                'flex w-14 shrink-0 flex-col items-center rounded-xl py-2 text-center ring-1 transition-shadow duration-200',
                today
                  ? 'bg-primary text-primary-foreground ring-primary shadow-[0_2px_8px_oklch(0.44_0.19_260/0.25)]'
                  : 'ring-border'
              )}
            >
              <span
                className={cn(
                  'text-[10px] uppercase tracking-wide',
                  today ? 'opacity-80' : 'text-muted-foreground'
                )}
              >
                {month}
              </span>
              <span className="text-lg font-bold leading-none">{day}</span>
              <span className={cn('text-[10px]', today ? 'opacity-80' : 'text-muted-foreground')}>
                {weekday}
              </span>
            </div>

            {/* Events for this date */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {label && (
                  <Badge variant={today ? 'default' : 'secondary'} className="text-[10px]">
                    {label}
                  </Badge>
                )}
              </div>
              <div className="space-y-1">
                {dateEvents.map((event) => (
                  <EventItem key={event.id} event={event} />
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
