'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { CompanyGroup, RankedCount } from '@/lib/careers'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getCompanyLogoUrl } from '@/lib/company-brand'
import {
  Search,
  X,
  Building2,
  MapPin,
  Calendar,
  TrendingUp,
  Users,
  Briefcase,
  BarChart3,
  MessageSquare,
} from 'lucide-react'

type Stats = {
  topCompanies: RankedCount[]
  topIndustries: RankedCount[]
  topRoles: RankedCount[]
}

type Props = {
  companyGroups: CompanyGroup[]
  stats: Stats
  employmentTypes: string[]
  industries: string[]
}

export default function CareersExplorer({
  companyGroups,
  stats,
  employmentTypes,
  industries,
}: Props) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [industryFilter, setIndustryFilter] = useState('')

  const filtered = useMemo(() => {
    return companyGroups
      .map((group) => {
        const matchingExps = group.experiences.filter((exp) => {
          if (typeFilter && exp.employment_type !== typeFilter) return false
          if (industryFilter && exp.industry !== industryFilter) return false
          return true
        })
        if (matchingExps.length === 0) return null

        // Recount people (not rows) over whatever survived the filters.
        const statusByMember = new Map(
          matchingExps.map((e) => [e.member_id, e.member_status])
        )
        const statuses = [...statusByMember.values()]

        return {
          ...group,
          experiences: matchingExps,
          uniqueMembers: statusByMember.size,
          alumniCount: statuses.filter((s) => s === 'Alumni').length,
          currentCount: statuses.filter((s) => s === 'Current Member').length,
        }
      })
      .filter((g): g is CompanyGroup => {
        if (!g) return false
        if (!search) return true
        const q = search.toLowerCase()
        return (
          g.company.toLowerCase().includes(q) ||
          g.experiences.some(
            (e) =>
              e.role.toLowerCase().includes(q) ||
              e.member_name.toLowerCase().includes(q) ||
              (e.location?.toLowerCase().includes(q) ?? false)
          )
        )
      })
  }, [companyGroups, search, typeFilter, industryFilter])

  const hasFilters = search || typeFilter || industryFilter

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={Building2}
          title="Top Companies"
          items={stats.topCompanies}
        />
        <StatCard
          icon={BarChart3}
          title="Top Industries"
          items={stats.topIndustries}
        />
        <StatCard
          icon={Briefcase}
          title="Common Roles"
          items={stats.topRoles}
        />
      </div>

      {/* Filters */}
      <div className="brand-panel rounded-[1.5rem] px-4 py-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search companies, roles, or members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 brand-field"
            />
          </div>

          {employmentTypes.length > 0 && (
            <div className="flex items-center gap-1">
              {employmentTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(typeFilter === type ? '' : type)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-all duration-150',
                    typeFilter === type
                      ? 'bg-[linear-gradient(135deg,var(--color-brand-ocean),var(--color-brand-bright))] text-primary-foreground shadow-[0_4px_12px_oklch(0.5_0.18_257/0.2)]'
                      : 'brand-chip text-muted-foreground hover:text-foreground'
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          )}

          {industries.length > 0 && (
            <select
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              className={cn(
                'h-8 rounded-xl brand-field border px-2.5 text-xs font-medium transition-colors outline-none',
                'focus:border-ring focus:ring-2 focus:ring-ring/20',
                industryFilter ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              <option value="">All Industries</option>
              {industries.map((ind) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          )}

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSearch(''); setTypeFilter(''); setIndustryFilter('') }}
              className="text-xs gap-1"
            >
              <X className="size-3" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Results summary */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} compan{filtered.length !== 1 ? 'ies' : 'y'}
        {hasFilters && ' matching filters'}
      </p>

      {/* Company list */}
      {filtered.length === 0 ? (
        <div className="brand-panel flex flex-col items-center justify-center rounded-[2rem] py-16">
          <Building2 className="size-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No companies found</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Try adjusting your search or filters.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((group) => (
            <CompanyCard key={group.company} group={group} />
          ))}
        </div>
      )}
    </div>
  )
}

