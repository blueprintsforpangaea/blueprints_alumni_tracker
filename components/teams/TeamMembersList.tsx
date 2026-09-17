import Link from 'next/link'
import type { Profile } from '@/lib/types'
import { Users } from 'lucide-react'

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function MemberChip({ profile }: { profile: Profile }) {
  const initials = getInitials(profile.full_name || '??')

  return (
    <Link
      href={`/profile/${profile.id}`}
      className="group flex items-center gap-2 rounded-full border border-border/70 brand-surface py-1 pr-3 pl-1 text-xs text-foreground transition-all hover:border-primary/30 hover:bg-primary/5"
    >
      {profile.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.avatar_url}
          alt={profile.full_name}
          className="size-6 rounded-full object-cover ring-1 avatar-ring"
        />
      ) : (
        <span className="flex size-6 items-center justify-center rounded-full brand-gradient text-[10px] font-semibold text-primary-foreground">
          {initials}
        </span>
      )}
      <span className="max-w-[10rem] truncate font-medium group-hover:text-brand-gradient">
        {profile.full_name}
      </span>
      {profile.role_title && (
        <span className="hidden truncate text-muted-foreground/80 sm:inline">
          · {profile.role_title}
        </span>
      )}
    </Link>
  )
}

export default function TeamMembersList({
  members,
  teamName,
}: {
  members: Profile[]
  teamName: string
}) {
  if (members.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-center">
        <Users className="mx-auto mb-2 size-5 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground">
          No one is on {teamName} yet.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {members.map((m) => (
        <MemberChip key={m.id} profile={m} />
      ))}
    </div>
  )
}
