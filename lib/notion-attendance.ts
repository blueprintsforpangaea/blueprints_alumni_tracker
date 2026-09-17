import { Client } from '@notionhq/client'
import { unstable_cache, revalidateTag } from 'next/cache'
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import type { AttendanceRecord, AttendanceStatus } from './types'

const notion = new Client({ auth: process.env.NOTION_TOKEN })

const ATTENDANCE_DB = process.env.NOTION_ATTENDANCE_DB_ID

export const ATTENDANCE_TAG = 'attendance'

export const ATTENDANCE_STATUSES: readonly AttendanceStatus[] = [
  'present',
  'late',
  'excused',
  'absent',
] as const

export function isAttendanceStatus(value: unknown): value is AttendanceStatus {
  return typeof value === 'string' && (ATTENDANCE_STATUSES as readonly string[]).includes(value)
}

export function isAttendanceConfigured(): boolean {
  return Boolean(ATTENDANCE_DB)
}

// ─── Property helpers ─────────────────────────────────────────────────────────

function getText(page: PageObjectResponse, prop: string): string {
  const p = page.properties[prop]
  if (!p) return ''
  if (p.type === 'title') return p.title[0]?.plain_text ?? ''
  if (p.type === 'rich_text') return p.rich_text[0]?.plain_text ?? ''
  return ''
}

function getSelect(page: PageObjectResponse, prop: string): string | null {
  const p = page.properties[prop]
  return p?.type === 'select' ? (p.select?.name ?? null) : null
}

function getDate(page: PageObjectResponse, prop: string): string | null {
  const p = page.properties[prop]
  return p?.type === 'date' ? (p.date?.start ?? null) : null
}

function getRelationId(page: PageObjectResponse, prop: string): string | null {
  const p = page.properties[prop]
  return p?.type === 'relation' ? (p.relation[0]?.id ?? null) : null
}

function pageToAttendance(page: PageObjectResponse): AttendanceRecord {
  const status = getSelect(page, 'status')
  return {
    id: page.id,
    profile_id: getRelationId(page, 'Profile') ?? '',
    event_id: getText(page, 'event_id'),
    event_title: getText(page, 'event_title'),
    date: getDate(page, 'date'),
    status: isAttendanceStatus(status) ? status : 'absent',
  }
}

async function queryAll(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filter?: any
): Promise<AttendanceRecord[]> {
  if (!ATTENDANCE_DB) return []

  const pages: PageObjectResponse[] = []
  let cursor: string | undefined

  try {
    do {
      const res = await notion.databases.query({
        database_id: ATTENDANCE_DB,
        filter,
        start_cursor: cursor,
        page_size: 100,
      })
      pages.push(...(res.results as PageObjectResponse[]))
      cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined
    } while (cursor)
  } catch (error) {
    console.error('Failed to query attendance.', error)
    return []
  }

  return pages.map(pageToAttendance)
}

// ─── Queries ──────────────────────────────────────────────────────────────────
// Tagged, not just TTL'd: a lead has to see their own roster save immediately,
// so every mutation below revalidates the tag.

export const getAttendanceForEvent = unstable_cache(
  (eventId: string) => queryAll({ property: 'event_id', rich_text: { equals: eventId } }),
  ['getAttendanceForEvent'],
  { tags: [ATTENDANCE_TAG], revalidate: 60 }
)

export const getAttendanceForProfile = unstable_cache(
  (profileId: string) => queryAll({ property: 'Profile', relation: { contains: profileId } }),
  ['getAttendanceForProfile'],
  { tags: [ATTENDANCE_TAG], revalidate: 60 }
)

export const getAllAttendance = unstable_cache(() => queryAll(), ['getAllAttendance'], {
  tags: [ATTENDANCE_TAG],
  revalidate: 60,
})

// ─── Mutations ────────────────────────────────────────────────────────────────

export type AttendanceInput = {
  profile_id: string
  profile_name: string
  status: AttendanceStatus
}

// Notion allows roughly 3 requests/sec, so a Promise.all over a 100-person
// roster would 429. Writes go out in small waves instead.
// ponytail: fixed chunk size, no backoff. Add retry-on-429 if rosters grow past
// a few hundred rows or leads start seeing partial saves.
const WRITE_CHUNK = 3

async function inChunks<T>(items: T[], run: (item: T) => Promise<unknown>): Promise<void> {
  for (let i = 0; i < items.length; i += WRITE_CHUNK) {
    await Promise.all(items.slice(i, i + WRITE_CHUNK).map(run))
  }
}

export async function saveAttendance(
  event: { id: string; title: string; date: string | null },
  rows: AttendanceInput[],
  recordedByProfileId: string
): Promise<void> {
  if (!ATTENDANCE_DB) {
    throw new Error(
      'Attendance is not configured. Set NOTION_ATTENDANCE_DB_ID and create the Attendance database.'
    )
  }

  const existing = await queryAll({ property: 'event_id', rich_text: { equals: event.id } })
  const existingByProfile = new Map(existing.map((record) => [record.profile_id, record]))

  const updates = rows.filter((row) => {
    const match = existingByProfile.get(row.profile_id)
    return match && match.status !== row.status
  })
  const creates = rows.filter((row) => !existingByProfile.has(row.profile_id))

  await inChunks(updates, (row) =>
    notion.pages.update({
      page_id: existingByProfile.get(row.profile_id)!.id,
      properties: {
        status: { select: { name: row.status } },
        recorded_by: { relation: [{ id: recordedByProfileId }] },
      },
    })
  )

  await inChunks(creates, (row) =>
    notion.pages.create({
      parent: { database_id: ATTENDANCE_DB },
      properties: {
        Name: { title: [{ text: { content: `${event.title} — ${row.profile_name}` } }] },
        Profile: { relation: [{ id: row.profile_id }] },
        event_id: { rich_text: [{ text: { content: event.id } }] },
        event_title: { rich_text: [{ text: { content: event.title } }] },
        ...(event.date ? { date: { date: { start: event.date } } } : {}),
        status: { select: { name: row.status } },
        recorded_by: { relation: [{ id: recordedByProfileId }] },
      },
    })
  )

  revalidateTag(ATTENDANCE_TAG, { expire: 0 })
}

// ─── Derived stats ────────────────────────────────────────────────────────────

/** Counts an event as attended when the member was present or late. */
export function countAttended(records: AttendanceRecord[]): number {
  return records.filter((r) => r.status === 'present' || r.status === 'late').length
}

/** Rate over records that expected the member — excused absences don't count against them. */
export function attendanceRate(records: AttendanceRecord[]): number | null {
  const expected = records.filter((r) => r.status !== 'excused')
  if (expected.length === 0) return null
  return countAttended(expected) / expected.length
}
