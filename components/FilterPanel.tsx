'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SlidersHorizontal, X } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

const STATUSES = ['Pending', 'Assigned', 'In Review', 'Resolved', 'Escalated', 'Flagged']
const CASE_TYPES = ['New Case', 'Seller Appeal', 'Amznpend', 'SOP Discrepancy', 'Defect Review']

export default function FilterPanel() {
  const [open, setOpen] = useState(false)
  const searchParams = useSearchParams()
  const status = searchParams.get('status') || ''
  const case_type = searchParams.get('case_type') || ''
  const radar = searchParams.get('radar') || ''

  const hasActiveFilter = !!status || !!case_type || !!radar
  const activeFilter = { background: 'rgba(255,153,0,0.12)', color: '#E68A00', border: '1px solid rgba(255,153,0,0.4)' }
  const inactiveFilter = { background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }

  return (
    <div className="relative mb-5">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={open || hasActiveFilter ? activeFilter : inactiveFilter}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters
          {hasActiveFilter && (
            <span className="w-4 h-4 rounded-full text-white flex items-center justify-center font-bold"
              style={{ background: '#FF9900', fontSize: '9px' }}>
              {[status, case_type, radar].filter(Boolean).length}
            </span>
          )}
        </button>

        {hasActiveFilter && (
          <Link href="/dashboard"
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-all"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            <X className="w-3 h-3" /> Clear
          </Link>
        )}

        {/* Active filter pills */}
        {status && (
          <span className="px-2 py-1 rounded-full text-xs font-medium" style={activeFilter}>
            {status}
          </span>
        )}
        {case_type && (
          <span className="px-2 py-1 rounded-full text-xs font-medium" style={activeFilter}>
            {case_type}
          </span>
        )}
        {radar && (
          <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(6,182,212,0.12)', color: '#0E7490', border: '1px solid rgba(6,182,212,0.3)' }}>
            📡 RADAR
          </span>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 mt-2 z-20 rounded-xl p-4 w-72 shadow-lg"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>

          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
            Status
          </p>
          <div className="flex flex-wrap gap-1.5 mb-4">
            <Link href="/dashboard" onClick={() => setOpen(false)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
              style={!status && !case_type && !radar ? activeFilter : inactiveFilter}>
              All
            </Link>
            {STATUSES.map((s) => (
              <Link key={s} href={`/dashboard?status=${s}`} onClick={() => setOpen(false)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                style={status === s ? activeFilter : inactiveFilter}>
                {s}
              </Link>
            ))}
            <Link href="/dashboard?radar=1" onClick={() => setOpen(false)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
              style={radar ? { background: 'rgba(6,182,212,0.12)', color: '#0E7490', border: '1px solid rgba(6,182,212,0.3)' } : inactiveFilter}>
              📡 RADAR
            </Link>
          </div>

          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
            Case Type
          </p>
          <div className="flex flex-wrap gap-1.5">
            {CASE_TYPES.map((ct) => (
              <Link key={ct} href={`/dashboard?case_type=${encodeURIComponent(ct)}`} onClick={() => setOpen(false)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                style={case_type === ct ? activeFilter : inactiveFilter}>
                {ct}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
