import { getAllProfiles } from '@/lib/notion'
import { getTeamUpdates } from '@/lib/notion-teams'
import { getAllAttendance } from '@/lib/notion-attendance'
import type { AttendanceRecord } from '@/lib/types'
import { TEAMS } from '@/lib/teams'
import { Badge } from '@/components/ui/badge'
import { FolderKanban } from 'lucide-react'
import TeamsGrid from '@/components/teams/TeamsGrid'

export const metadata = { title: 'Teams — Blueprints for Pangaea' }
export const dynamic = 'force-dynamic'

export default async function TeamsPage() {
  const [profiles, updates, attendance] = await Promise.all([
    getAllProfiles(),
    getTeamUpdates(),
    getAllAttendance(),
  ])

  const attendanceByProfile: Record<string, AttendanceRecord[]> = {}
  for (const record of attendance) {
    if (!record.profile_id) continue
    ;(attendanceByProfile[record.profile_id] ??= []).push(record)
  }

  const assigned = profiles.filter((p) => p.team.length > 0).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--color-brand-ocean),var(--color-brand-bright))] text-primary-foreground shadow-[0_12px_24px_oklch(0.5_0.18_257/0.22)]">
            <FolderKanban className="size-4" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Teams</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px]">
            {TEAMS.length} teams
          </Badge>
          <Badge variant="outline" className="text-[11px]">
            {assigned} assigned
          </Badge>
          <Badge variant="outline" className="text-[11px]">
            {updates.length} updates
          </Badge>
        </div>
      </div>

      <TeamsGrid
        profiles={profiles}
        updates={updates}
        attendanceByProfile={attendanceByProfile}
      />
    </div>
  )
}
