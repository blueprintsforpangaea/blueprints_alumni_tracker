'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { CalendarEvent } from '@/lib/types'
import CalendarGrid from './CalendarGrid'
import EventList from './EventList'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { CalendarRange, List, ChevronLeft, ChevronRight, X } from 'lucide-react'

function prevMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function nextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatMonthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function getDateOnly(dateStr: string): string {
  return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr
}

type Props = {
  events: CalendarEvent[]
  currentMonth: string // "YYYY-MM"
}

export default function EventsExplorer({ events, currentMonth }: Props) {
  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState('')

  // Events for the current displayed month only
  const monthEvents = useMemo(() => {
    return events.filter((e) => getDateOnly(e.start).startsWith(currentMonth))
  }, [events, currentMonth])

  // Unique event types in the data
  const eventTypes = useMemo(() => {
    return [...new Set(monthEvents.map((e) => e.type))].sort()
  }, [monthEvents])

  // Apply filters
  const filtered = useMemo(() => {
    return monthEvents.filter((e) => {
      if (typeFilter && e.type !== typeFilter) return false
      if (selectedDate && getDateOnly(e.start) !== selectedDate) return false
      return true
    })
  }, [monthEvents, typeFilter, selectedDate])

  const hasFilters = typeFilter || selectedDate

  function clearFilters() {
    setTypeFilter('')
    setSelectedDate(null)
  }

  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <div className="brand-panel rounded-[1.5rem] px-4 py-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month navigation */}
          <div className="flex items-center gap-1">
            <Link href={`/events?month=${prevMonth(currentMonth)}`}>
              <Button variant="ghost" size="sm" className="size-8 p-0">
                <ChevronLeft className="size-4" />
              </Button>
            </Link>
            <span className="min-w-[140px] text-center text-sm font-semibold">
              {formatMonthLabel(currentMonth)}
            </span>
            <Link href={`/events?month=${nextMonth(currentMonth)}`}>
              <Button variant="ghost" size="sm" className="size-8 p-0">
                <ChevronRight className="size-4" />
              </Button>
            </Link>
          </div>

          {/* Today link */}
          <Link href="/events">
            <Button variant="outline" size="sm" className="text-xs h-7">
              Today
            </Button>
          </Link>

          {/* Spacer */}
          <div className="flex-1" />

          {/* View toggle */}
          <div className="flex items-center gap-1 rounded-xl brand-surface p-0.5 ring-1 ring-border">
            <button
              onClick={() => setView('calendar')}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-150',
                view === 'calendar'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <CalendarRange className="size-3.5" />
              Calendar
            </button>
            <button
              onClick={() => setView('list')}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-150',
                view === 'list'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <List className="size-3.5" />
              List
            </button>
          </div>
        </div>
      </div>

      {/* Type filters */}
      {eventTypes.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {eventTypes.map((type) => (
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
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs gap-1 h-7">
              <X className="size-3" />
              Clear
            </Button>
          )}
        </div>
      )}

      {/* Event count */}
      <p className="text-sm text-muted-foreground">
        {filtered.length} event{filtered.length !== 1 ? 's' : ''}
        {hasFilters && ' matching filters'}
        {' '}in {formatMonthLabel(currentMonth)}
      </p>

      {/* View */}
      {view === 'calendar' ? (
        <div className="space-y-4">
          <CalendarGrid
            events={monthEvents}
            month={currentMonth}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
          {/* Show selected day's events below the grid */}
          {selectedDate && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="text-xs">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Badge>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Show all
                </button>
              </div>
              <EventList events={filtered} />
            </div>
          )}
          {!selectedDate && filtered.length > 0 && <EventList events={filtered} />}
          {!selectedDate && filtered.length === 0 && (
            <EventList events={[]} />
          )}
        </div>
      ) : (
        <EventList events={filtered} />
      )}
    </div>
  )
}
