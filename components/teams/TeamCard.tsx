import type { Profile, TeamUpdate } from '@/lib/types'
import type { TeamDef } from '@/lib/teams'
import { Badge } from '@/components/ui/badge'
import TeamMembersList from './TeamMembersList'
import TeamUpdatesFeed from './TeamUpdatesFeed'
import { Users, Activity, CalendarCheck } from 'lucide-react'

const UPDATES_LIMIT = 3

export default function TeamCard({
  team,
  members,
  updates,
  attendanceRate = null,
}: {
  team: TeamDef
  members: Profile[]
  updates: TeamUpdate[]
  /** 0–1, or null when this team has no attendance recorded yet */
  attendanceRate?: number | null
}) {
  const Icon = team.icon
  const visibleUpdates = updates.slice(0, UPDATES_LIMIT)
  const extraUpdates = Math.max(0, updates.length - UPDATES_LIMIT)

  return (
    <article className="brand-panel card-hover flex flex-col gap-5 rounded-[1.75rem] p-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl text-primary-foreground shadow-[0_12px_24px_oklch(0.5_0.18_257/0.22)]"
            style={{ background: team.accent }}
          >
            <Icon className="size-5" />
          </div>
          <div className="min-w-0 space-y-1">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              {team.name}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {team.description}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge variant="outline" className="h-5 gap-1 text-[10px]">
            <Users className="size-3" />
            {members.length}
          </Badge>
          <Badge variant="outline" className="h-5 gap-1 text-[10px]">
            <Activity className="size-3" />
            {updates.length}
          </Badge>
          {attendanceRate !== null && (
            <Badge
              variant="outline"
              className="h-5 gap-1 text-[10px]"
              title="Share of expected events attended"
            >
              <CalendarCheck className="size-3" />
              {Math.round(attendanceRate * 100)}%
            </Badge>
          )}
        </div>
      </header>

      {/* Members */}
      <section className="space-y-3 rounded-[1.5rem] border border-border/70 bg-white/70 p-4 shadow-[0_10px_26px_oklch(0.22_0.02_255/0.05)]">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-semibold tracking-[0.08em] text-foreground/75 uppercase">
            Members
          </h3>
          <span className="text-[11px] font-medium text-foreground/70">
            {members.length} {members.length === 1 ? 'person' : 'people'}
          </span>
        </div>
        <TeamMembersList members={members} teamName={team.name} />
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            Recent updates
          </h3>
          {extraUpdates > 0 && (
            <span className="text-[11px] text-muted-foreground/70">
              +{extraUpdates} older
            </span>
          )}
        </div>
        <TeamUpdatesFeed updates={visibleUpdates} />
      </section>
    </article>
  )
}
