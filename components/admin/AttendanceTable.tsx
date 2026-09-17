'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

export type AttendanceRow = {
  profile_id: string
  name: string
  teams: string
  present: number
  late: number
  excused: number
  absent: number
  /** null when nothing was expected of them yet */
  rate: number | null
}

const COLUMNS = ['Name', 'Teams', 'Present', 'Late', 'Excused', 'Absent', 'Rate'] as const

function toCsvCell(value: string | number): string {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function toCsv(rows: AttendanceRow[]): string {
  const lines = [COLUMNS.join(',')]

  for (const row of rows) {
    lines.push(
      [
        row.name,
        row.teams,
        row.present,
        row.late,
        row.excused,
        row.absent,
        row.rate === null ? '' : `${Math.round(row.rate * 100)}%`,
      ]
        .map(toCsvCell)
        .join(',')
    )
  }

  return lines.join('\n')
}

export default function AttendanceTable({ rows }: { rows: AttendanceRow[] }) {
  const [sortByRate, setSortByRate] = useState(false)

  // Members with no expected events sort last rather than reading as 0%.
  const sorted = sortByRate ? [...rows].sort((a, b) => (a.rate ?? 2) - (b.rate ?? 2)) : rows

  function downloadCsv() {
    const blob = new Blob([toCsv(sorted)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `attendance-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border px-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">No attendance recorded yet.</p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          Open an event from the Events page to take a roster.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Attendance</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setSortByRate((v) => !v)}>
            {sortByRate ? 'Sort by name' : 'Lowest rate first'}
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={downloadCsv}>
            <Download className="size-3" />
            CSV
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {COLUMNS.map((column) => (
                <th key={column} className="px-4 py-3 text-left font-medium">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {sorted.map((row) => (
              <tr key={row.profile_id} className="transition-colors hover:bg-muted/30">
                <td className="px-4 py-3">
                  <Link
                    href={`/profile/${row.profile_id}`}
                    className="font-medium hover:underline"
                  >
                    {row.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{row.teams || '—'}</td>
                <td className="px-4 py-3">{row.present}</td>
                <td className="px-4 py-3">{row.late}</td>
                <td className="px-4 py-3">{row.excused}</td>
                <td className="px-4 py-3">{row.absent}</td>
                <td className="px-4 py-3 font-medium">
                  {row.rate === null ? '—' : `${Math.round(row.rate * 100)}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
