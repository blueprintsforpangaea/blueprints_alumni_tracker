import { getAllWorkExperiences, getAllProfiles } from '@/lib/notion'
import {
  buildExperiencesWithMembers,
  computeCareerStats,
  groupByCompany,
} from '@/lib/careers'
import type { WorkExperience, Profile } from '@/lib/types'
import { Briefcase } from 'lucide-react'
import CareersExplorer from '@/components/careers/CareersExplorer'

export const metadata = { title: 'Careers — Blueprints for Pangaea' }
export const dynamic = 'force-dynamic'

export default async function CareersPage() {
  let experiences: WorkExperience[] = []
  let profiles: Profile[] = []
  let failed = false

  try {
    ;[experiences, profiles] = await Promise.all([
      getAllWorkExperiences(),
      getAllProfiles(),
    ])
  } catch {
    failed = true
  }

  if (failed) {
    return (
      <div className="space-y-6">
        <PageHeader count={0} />
        <div className="brand-panel flex flex-col items-center justify-center rounded-[2rem] py-16">
          <Briefcase className="size-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Could not load career data.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Try refreshing the page.</p>
        </div>
      </div>
    )
  }

  const withMembers = buildExperiencesWithMembers(experiences, profiles)
  const companyGroups = groupByCompany(withMembers)
  const stats = computeCareerStats(withMembers)

  const employmentTypes = [
    ...new Set(withMembers.map((e) => e.employment_type).filter(Boolean)),
  ] as string[]
  const industries = [
    ...new Set(withMembers.map((e) => e.industry).filter(Boolean)),
  ].sort() as string[]

  return (
    <div className="space-y-6">
      <PageHeader count={withMembers.length} />
      <CareersExplorer
        companyGroups={companyGroups}
        stats={stats}
        employmentTypes={employmentTypes}
        industries={industries}
      />
    </div>
  )
}

function PageHeader({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--color-brand-ocean),var(--color-brand-bright))] text-primary-foreground shadow-[0_12px_24px_oklch(0.5_0.18_257/0.22)]">
        <Briefcase className="size-4" />
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Career Explorer</h1>
        <p className="text-sm text-muted-foreground">
          {count} work experience{count !== 1 ? 's' : ''} across the Blueprints network
        </p>
      </div>
    </div>
  )
}
