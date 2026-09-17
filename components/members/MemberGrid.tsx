import type { Profile } from '@/lib/types'
import MemberCard from './MemberCard'

export type MemberResult = {
  profile: Profile
  matchReason: string | null
}

export default function MemberGrid({ results }: { results: MemberResult[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {results.map(({ profile, matchReason }) => (
        <MemberCard key={profile.id} profile={profile} matchReason={matchReason} />
      ))}
    </div>
  )
}
