import Link from 'next/link'
import type { Profile } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { MapPin, Briefcase } from 'lucide-react'

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function MemberCard({
  profile,
  matchReason = null,
}: {
  profile: Profile
  matchReason?: string | null
}) {
  const initials = getInitials(profile.full_name)
  const isAlumni = profile.status === 'Alumni'

  return (
    <Link href={`/profile/${profile.id}`} className="group">
      <div className="brand-panel card-hover flex flex-col items-center gap-3 rounded-[1.5rem] p-5 text-center">
        {/* Avatar */}
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.full_name}
            width={64}
            height={64}
            loading="lazy"
            decoding="async"
            className="size-16 rounded-full object-cover ring-2 ring-white shadow-[0_4px_12px_oklch(0.22_0.07_257/0.12)]"
          />
        ) : (
          <div className="flex size-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--color-brand-ocean),var(--color-brand-bright))] text-lg font-semibold text-primary-foreground shadow-[0_8px_20px_oklch(0.5_0.18_257/0.2)]">
            {initials}
          </div>
        )}

        {/* Name & year */}
        <div className="min-w-0 w-full">
          <p className="truncate text-sm font-semibold text-foreground group-hover:text-brand-gradient transition-colors">
            {profile.full_name}
          </p>
          {profile.graduation_year && (
            <p className="text-xs text-muted-foreground">
              Class of {profile.graduation_year}
            </p>
          )}
        </div>

        {/* Role / Team */}
        {(profile.role_title || profile.team.length > 0) && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Briefcase className="size-3 shrink-0" />
            <span className="truncate">
              {profile.role_title}
              {profile.role_title && profile.team.length > 0 && ' · '}
              {profile.team.join(' · ')}
            </span>
          </div>
        )}

        {/* Location */}
        {profile.location && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">{profile.location}</span>
          </div>
        )}

        {/* Why this person matched the search */}
        {matchReason && (
          <p className="line-clamp-2 rounded-lg bg-primary/5 px-2 py-1 text-[11px] leading-snug text-primary">
            {matchReason}
          </p>
        )}

        {/* Tags row */}
        <div className="flex flex-wrap justify-center gap-1.5">
          {profile.status && (
            <Badge
              variant={isAlumni ? 'outline' : 'secondary'}
              className="text-[10px]"
            >
              {profile.status}
            </Badge>
          )}
          {profile.major && (
            <Badge variant="outline" className="text-[10px]">
              {profile.major}
            </Badge>
          )}
        </div>
      </div>
    </Link>
  )
}
