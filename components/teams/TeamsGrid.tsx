import type { AttendanceRecord, Profile, TeamUpdate } from '@/lib/types'
import { attendanceRate } from '@/lib/notion-attendance'
import { TEAMS } from '@/lib/teams'
import TeamCard from './TeamCard'
import { cn } from '@/lib/utils'

export default function TeamsGrid({
  profiles,
  updates,
  attendanceByProfile = {},
}: {
  profiles: Profile[]
  updates: TeamUpdate[]
  /** profile_id → their attendance records, for the per-team rate badge */
  attendanceByProfile?: Record<string, AttendanceRecord[]>
}) {
  const membersByTeam = new Map<string, Profile[]>()
  for (const p of profiles) {
    for (const teamName of p.team) {
      const list = membersByTeam.get(teamName) ?? []
      list.push(p)
      membersByTeam.set(teamName, list)
    }
  }

  const updatesByTeam = new Map<string, TeamUpdate[]>()
  for (const u of updates) {
    if (!u.team) continue
    const list = updatesByTeam.get(u.team) ?? []
    list.push(u)
    updatesByTeam.set(u.team, list)
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {TEAMS.map((team, idx) => (
        <div
          key={team.slug}
          className={cn(
            'animate-fade-up',
            idx === 0
              ? 'stagger-1'
              : idx === 1
                ? 'stagger-2'
                : idx === 2
                  ? 'stagger-3'
                  : idx === 3
                    ? 'stagger-4'
                    : idx === 4
                      ? 'stagger-5'
                      : 'stagger-6'
          )}
        >
          <TeamCard
            team={team}
            members={membersByTeam.get(team.name) ?? []}
            updates={updatesByTeam.get(team.name) ?? []}
            attendanceRate={attendanceRate(
              (membersByTeam.get(team.name) ?? []).flatMap(
                (member) => attendanceByProfile[member.id] ?? []
              )
            )}
          />
        </div>
      ))}
    </div>
  )
}
