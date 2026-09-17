import crypto from 'crypto'
import type { CalendarEvent } from './types'

// ─── Configuration check ──────────────────────────────────────────────────────

const REQUIRED_GOOGLE_CALENDAR_ENV_VARS = [
  'GOOGLE_CALENDAR_ID',
  'GOOGLE_SERVICE_ACCOUNT_EMAIL',
  'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
] as const

function normalizeEnvString(value: string): string {
  let normalized = value.trim()

  // Vercel env values are sometimes pasted with surrounding quotes.
  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    normalized = normalized.slice(1, -1)
  }

  return normalized
}

function normalizePrivateKey(value: string): string {
  return normalizeEnvString(value)
    .replace(/\r\n/g, '\n')
    .replace(/\\n/g, '\n')
}

function isMissingEnvValue(value: string | undefined): boolean {
  if (!value) return true
  const normalized = normalizeEnvString(value)
  return normalized.length === 0 || normalized === 'REPLACE_ME'
}

export function getGoogleCalendarConfigIssues(): string[] {
  return REQUIRED_GOOGLE_CALENDAR_ENV_VARS.flatMap((key) => {
    const value = process.env[key]

    if (isMissingEnvValue(value)) {
      return [`Missing ${key}`]
    }

    if (
      key === 'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY' &&
      !normalizePrivateKey(value!).includes('BEGIN PRIVATE KEY')
    ) {
      return ['GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is not a valid PEM key']
    }

    return []
  })
}

export function isGoogleCalendarConfigured(): boolean {
  return getGoogleCalendarConfigIssues().length === 0
}

export function serializeCalendarError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const err = error as Error & {
      code?: string
      cause?: unknown
      opensslErrorStack?: string[]
      status?: number
    }

    return {
      name: err.name,
      message: err.message,
      code: err.code,
      status: err.status,
      cause: err.cause,
      opensslErrorStack: err.opensslErrorStack,
      stack: err.stack,
    }
  }

  return { value: error }
}

// ─── Token cache ──────────────────────────────────────────────────────────────

