'use client'

import { useMemo, useState } from 'react'
import type { Profile } from '@/lib/types'
import type { MemberCareer } from '@/lib/careers'
import MemberGrid from './MemberGrid'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  profiles: Profile[]
  careers?: Record<string, MemberCareer>
}

const STATUS_OPTIONS = ['Current Member', 'Alumni'] as const

// A labelled slice of a profile that search can match on. The label is what the
// card shows back ("why did this person come up?"), so it has to read well.
type SearchField = { label: string; value: string }

function buildFields(profile: Profile, career: MemberCareer | undefined): SearchField[] {
  const fields: SearchField[] = [{ label: 'name', value: profile.full_name }]

  const push = (label: string, value: string | null | undefined) => {
    if (value) fields.push({ label, value })
  }
  const pushAll = (label: string, values: string[]) => {
    for (const value of values) push(label, value)
  }

  // Career first: "who worked at Google" is the question this page exists for,
  // so a company hit should win over a bio hit on the same query.
  pushAll('company', career?.companies ?? [])
  pushAll('role', career?.roles ?? [])
  pushAll('industry', career?.industries ?? [])

  push('major', profile.major)
  push('minor', profile.minor)
  push('title', profile.role_title)
  push('chapter role', profile.chapter_role)
  pushAll('team', profile.team)
  pushAll('skill', profile.skills)
  pushAll('class', profile.current_classes)
  pushAll('hobby', profile.hobbies)
  push('location', profile.location)
  push('hometown', profile.hometown)
  push('bio', profile.bio)
  push('fun fact', profile.fun_fact)

  return fields
}

export default function MemberDirectory({ profiles, careers = {} }: Props) {
  const [q, setQ] = useState('')
  const [year, setYear] = useState('')
  const [major, setMajor] = useState('')
  const [status, setStatus] = useState('')
  const [team, setTeam] = useState('')
  const [company, setCompany] = useState('')
  const [industry, setIndustry] = useState('')

  const index = useMemo(
    () =>
      profiles.map((profile) => {
        const career = careers[profile.id]
        return {
          profile,
          career,
          fields: buildFields(profile, career),
        }
      }),
    [profiles, careers]
  )

  const years = useMemo(
    () =>
      [...new Set(profiles.map((p) => p.graduation_year).filter(Boolean))].sort(
        (a, b) => b! - a!
      ) as number[],
    [profiles]
  )
  const majors = useMemo(
    () => [...new Set(profiles.map((p) => p.major).filter(Boolean))].sort() as string[],
    [profiles]
  )
  const teams = useMemo(
    () => [...new Set(profiles.flatMap((p) => p.team))].sort(),
    [profiles]
  )
  const companies = useMemo(
    () => [...new Set(Object.values(careers).flatMap((c) => c.companies))].sort(),
    [careers]
  )
  const industries = useMemo(
    () => [...new Set(Object.values(careers).flatMap((c) => c.industries))].sort(),
    [careers]
  )

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()

    return index.flatMap(({ profile, career, fields }) => {
      if (year && profile.graduation_year !== parseInt(year)) return []
      if (major && profile.major !== major) return []
      if (status && profile.status !== status) return []
      if (team && !profile.team.includes(team)) return []
      if (company && !career?.companies.includes(company)) return []
      if (industry && !career?.industries.includes(industry)) return []

      if (!query) return [{ profile, matchReason: null }]

      const hit = fields.find((f) => f.value.toLowerCase().includes(query))
      if (!hit) return []

      // A name hit needs no explanation — the name is already on the card.
      const matchReason = hit.label === 'name' ? null : `${hit.label}: ${hit.value}`

      return [{ profile, matchReason }]
    })
  }, [index, q, year, major, status, team, company, industry])

  const hasFilters = q || year || major || status || team || company || industry

  function clearAll() {
    setQ('')
    setYear('')
    setMajor('')
    setStatus('')
    setTeam('')
    setCompany('')
    setIndustry('')
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="brand-panel rounded-[1.5rem] px-4 py-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search name, company, skill, class, hometown..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-8 h-8 brand-field"
            />
          </div>

          {/* Status pills */}
          <div className="flex items-center gap-1">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setStatus(status === opt ? '' : opt)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-all duration-150',
                  status === opt
                    ? 'bg-[linear-gradient(135deg,var(--color-brand-ocean),var(--color-brand-bright))] text-primary-foreground shadow-[0_4px_12px_oklch(0.5_0.18_257/0.2)]'
                    : 'brand-chip text-muted-foreground hover:text-foreground'
                )}
              >
                {opt}
              </button>
            ))}
          </div>

          {/* Dropdowns */}
          <FilterSelect
            value={year}
            onChange={setYear}
            placeholder="Year"
            options={years.map((y) => ({ value: String(y), label: String(y) }))}
          />

          {majors.length > 0 && (
            <FilterSelect
              value={major}
              onChange={setMajor}
              placeholder="Major"
              options={majors.map((m) => ({ value: m, label: m }))}
            />
          )}

          {teams.length > 0 && (
            <FilterSelect
              value={team}
              onChange={setTeam}
              placeholder="Team"
              options={teams.map((t) => ({ value: t, label: t }))}
            />
          )}

          {industries.length > 0 && (
            <FilterSelect
              value={industry}
              onChange={setIndustry}
              placeholder="Industry"
              options={industries.map((i) => ({ value: i, label: i }))}
            />
          )}

          {companies.length > 0 && (
            <FilterSelect
              value={company}
              onChange={setCompany}
              placeholder="Company"
              options={companies.map((c) => ({ value: c, label: c }))}
            />
          )}

          {/* Clear */}
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="text-xs gap-1"
            >
              <X className="size-3" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Count */}
      <p className="text-sm text-muted-foreground">
        {filtered.length} member{filtered.length !== 1 ? 's' : ''}
        {hasFilters && ' matching filters'}
        {' '}· {profiles.length} total
      </p>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="brand-panel flex flex-col items-center justify-center rounded-[2rem] py-16">
          <Search className="size-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No members found</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Try adjusting your search or filters.
          </p>
        </div>
      ) : (
        <MemberGrid results={filtered} />
      )}
    </div>
  )
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'h-8 rounded-xl brand-field border px-2.5 text-xs font-medium transition-colors outline-none',
        'focus:border-ring focus:ring-2 focus:ring-ring/20',
        value ? 'text-foreground' : 'text-muted-foreground'
      )}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
