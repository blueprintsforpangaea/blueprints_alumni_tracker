import type { MemberStatus, Profile, WorkExperience } from './types'

// Shared profile ↔ work-experience join. Both /careers and /dashboard need it:
// careers groups by company, dashboard searches people by where they worked.

export type ExperienceWithMember = WorkExperience & {
  member_name: string
  member_avatar: string | null
  member_id: string
  member_status: MemberStatus | null
  graduation_year: number | null
  member_linkedin: string | null
}

export function buildExperiencesWithMembers(
  experiences: WorkExperience[],
  profiles: Profile[]
): ExperienceWithMember[] {
  const profileMap = new Map(profiles.map((p) => [p.id, p]))

  return experiences
    .filter((exp) => exp.company && exp.role)
    .map((exp) => {
      const member = profileMap.get(exp.profile_id)
      return {
        ...exp,
        member_name: member?.full_name ?? 'Unknown member',
        member_avatar: member?.avatar_url ?? null,
        member_id: exp.profile_id,
        member_status: member?.status ?? null,
        graduation_year: member?.graduation_year ?? null,
        member_linkedin: member?.linkedin_url ?? null,
      }
    })
}

export type CompanyGroup = {
  company: string
  experiences: ExperienceWithMember[]
  uniqueMembers: number
  alumniCount: number
  currentCount: number
  industries: string[]
}

export function groupByCompany(experiences: ExperienceWithMember[]): CompanyGroup[] {
  const map = new Map<string, ExperienceWithMember[]>()

  for (const exp of experiences) {
    const key = exp.company.trim().toLowerCase()
    const existing = map.get(key)
    if (existing) {
      existing.push(exp)
    } else {
      map.set(key, [exp])
    }
  }

  return Array.from(map.values())
    .map((exps) => {
      // Count people, not rows — one member with three roles at Google is one contact.
      const membersByStatus = new Map<string, MemberStatus | null>()
      for (const exp of exps) {
        if (!membersByStatus.has(exp.member_id)) {
          membersByStatus.set(exp.member_id, exp.member_status)
        }
      }
      const statuses = [...membersByStatus.values()]

      return {
        company: exps[0].company,
        experiences: exps.sort((a, b) => b.start_date.localeCompare(a.start_date)),
        uniqueMembers: membersByStatus.size,
        alumniCount: statuses.filter((s) => s === 'Alumni').length,
        currentCount: statuses.filter((s) => s === 'Current Member').length,
        industries: [...new Set(exps.map((e) => e.industry).filter(Boolean))] as string[],
      }
    })
    .sort((a, b) => b.uniqueMembers - a.uniqueMembers || a.company.localeCompare(b.company))
}

export type RankedCount = { name: string; count: number }

// Counts by a case-insensitive key while keeping the first spelling seen, so the
// displayed name always belongs to the count next to it.
function rankByKey(
  items: ExperienceWithMember[],
  pick: (exp: ExperienceWithMember) => string | null,
  limit: number
): RankedCount[] {
  const counts = new Map<string, RankedCount>()

  for (const item of items) {
    const raw = pick(item)?.trim()
    if (!raw) continue

    const key = raw.toLowerCase()
    const entry = counts.get(key)
    if (entry) {
      entry.count += 1
    } else {
      counts.set(key, { name: raw, count: 1 })
    }
  }

  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit)
}

export function computeCareerStats(experiences: ExperienceWithMember[]) {
  return {
    topCompanies: rankByKey(experiences, (e) => e.company, 8),
    topIndustries: rankByKey(experiences, (e) => e.industry, 6),
    topRoles: rankByKey(experiences, (e) => e.role, 6),
  }
}

// ─── Per-member career summary (for people search) ────────────────────────────

export type MemberCareer = {
  companies: string[]
  roles: string[]
  industries: string[]
}

export function buildCareerIndex(
  experiences: WorkExperience[]
): Record<string, MemberCareer> {
  const index: Record<string, MemberCareer> = {}

  for (const exp of experiences) {
    if (!exp.profile_id) continue

    const entry = (index[exp.profile_id] ??= {
      companies: [],
      roles: [],
      industries: [],
    })

    if (exp.company && !entry.companies.includes(exp.company)) entry.companies.push(exp.company)
    if (exp.role && !entry.roles.includes(exp.role)) entry.roles.push(exp.role)
    if (exp.industry && !entry.industries.includes(exp.industry)) {
      entry.industries.push(exp.industry)
    }
  }

  return index
}