let cachedToken: { token: string; expiry: number } | null = null

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiry > Date.now() + 300_000) {
    return cachedToken.token
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!
  const normalizedEmail = normalizeEnvString(email)
  const privateKey = normalizePrivateKey(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!)

  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(
    JSON.stringify({
      iss: normalizedEmail,
      scope: 'https://www.googleapis.com/auth/calendar.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  ).toString('base64url')

  const signingInput = `${header}.${payload}`
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(signingInput)
  const signature = sign.sign(privateKey, 'base64url')
  const jwt = `${signingInput}.${signature}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${jwt}`,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Google auth failed (${res.status}): ${text}`)
  }

  const data = await res.json()
  cachedToken = {
    token: data.access_token,
    expiry: Date.now() + (data.expires_in ?? 3600) * 1000,
  }

  return data.access_token
}

// ─── Event type parsing ───────────────────────────────────────────────────────
// Events are categorized by title prefix: [Team], [Org], [Social], etc.
// The prefix is stripped from the display title.

const TYPE_PATTERNS: Array<[RegExp, string]> = [
  [/^\[team\]\s*/i, 'Team Meeting'],
  [/^\[org\]\s*/i, 'Org-Wide'],
  [/^\[social\]\s*/i, 'Social'],
  [/^\[recruiting\]\s*/i, 'Recruiting'],
  [/^\[workshop\]\s*/i, 'Workshop'],
]

function parseEventType(title: string): { type: string; cleanTitle: string } {
  for (const [pattern, type] of TYPE_PATTERNS) {
    if (pattern.test(title)) {
      return { type, cleanTitle: title.replace(pattern, '').trim() }
    }
  }
  return { type: 'General', cleanTitle: title }
}

// ─── Google Calendar API types ────────────────────────────────────────────────

type GCalEvent = {
  id: string
  summary?: string
  description?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  location?: string
  organizer?: { email?: string; displayName?: string }
  status?: string
}

function toCalendarEvent(event: GCalEvent): CalendarEvent {
  const { type, cleanTitle } = parseEventType(event.summary ?? 'Untitled')
  return {
    id: event.id,
    title: cleanTitle,
    description: event.description ?? null,
    start: event.start.dateTime ?? event.start.date ?? '',
    end: event.end.dateTime ?? event.end.date ?? '',
    allDay: !event.start.dateTime,
    location: event.location ?? null,
    organizer: event.organizer?.displayName ?? event.organizer?.email ?? null,
    type,
  }
}

// ─── Response cache ───────────────────────────────────────────────────────────
// Cache API responses for 5 minutes to avoid unnecessary round-trips.

const responseCache = new Map<string, { data: CalendarEvent[]; expiry: number }>()
const CACHE_TTL = 5 * 60 * 1000

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getCalendarEvents(
  timeMin: string,
  timeMax: string
): Promise<CalendarEvent[]> {
  const cacheKey = `${timeMin}|${timeMax}`
  const cached = responseCache.get(cacheKey)
  if (cached && cached.expiry > Date.now()) {
    return cached.data
  }

  const token = await getAccessToken()
  const calendarId = normalizeEnvString(process.env.GOOGLE_CALENDAR_ID!)

  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
  )
  url.searchParams.set('timeMin', timeMin)
  url.searchParams.set('timeMax', timeMax)
  url.searchParams.set('singleEvents', 'true')
  url.searchParams.set('orderBy', 'startTime')
  url.searchParams.set('maxResults', '250')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Google Calendar API error (${res.status}): ${text}`)
  }

  const data = await res.json()
  const items: GCalEvent[] = data.items ?? []
  const events = items
    .filter((e) => e.status !== 'cancelled')
    .map(toCalendarEvent)

  responseCache.set(cacheKey, { data: events, expiry: Date.now() + CACHE_TTL })
  return events
}

/**
 * Fetches one event by id. The roster API uses this so the event title and date
 * written to Notion come from Google, not from whatever the client posted.
 */
export async function getCalendarEventById(eventId: string): Promise<CalendarEvent | null> {
  const token = await getAccessToken()
  const calendarId = normalizeEnvString(process.env.GOOGLE_CALENDAR_ID!)

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId
    )}/events/${encodeURIComponent(eventId)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  if (res.status === 404) return null

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Google Calendar API error (${res.status}): ${text}`)
  }

  const event: GCalEvent = await res.json()
  if (event.status === 'cancelled') return null

  return toCalendarEvent(event)
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getEndOfWeek(date = new Date()): Date {
  const endOfWeek = new Date(date)
  const daysUntilSunday = (7 - endOfWeek.getDay()) % 7
  endOfWeek.setDate(endOfWeek.getDate() + daysUntilSunday)
  endOfWeek.setHours(23, 59, 59, 999)
  return endOfWeek
}

function getEventEndTimestamp(event: CalendarEvent): number {
  return Date.parse(event.end)
}

/** Fetches upcoming events from now through the end of the current week. */
export async function getUpcomingCalendarEvents(limit = 6): Promise<CalendarEvent[]> {
  const timeMin = new Date().toISOString()
  const timeMax = getEndOfWeek().toISOString()
  const events = await getCalendarEvents(timeMin, timeMax)
  return events.slice(0, limit)
}

export function filterPastEvents(events: CalendarEvent[], now = new Date()): CalendarEvent[] {
  const nowTimestamp = now.getTime()
  return events.filter((event) => getEventEndTimestamp(event) >= nowTimestamp)
}

/** Returns ISO strings for a 3-month window centered on the given month (YYYY-MM). */
export function getThreeMonthWindow(monthStr: string): {
  timeMin: string
  timeMax: string
} {
  const [year, month] = monthStr.split('-').map(Number)
  const start = new Date(Date.UTC(year, month - 2, 1))
  const end = new Date(Date.UTC(year, month + 1, 1))
  return {
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
  }
}