function CompanyCard({ group }: { group: CompanyGroup }) {
  const [expanded, setExpanded] = useState(false)
  const displayExps = expanded ? group.experiences : group.experiences.slice(0, 3)
  const hasMore = group.experiences.length > 3
  const companyLogoUrl = group.experiences
    .map((exp) => getCompanyLogoUrl(exp.company_website))
    .find(Boolean)

  return (
    <div className="brand-panel rounded-[1.5rem] overflow-hidden">
      {/* Company header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary text-secondary-foreground">
            {companyLogoUrl ? (
              <img
                src={companyLogoUrl}
                alt={`${group.company} logo`}
                className="size-7 object-contain"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <Building2 className="size-4" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{group.company}</p>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="size-3" />
                {group.uniqueMembers} member{group.uniqueMembers !== 1 ? 's' : ''}
              </span>
              {(group.alumniCount > 0 || group.currentCount > 0) && (
                <>
                  <span>·</span>
                  <span>
                    {[
                      group.alumniCount > 0 && `${group.alumniCount} alumni`,
                      group.currentCount > 0 && `${group.currentCount} current`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </>
              )}
              <span>·</span>
              <span>{group.experiences.length} role{group.experiences.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {group.industries.map((ind) => (
            <Badge key={ind} variant="outline" className="text-[10px]">{ind}</Badge>
          ))}
          <TrendingUp className={cn(
            'size-3.5 text-muted-foreground transition-transform',
            expanded && 'rotate-180'
          )} />
        </div>
      </button>

      {/* Experience rows */}
      <div className="border-t border-border/50 divide-y divide-border/30">
        {displayExps.map((exp) => (
          <div key={exp.id} className="flex items-center gap-3 px-5 py-3">
            {/* Avatar */}
            <Link href={`/profile/${exp.member_id}`} className="shrink-0">
              {exp.member_avatar ? (
                <img
                  src={exp.member_avatar}
                  alt={exp.member_name}
                  className="size-8 rounded-full object-cover ring-1 ring-border"
                />
              ) : (
                <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {exp.member_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                </div>
              )}
            </Link>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link
                  href={`/profile/${exp.member_id}`}
                  className="text-sm font-medium hover:underline truncate"
                >
                  {exp.member_name}
                </Link>
                {exp.graduation_year && (
                  <span className="text-[10px] text-muted-foreground">'{String(exp.graduation_year).slice(2)}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{exp.role}</p>
              {exp.description && (
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground/80 line-clamp-2">
                  {exp.description}
                </p>
              )}
            </div>

            {/* Meta */}
            <div className="flex items-center gap-1.5 shrink-0">
              {exp.member_linkedin && (
                <a
                  href={exp.member_linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                  title={`Ask ${exp.member_name} about ${group.company}`}
                >
                  <MessageSquare className="size-3" />
                  <span className="hidden sm:inline">Ask</span>
                </a>
              )}
              {exp.is_current && (
                <Badge variant="default" className="text-[10px]">Current</Badge>
              )}
              {exp.employment_type && (
                <Badge variant="outline" className="text-[10px]">{exp.employment_type}</Badge>
              )}
              {exp.location && (
                <span className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground">
                  <MapPin className="size-3" />
                  {exp.location}
                </span>
              )}
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Calendar className="size-3" />
                {new Date(exp.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        ))}

        {hasMore && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="w-full px-5 py-2.5 text-xs font-medium text-primary hover:bg-accent/30 transition-colors"
          >
            Show {group.experiences.length - 3} more role{group.experiences.length - 3 !== 1 ? 's' : ''}
          </button>
        )}
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  title,
  items,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  items: { name: string; count: number }[]
}) {
  if (items.length === 0) return null

  const max = items[0]?.count ?? 1

  return (
    <div className="brand-panel rounded-[1.5rem] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="size-3.5 text-primary" />
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {title}
        </p>
      </div>
      <div className="space-y-2">
        {items.slice(0, 5).map((item) => (
          <div key={item.name} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="truncate font-medium">{item.name}</span>
              <span className="text-muted-foreground shrink-0 ml-2">{item.count}</span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-[linear-gradient(135deg,var(--color-brand-ocean),var(--color-brand-bright))]"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
