import Link from 'next/link'
import { notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { ArrowLeft, Calendar, MapPin, User } from 'lucide-react'
import { getCalendarEventById, isGoogleCalendarConfigured } from '@/lib/google-calendar'
import { getAllProfiles, getProfileByClerkId } from '@/lib/notion'
import { getAttendanceForEvent, isAttendanceConfigured } from '@/lib/notion-attendance'
import type { AttendanceStatus } from '@/lib/types'
import AttendanceRoster from '@/components/events/AttendanceRoster'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

function formatWhen(start: string, end: string, allDay: boolean): string {
  const startDate = new Date(start)
  const day = startDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  if (allDay) return `${day} · All day`

  const time = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const endTime = end
    ? new Date(end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : null

  return endTime ? `${day} · ${time} – ${endTime}` : `${day} · ${time}`
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params

  if (!isGoogleCalendarConfigured()) notFound()

  const { userId } = await auth()

  let event
  try {
    event = await getCalendarEventById(eventId)
  } catch (error) {
    console.error('Failed to load calendar event.', { eventId, error })
    event = null
  }

  if (!event) notFound()

  const viewer = userId ? await getProfileByClerkId(userId) : null
  const isAdmin = viewer?.is_admin ?? false

  // Only admins can see or change the roster, so nobody else pays for the reads.
  const [members, records] = isAdmin
    ? await Promise.all([
        getAllProfiles({ status: 'Current Member' }),
        getAttendanceForEvent(eventId),
      ])
    : [[], []]

  const initialStatuses: Record<string, AttendanceStatus> = Object.fromEntries(
    records.filter((r) => r.profile_id).map((r) => [r.profile_id, r.status])
  )

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-up">
      <Link
        href="/events"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3" />
        Back to events
      </Link>

      <div className="brand-panel space-y-3 rounded-[2rem] px-6 py-7 sm:px-8">
        <Badge variant="outline" className="text-[11px]">
          {event.type}
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{event.title}</h1>

        <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="size-3.5" />
            {formatWhen(event.start, event.end, event.allDay)}
          </span>
          {event.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {event.location}
            </span>
          )}
          {event.organizer && (
            <span className="inline-flex items-center gap-1.5">
              <User className="size-3.5" />
              {event.organizer}
            </span>
          )}
        </div>

        {event.description && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {event.description}
          </p>
        )}
      </div>

      {isAdmin &&
        (isAttendanceConfigured() ? (
          <AttendanceRoster
            eventId={event.id}
            members={members}
            initialStatuses={initialStatuses}
          />
        ) : (
          <div className="brand-panel rounded-[1.5rem] px-5 py-8 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              Attendance is not set up yet.
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Create the Attendance database and set NOTION_ATTENDANCE_DB_ID. See
              notion-setup.md.
            </p>
          </div>
        ))}
    </div>
  )
}
