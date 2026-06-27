import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Clock, AlertTriangle, Tag, PlusCircle } from 'lucide-react'
import { redirect } from 'next/navigation'

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ search?: string; status?: string; case_type?: string }> }) {
  const supabase = await createClient()
  const params = await searchParams
  const { search, status, case_type } = params

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()

  const isSME = profile?.role === 'sme'
  const isAdmin = profile?.role === 'admin'
  const isRadar = profile?.role === 'radar_advisor'
  const isPending = profile?.role === 'pending_sme' || profile?.role === 'pending_radar_advisor'

  if (isPending) {
    const requestedRole = profile?.role === 'pending_sme' ? 'SME Expert' : 'Radar Advisor'
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md w-full rounded-2xl p-8 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(217,119,6,0.3)', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(217,119,6,0.08)' }}>
            <Clock className="w-8 h-8" style={{ color: '#D97706' }} />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>Account Pending Approval</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            Your request to join as <span style={{ color: '#D97706' }}>{requestedRole}</span> is under review.
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>You will have full access once your account is approved.</p>
        </div>
      </div>
    )
  }

  let query = supabase.from('consultations')
    .select(`*, profiles!consultations_investigator_id_fkey(full_name, role), sme:profiles!consultations_sme_id_fkey(full_name), sla_tracking(is_overdue, sla_minutes)`)
    .order('submitted_at', { ascending: false })

  if (isSME) query = query.or(`sme_id.is.null,sme_id.eq.${user!.id}`)
  if (isRadar) query = query.eq('is_radar', true)
  if (!isSME && !isAdmin) query = query.or(`case_type.neq.Defect Review,investigator_id.eq.${user!.id}`)
  if (search) query = query.or(`title.ilike.%${search}%,case_id_reference.ilike.%${search}%`)
  if (status) query = query.eq('status', status)
  if (case_type) query = query.eq('case_type', case_type)

  const { data: consultations } = await query.limit(50)

  const all = consultations || []
  const pending = all.filter((c) => c.status === 'Pending').length
  const inReview = all.filter((c) => ['Assigned', 'In Review'].includes(c.status)).length
  const resolved = all.filter((c) => c.status === 'Resolved').length

  const CASE_TYPES = ['New Case', 'Seller Appeal', 'Amznpend', 'SOP Discrepancy', 'Defect Review']
  const STATUSES = ['Pending', 'Assigned', 'In Review', 'Resolved', 'Escalated', 'Flagged']

  const activeFilter = { background: 'rgba(255,153,0,0.12)', color: '#E68A00', border: '1px solid rgba(255,153,0,0.4)' }
  const inactiveFilter = { background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }

  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
            {search ? `Results for "${search}"` : isSME ? 'Open Cases' : isRadar ? '📡 RADAR Cases' : 'Cases'}
          </h1>
          {!isSME && !isRadar && (
            <Link href="/dashboard/consult/new" className="btn-primary text-sm">
              <PlusCircle className="w-4 h-4" /> New Consultation
            </Link>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Pending', value: pending, color: '#64748B' },
            { label: 'In Review', value: inReview, color: '#1A73C8' },
            { label: 'Resolved', value: resolved, color: '#16A34A' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Status filters */}
        <div className="flex gap-2 flex-wrap mb-3">
          <Link href="/dashboard" className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={!status && !case_type ? activeFilter : inactiveFilter}>All</Link>
          {STATUSES.map((s) => (
            <Link key={s} href={`/dashboard?status=${s}`} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={status === s ? activeFilter : inactiveFilter}>{s}</Link>
          ))}
          <Link href="/dashboard?radar=1" className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={search === 'radar' ? { background: 'rgba(6,182,212,0.12)', color: '#0E7490', border: '1px solid rgba(6,182,212,0.3)' } : inactiveFilter}>
            📡 RADAR
          </Link>
        </div>

        {/* Case type filters */}
        <div className="flex gap-2 flex-wrap mb-5">
          {CASE_TYPES.map((ct) => (
            <Link key={ct} href={`/dashboard?case_type=${encodeURIComponent(ct)}`} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={case_type === ct ? activeFilter : inactiveFilter}>{ct}</Link>
          ))}
        </div>

        {/* List */}
        <div className="space-y-2">
          {all.length === 0 ? (
            <div className="rounded-xl p-12 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <Clock className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--border)' }} />
              <p className="font-medium" style={{ color: 'var(--text-muted)' }}>No consultations found</p>
              {!isSME && !isRadar && (
                <Link href="/dashboard/consult/new" className="btn-primary inline-flex mt-4 text-sm">
                  <PlusCircle className="w-4 h-4" /> New Consultation
                </Link>
              )}
            </div>
          ) : all.map((c) => (
            <Link key={c.id} href={`/dashboard/consult/${c.id}`}
              className="block rounded-xl p-4 transition-all card-hover"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #E68A00, #FF9900)' }}>
                  {(c.profiles as any)?.full_name?.[0]?.toUpperCase() || 'I'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`badge status-${c.status.toLowerCase().replace(' ', '-')}`}>{c.status}</span>
                    <span className="badge" style={{ background: 'rgba(255,153,0,0.1)', color: '#E68A00', border: '1px solid rgba(255,153,0,0.25)' }}>
                      <Tag className="w-3 h-3" />{c.case_type}
                    </span>
                    {c.previous_investigator_conflict && (
                      <span className="badge" style={{ background: 'rgba(217,119,6,0.1)', color: '#D97706', border: '1px solid rgba(217,119,6,0.25)' }}>
                        <AlertTriangle className="w-3 h-3" /> Conflict
                      </span>
                    )}
                    {c.is_radar && (
                      <span className="badge" style={{ background: 'rgba(6,182,212,0.12)', color: '#0E7490', border: '1px solid rgba(6,182,212,0.3)' }}>
                        📡 RADAR
                      </span>
                    )}
                    {c.case_type === 'Defect Review' && (
                      <span className="badge" style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.2)' }}>
                        🔒 Sensitive
                      </span>
                    )}
                  </div>
                  <h2 className="font-semibold truncate" style={{ color: 'var(--text)' }}>{c.title}</h2>
                  <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>{(c.profiles as any)?.full_name}</span>
                    <span>·</span>
                    <span>{formatDistanceToNow(new Date(c.submitted_at), { addSuffix: true })}</span>
                    <span>·</span>
                    <span>{c.assistance_type}</span>
                    {c.case_id_reference && <><span>·</span><span className="font-mono" style={{ color: '#FF9900' }}>{c.case_id_reference}</span></>}
                    {(c.sme as any)?.full_name && <><span>·</span><span>SME: {(c.sme as any).full_name}</span></>}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
