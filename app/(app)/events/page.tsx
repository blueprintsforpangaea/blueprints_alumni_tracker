import { Calendar } from 'lucide-react'
import type { CalendarEvent } from '@/lib/types'
import {
  isGoogleCalendarConfigured,
  filterPastEvents,
  getCalendarEvents,
  getGoogleCalendarConfigIssues,
  serializeCalendarError,
  getThreeMonthWindow,
} from '@/lib/google-calendar'
import EventsExplorer from '@/components/events/EventsExplorer'

export const metadata = { title: 'Events — Blueprints for Pangaea' }
export const dynamic = 'force-dynamic'

function PageHeader() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 items-center justify-center rounded-2xl brand-gradient text-primary-foreground shadow-[0_12px_24px_oklch(0.5_0.18_257/0.22)]">
        <Calendar className="size-4" />
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
        <p className="text-sm text-muted-foreground">
          Track the moments bringing the network together
        </p>
      </div>
    </div>
  )
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month: monthParam } = await searchParams
  const currentMonth =
    monthParam && /^\d{4}-\d{2}$/.test(monthParam)
      ? monthParam
      : new Date().toISOString().slice(0, 7)
  const configIssues = getGoogleCalendarConfigIssues()

  if (!isGoogleCalendarConfigured()) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <div className="brand-panel flex flex-col items-center justify-center rounded-[2rem] py-16">
          <Calendar className="size-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            Google Calendar is not connected yet.
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Events will appear here once the calendar integration is configured.
          </p>
          {process.env.NODE_ENV !== 'production' && configIssues.length > 0 && (
            <p className="mt-3 rounded-xl bg-secondary/60 px-3 py-2 font-mono text-[11px] text-muted-foreground">
              {configIssues.join(' | ')}
            </p>
          )}
        </div>
      </div>
    )
  }

  let events: CalendarEvent[] = []
  let failed = false

  try {
    const { timeMin, timeMax } = getThreeMonthWindow(currentMonth)
    events = filterPastEvents(await getCalendarEvents(timeMin, timeMax))
  } catch (error) {
    console.error(`Failed to load Google Calendar events for /events ${JSON.stringify({
      currentMonth,
      configIssues,
      error: serializeCalendarError(error),
    })}`)
    failed = true
  }

  if (failed) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <div className="brand-panel flex flex-col items-center justify-center rounded-[2rem] py-16">
          <Calendar className="size-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Could not load events.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Try refreshing the page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader />
      <EventsExplorer events={events} currentMonth={currentMonth} />
    </div>
  )
}
