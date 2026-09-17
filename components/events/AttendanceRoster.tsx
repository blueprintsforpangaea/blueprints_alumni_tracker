'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { AttendanceStatus, Profile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

type Props = {
  eventId: string
  members: Profile[]
  /** profile_id → status already recorded for this event */
  initialStatuses: Record<string, AttendanceStatus>
}

// Kept here rather than imported from lib/notion-attendance so this client
// component doesn't pull the Notion SDK into the browser bundle.
const STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'Late' },
  { value: 'excused', label: 'Excused' },
  { value: 'absent', label: 'Absent' },
]

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function AttendanceRoster({ eventId, members, initialStatuses }: Props) {
  const router = useRouter()
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>(initialStatuses)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const marked = members.filter((m) => statuses[m.id]).length
  const present = members.filter(
    (m) => statuses[m.id] === 'present' || statuses[m.id] === 'late'
  ).length

  function setStatus(profileId: string, status: AttendanceStatus) {
    setSaved(false)
    setStatuses((prev) => {
      // Tapping the active status again clears it — leaving someone unmarked is
      // different from marking them absent.
      if (prev[profileId] === status) {
        const next = { ...prev }
        delete next[profileId]
        return next
      }
      return { ...prev, [profileId]: status }
    })
  }

  function markAllPresent() {
    setSaved(false)
    setStatuses(Object.fromEntries(members.map((m) => [m.id, 'present' as AttendanceStatus])))
  }

  async function save() {
    setSaving(true)
    setError(null)

    const rows = Object.entries(statuses).map(([profile_id, status]) => ({
      profile_id,
      status,
    }))

    try {
      const res = await fetch(`/api/attendance/${encodeURIComponent(eventId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to save attendance.')
      }

      setSaved(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save attendance.')
    } finally {
      setSaving(false)
    }
  }

  if (members.length === 0) {
    return (
      <div className="brand-panel rounded-[1.5rem] px-5 py-8 text-center">
        <p className="text-sm text-muted-foreground">No members to take attendance for yet.</p>
      </div>
    )
  }

  return (
    <div className="brand-panel space-y-4 rounded-[1.5rem] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Attendance</p>
          <p className="text-xs text-muted-foreground">
            {present} present · {marked} of {members.length} marked
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={markAllPresent}>
          Mark all present
        </Button>
      </div>

      <div className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border/60">
        {members.map((member) => (
          <div key={member.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
            <Link href={`/profile/${member.id}`} className="shrink-0">
              {member.avatar_url ? (
                <img
                  src={member.avatar_url}
                  alt={member.full_name}
                  className="size-8 rounded-full object-cover ring-1 ring-border"
                />
              ) : (
                <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {initials(member.full_name)}
                </div>
              )}
            </Link>

            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {member.full_name}
            </span>

            <div className="flex items-center gap-1">
              {STATUS_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={statuses[member.id] === value}
                  onClick={() => setStatus(member.id, value)}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                    statuses[member.id] === value
                      ? 'brand-gradient text-primary-foreground'
                      : 'brand-chip text-muted-foreground hover:text-foreground'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save roster'}
        </Button>
        {saved && !saving && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Check className="size-3" />
            Saved
          </span>
        )}
      </div>
    </div>
  )
}
