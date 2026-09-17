import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getAllProfiles, getProfileByClerkId } from '@/lib/notion'
import { getCalendarEventById } from '@/lib/google-calendar'
import {
  isAttendanceConfigured,
  isAttendanceStatus,
  saveAttendance,
  type AttendanceInput,
} from '@/lib/notion-attendance'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const viewer = await getProfileByClerkId(userId)
  // ponytail: admins only. Calendar events carry no team, so there's nothing to
  // check "is this person's team" against yet. Widen once events name a team.
  if (!viewer?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!isAttendanceConfigured()) {
    return NextResponse.json(
      { error: 'Attendance is not configured. Set NOTION_ATTENDANCE_DB_ID.' },
      { status: 503 }
    )
  }

  const { eventId } = await params

  // Title and date come from Google, never from the request body.
  let event
  try {
    event = await getCalendarEventById(eventId)
  } catch (error) {
    console.error('[POST /api/attendance/:eventId] Failed to load event.', { eventId, error })
    return NextResponse.json({ error: 'Could not load the event.' }, { status: 502 })
  }

  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const body = await req.json().catch(() => null)
  const rawRows = Array.isArray(body?.rows) ? body.rows : null
  if (!rawRows) {
    return NextResponse.json({ error: 'Expected a rows array.' }, { status: 400 })
  }

  // Only profiles that actually exist, and only statuses we recognise.
  const profiles = await getAllProfiles()
  const profilesById = new Map(profiles.map((p) => [p.id, p]))

  const rows: AttendanceInput[] = []
  for (const row of rawRows) {
    const profile = profilesById.get(row?.profile_id)
    if (!profile) {
      return NextResponse.json(
        { error: `Unknown member in roster: ${row?.profile_id}` },
        { status: 400 }
      )
    }
    if (!isAttendanceStatus(row?.status)) {
      return NextResponse.json({ error: `Invalid status: ${row?.status}` }, { status: 400 })
    }
    rows.push({
      profile_id: profile.id,
      profile_name: profile.full_name,
      status: row.status,
    })
  }

  try {
    await saveAttendance(
      { id: event.id, title: event.title, date: event.start || null },
      rows,
      viewer.id
    )
  } catch (error) {
    console.error('[POST /api/attendance/:eventId] Failed to save attendance.', {
      eventId,
      count: rows.length,
      error,
    })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save attendance.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, saved: rows.length })
}
