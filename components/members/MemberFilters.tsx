'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  years: number[]
  majors: string[]
  teams: string[]
}

const STATUS_OPTIONS = ['Current Member', 'Alumni'] as const

export default function MemberFilters({ years, majors, teams }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const qParam = searchParams.get('q') ?? ''
  const [q, setQ] = useState(qParam)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const year = searchParams.get('year') ?? ''
  const major = searchParams.get('major') ?? ''
  const status = searchParams.get('status') ?? ''
  const team = searchParams.get('team') ?? ''

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      router.push(`/dashboard?${params.toString()}`)
    },
    [router, searchParams]
  )

  // Sync local state when URL changes externally (e.g. Clear button)
  useEffect(() => {
    setQ(qParam)
  }, [qParam])

  const updateSearch = useCallback(
    (value: string) => {
      setQ(value)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        updateParam('q', value)
      }, 300)
    },
    [updateParam]
  )

  const hasFilters = q || year || major || status || team

  return (
    <div className="brand-panel rounded-[1.5rem] px-4 py-3">
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name..."
            value={q}
            onChange={(e) => updateSearch(e.target.value)}
            className="pl-8 h-8 brand-field"
          />
        </div>

        {/* Status pills */}
        <div className="flex items-center gap-1">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => updateParam('status', status === opt ? '' : opt)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-all duration-150',
                status === opt
                  ? 'brand-gradient text-primary-foreground shadow-[0_4px_12px_oklch(0.5_0.18_257/0.2)]'
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
          onChange={(v) => updateParam('year', v)}
          placeholder="Year"
          options={years.map((y) => ({ value: String(y), label: String(y) }))}
        />

        {majors.length > 0 && (
          <FilterSelect
            value={major}
            onChange={(v) => updateParam('major', v)}
            placeholder="Major"
            options={majors.map((m) => ({ value: m, label: m }))}
          />
        )}

        {teams.length > 0 && (
          <FilterSelect
            value={team}
            onChange={(v) => updateParam('team', v)}
            placeholder="Team"
            options={teams.map((t) => ({ value: t, label: t }))}
          />
        )}

        {/* Clear */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard')}
            className="text-xs gap-1"
          >
            <X className="size-3" />
            Clear
          </Button>
        )}
      </div>
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
