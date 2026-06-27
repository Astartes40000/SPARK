import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Clock, CheckCircle, AlertTriangle, ArrowLeft, Tag } from 'lucide-react'

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; case_type?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams
  const { status, case_type } = params

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()
  const isSME = profile?.role === 'sme'
  const isRadar = profile?.role === 'radar_advisor'
  const isAdmin = profile?.role === 'admin'

  let query = supabase
    .from('consultations')
    .select(`*, profiles!consultations_investigator_id_fkey(full_name), sme:profiles!consultations_sme_id_fkey(full_name)`)
    .order('submitted_at', { ascending: false })

  if (isSME) query = query.eq('sme_id', user!.id)
  else if (isRadar) {
    // RADAR advisors see RADAR cases but NOT Defect Review
    query = query.eq('is_radar', true).neq('case_type', 'Defect Review')
  } else {
    query = query.eq('investigator_id', user!.id)
  }
  if (status) query = query.eq('status', status)
  if (case_type) query = query.eq('case_type', case_type)

  const { data: consultations } = await query.limit(100)

  const all = consultations || []
  const stats = {
    total: all.length,
    resolved: all.filter((c) => c.status === 'Resolved').length,
    pending: all.filter((c) => ['Pending', 'Assigned', 'In Review'].includes(c.status)).length,
  }

  const CASE_TYPES = ['New Case', 'Seller Appeal', 'Amznpend', 'SOP Discrepancy', 'Defect Review']
  const STATUSES = ['Pending', 'Assigned', 'In Review', 'Resolved', 'Escalated', 'Flagged']

  const statusStyle: Record<string, React.CSSProperties> = {
    Pending: { background: 'rgba(100,116,139,0.12)', color: '#64748B', border: '1px solid rgba(100,116,139,0.25)' },
    Assigned: { background: 'rgba(26,115,200,0.12)', color: '#1A73C8', border: '1px solid rgba(26,115,200,0.25)' },
    'In Review': { background: 'rgba(26,115,200,0.15)', color: '#1A73C8', border: '1px solid rgba(26,115,200,0.3)' },
    Resolved: { background: 'rgba(22,163,74,0.12)', color: '#16A34A', border: '1px solid rgba(22,163,74,0.25)' },
    Escalated: { background: 'rgba(217,119,6,0.12)', color: '#D97706', border: '1px solid rgba(217,119,6,0.25)' },
    Flagged: { background: 'rgba(220,38,38,0.12)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.25)' },
  }

  const urgencyColor: Record<string, string> = {
    Low: '#4ade80', Medium: '#fbbf24', High: '#fb923c', Critical: '#f87171',
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="p-2 rounded-lg sidebar-link">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#e2e8f0' }}>Archive</h1>
          <p className="text-sm" style={{ color: '#64748b' }}>{isSME ? 'Cases you handled' : 'Your consultation requests'}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, color: 'var(--text)' },
          { label: 'Resolved', value: stats.resolved, color: '#16A34A' },
          { label: 'Pending', value: stats.pending, color: '#1A73C8' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap mb-3">
        <Link href="/dashboard/history"
          className="px-3 py-1.5 rounded-lg text-xs font-medium"
          style={!status && !case_type ? { background: 'rgba(255,153,0,0.12)', color: '#E68A00', border: '1px solid rgba(255,153,0,0.4)' } : { background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
          All
        </Link>
        {STATUSES.map((s) => (
          <Link key={s} href={`/dashboard/history?status=${s}`}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={status === s ? { background: 'rgba(255,153,0,0.12)', color: '#E68A00', border: '1px solid rgba(255,153,0,0.4)' } : { background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            {s}
          </Link>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap mb-5">
        {CASE_TYPES.map((ct) => (
          <Link key={ct} href={`/dashboard/history?case_type=${encodeURIComponent(ct)}`}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={case_type === ct ? { background: 'rgba(255,153,0,0.12)', color: '#E68A00', border: '1px solid rgba(255,153,0,0.4)' } : { background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            {ct}
          </Link>
        ))}
      </div>

      {/* List */}
      {all.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <Clock className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--border)' }} />
          <p style={{ color: 'var(--text-muted)' }}>No consultations found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {all.map((c) => {
            return (
              <Link key={c.id} href={`/dashboard/consult/${c.id}`}
                className="block rounded-xl p-4 transition-all card-hover"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="badge" style={statusStyle[c.status] || statusStyle.Pending}>
                    {c.status === 'Resolved' && <CheckCircle className="w-3 h-3" />}
                    {c.status}
                  </span>
                  <span className="badge" style={{ background: 'rgba(255,153,0,0.1)', color: '#E68A00', border: '1px solid rgba(255,153,0,0.2)' }}>
                    <Tag className="w-3 h-3" />{c.case_type}
                  </span>
                  {c.previous_investigator_conflict && (
                    <span className="badge" style={{ background: 'rgba(217,119,6,0.1)', color: '#D97706', border: '1px solid rgba(217,119,6,0.25)' }}>
                      <AlertTriangle className="w-3 h-3" /> Conflict
                    </span>
                  )}
                  {(c as any).is_radar && (
                    <span className="badge" style={{ background: 'rgba(6,182,212,0.1)', color: '#0E7490', border: '1px solid rgba(6,182,212,0.2)' }}>
                      📡 RADAR
                    </span>
                  )}
                </div>
                <h3 className="font-semibold truncate" style={{ color: 'var(--text)' }}>{c.title}</h3>
                <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {isSME ? <span>by {(c.profiles as any)?.full_name}</span> : <span>SME: {(c.sme as any)?.full_name || 'Unassigned'}</span>}
                  <span>·</span>
                  <span>{formatDistanceToNow(new Date(c.submitted_at), { addSuffix: true })}</span>
                  <span>·</span>
                  <span>{c.assistance_type}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
