import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { CheckCircle, Users, TrendingUp, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function MetricsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: consultations } = await supabase
    .from('consultations')
    .select(`*, profiles!consultations_investigator_id_fkey(full_name), sme:profiles!consultations_sme_id_fkey(full_name)`)
    .order('submitted_at', { ascending: false })

  const all = consultations || []
  const total = all.length
  const resolved = all.filter((c) => c.status === 'Resolved').length
  const pending = all.filter((c) => c.status === 'Pending').length
  const escalated = all.filter((c) => c.status === 'Escalated').length
  const flagged = all.filter((c) => c.status === 'Flagged').length
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0

  const byType: Record<string, number> = {}
  all.forEach((c) => { byType[c.case_type] = (byType[c.case_type] || 0) + 1 })

  const byUrgency: Record<string, number> = {}
  all.forEach((c) => { byUrgency[c.urgency_level] = (byUrgency[c.urgency_level] || 0) + 1 })

  const byAssistance: Record<string, number> = {}
  all.forEach((c) => { byAssistance[c.assistance_type] = (byAssistance[c.assistance_type] || 0) + 1 })

  const smeWorkload: Record<string, { name: string; count: number; resolved: number }> = {}
  all.forEach((c) => {
    if (c.sme_id && (c.sme as any)?.full_name) {
      if (!smeWorkload[c.sme_id]) smeWorkload[c.sme_id] = { name: (c.sme as any).full_name, count: 0, resolved: 0 }
      smeWorkload[c.sme_id].count++
      if (c.status === 'Resolved') smeWorkload[c.sme_id].resolved++
    }
  })

  const urgencyBarColor: Record<string, string> = {
    Critical: 'linear-gradient(90deg, #dc2626, #ef4444)',
    High: 'linear-gradient(90deg, #ea580c, #f97316)',
    Medium: 'linear-gradient(90deg, #d97706, #f59e0b)',
    Low: 'linear-gradient(90deg, #16a34a, #22c55e)',
  }

  const cardStyle: React.CSSProperties = { background: 'var(--bg-surface)', border: '1px solid var(--border)' }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/admin" className="p-2 rounded-lg" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Queue Metrics</h1>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total', value: total, icon: <TrendingUp className="w-5 h-5" />, color: 'var(--text)' },
          { label: 'Resolved', value: `${resolved} (${resolutionRate}%)`, icon: <CheckCircle className="w-5 h-5" />, color: '#16A34A' },
          { label: 'Pending', value: pending, icon: <CheckCircle className="w-5 h-5" />, color: '#1A73C8' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-4" style={cardStyle}>
            <div className="mb-2" style={{ color: s.color }}>{s.icon}</div>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* By case type */}
        <div className="rounded-xl p-5" style={cardStyle}>
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>By Case Type</h3>
          <div className="space-y-3">
            {Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span style={{ color: 'var(--text-dim)' }}>{type}</span>
                  <span className="font-medium" style={{ color: 'var(--text)' }}>{count}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                  <div className="h-full rounded-full" style={{ width: `${total > 0 ? (count / total) * 100 : 0}%`, background: 'linear-gradient(90deg, #E68A00, #FF9900)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By urgency */}
        <div className="rounded-xl p-5" style={cardStyle}>
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>By Urgency</h3>
          <div className="space-y-3">
            {['Critical','High','Medium','Low'].map((level) => {
              const count = byUrgency[level] || 0
              return (
                <div key={level}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span style={{ color: 'var(--text-dim)' }}>{level}</span>
                    <span className="font-medium" style={{ color: 'var(--text)' }}>{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                    <div className="h-full rounded-full" style={{ width: `${total > 0 ? (count / total) * 100 : 0}%`, background: urgencyBarColor[level] }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* By assistance */}
        <div className="rounded-xl p-5" style={cardStyle}>
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>By Assistance Type</h3>
          <div className="space-y-3">
            {Object.entries(byAssistance).map(([type, count]) => (
              <div key={type}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span style={{ color: 'var(--text-dim)' }}>{type}</span>
                  <span className="font-medium" style={{ color: 'var(--text)' }}>{count}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                  <div className="h-full rounded-full" style={{ width: `${total > 0 ? (count / total) * 100 : 0}%`, background: 'linear-gradient(90deg, #1A73C8, #3B8DDB)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl p-5" style={cardStyle}>
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>Alerts</h3>
          <div className="space-y-3">
            {[
              { label: 'Escalated', value: escalated, style: { background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.2)', color: '#D97706' } },
              { label: 'Flagged', value: flagged, style: { background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: '#DC2626' } },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between px-3 py-2.5 rounded-lg" style={item.style}>
                <span className="flex items-center gap-2 text-sm font-medium">⚠️ {item.label}</span>
                <span className="text-lg font-bold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SME Workload */}
      <div className="rounded-xl overflow-hidden mb-4" style={cardStyle}>
        <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
          <Users className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <h3 className="font-semibold" style={{ color: 'var(--text)' }}>SME Workload</h3>
        </div>
        {Object.keys(smeWorkload).length === 0 ? (
          <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>No SME data yet</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {['SME', 'Assigned', 'Resolved', 'Rate'].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(smeWorkload).sort((a, b) => b[1].count - a[1].count).map(([id, data]) => (
                <tr key={id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="px-6 py-3 text-sm font-medium">
                    <Link href={`/dashboard/smes/${id}`} style={{ color: '#FF9900' }} className="hover:underline">{data.name}</Link>
                  </td>
                  <td className="px-6 py-3 text-sm" style={{ color: 'var(--text-dim)' }}>{data.count}</td>
                  <td className="px-6 py-3 text-sm font-medium" style={{ color: '#16A34A' }}>{data.resolved}</td>
                  <td className="px-6 py-3 text-sm" style={{ color: 'var(--text-dim)' }}>{data.count > 0 ? `${Math.round((data.resolved / data.count) * 100)}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent consultations */}
      <div className="rounded-xl overflow-hidden" style={cardStyle}>
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Recent Consultations</h3>
        </div>
        <div>
          {all.slice(0, 10).map((c) => (
            <Link key={c.id} href={`/dashboard/consult/${c.id}`}
              className="flex items-center justify-between px-6 py-3 metrics-link"
              style={{ borderTop: '1px solid var(--border)' }}>
              <div>
                <p className="text-sm font-medium truncate max-w-xs" style={{ color: 'var(--text)' }}>{c.title}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {(c.profiles as any)?.full_name} · {c.case_type}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge text-xs" style={
                  c.status === 'Resolved' ? { background: 'rgba(22,163,74,0.1)', color: '#16A34A', border: '1px solid rgba(22,163,74,0.2)' } :
                  c.status === 'Flagged' ? { background: 'rgba(220,38,38,0.1)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.2)' } :
                  { background: 'rgba(255,153,0,0.1)', color: '#E68A00', border: '1px solid rgba(255,153,0,0.2)' }
                }>{c.status}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDistanceToNow(new Date(c.submitted_at), { addSuffix: true })}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/admin" className="p-2 rounded-lg" style={{ color: '#64748b' }}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold" style={{ color: '#e2e8f0' }}>Queue Metrics</h1>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total', value: total, icon: <TrendingUp className="w-5 h-5" />, color: '#e2e8f0' },
          { label: 'Resolved', value: `${resolved} (${resolutionRate}%)`, icon: <CheckCircle className="w-5 h-5" />, color: '#4ade80' },
          { label: 'Pending', value: pending, icon: <CheckCircle className="w-5 h-5" />, color: '#38bdf8' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-4" style={cardStyle}>
            <div className="mb-2" style={{ color: s.color }}>{s.icon}</div>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* By case type */}
        <div className="rounded-xl p-5" style={cardStyle}>
          <h3 className="font-semibold mb-4" style={{ color: '#e2e8f0' }}>By Case Type</h3>
          <div className="space-y-3">
            {Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span style={{ color: '#94a3b8' }}>{type}</span>
                  <span className="font-medium" style={{ color: '#e2e8f0' }}>{count}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1e1e2e' }}>
                  <div className="h-full rounded-full" style={{ width: `${total > 0 ? (count / total) * 100 : 0}%`, background: 'linear-gradient(90deg, #7c3aed, #a855f7)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By urgency */}
        <div className="rounded-xl p-5" style={cardStyle}>
          <h3 className="font-semibold mb-4" style={{ color: '#e2e8f0' }}>By Urgency</h3>
          <div className="space-y-3">
            {['Critical','High','Medium','Low'].map((level) => {
              const count = byUrgency[level] || 0
              return (
                <div key={level}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span style={{ color: '#94a3b8' }}>{level}</span>
                    <span className="font-medium" style={{ color: '#e2e8f0' }}>{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1e1e2e' }}>
                    <div className="h-full rounded-full" style={{ width: `${total > 0 ? (count / total) * 100 : 0}%`, background: urgencyBarColor[level] }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* By assistance */}
        <div className="rounded-xl p-5" style={cardStyle}>
          <h3 className="font-semibold mb-4" style={{ color: '#e2e8f0' }}>By Assistance Type</h3>
          <div className="space-y-3">
            {Object.entries(byAssistance).map(([type, count]) => (
              <div key={type}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span style={{ color: '#94a3b8' }}>{type}</span>
                  <span className="font-medium" style={{ color: '#e2e8f0' }}>{count}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1e1e2e' }}>
                  <div className="h-full rounded-full" style={{ width: `${total > 0 ? (count / total) * 100 : 0}%`, background: 'linear-gradient(90deg, #0ea5e9, #38bdf8)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

          <div className="rounded-xl p-5" style={cardStyle}>
          <h3 className="font-semibold mb-4" style={{ color: '#e2e8f0' }}>Alerts</h3>
          <div className="space-y-3">
            {[
              { label: 'Escalated', value: escalated, style: { background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', color: '#fb923c' } },
              { label: 'Flagged', value: flagged, style: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' } },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between px-3 py-2.5 rounded-lg" style={item.style}>
                <span className="flex items-center gap-2 text-sm font-medium">⚠️ {item.label}</span>
                <span className="text-lg font-bold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SME Workload */}
      <div className="rounded-xl overflow-hidden mb-4" style={cardStyle}>
        <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid #1e1e2e' }}>
          <Users className="w-4 h-4" style={{ color: '#64748b' }} />
          <h3 className="font-semibold" style={{ color: '#e2e8f0' }}>SME Workload</h3>
        </div>
        {Object.keys(smeWorkload).length === 0 ? (
          <p className="text-center text-sm py-8" style={{ color: '#64748b' }}>No SME data yet</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ background: '#0d0d14' }}>
                {['SME', 'Assigned', 'Resolved', 'Rate'].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: '#64748b' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(smeWorkload).sort((a, b) => b[1].count - a[1].count).map(([id, data]) => (
                <tr key={id} style={{ borderTop: '1px solid #1a1a28' }}>
                  <td className="px-6 py-3 text-sm font-medium">
                    <Link href={`/dashboard/smes/${id}`} style={{ color: '#c084fc' }} className="hover:underline">{data.name}</Link>
                  </td>
                  <td className="px-6 py-3 text-sm" style={{ color: '#94a3b8' }}>{data.count}</td>
                  <td className="px-6 py-3 text-sm font-medium" style={{ color: '#4ade80' }}>{data.resolved}</td>
                  <td className="px-6 py-3 text-sm" style={{ color: '#94a3b8' }}>{data.count > 0 ? `${Math.round((data.resolved / data.count) * 100)}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent consultations */}
      <div className="rounded-xl overflow-hidden" style={cardStyle}>
        <div className="px-6 py-4" style={{ borderBottom: '1px solid #1e1e2e' }}>
          <h3 className="font-semibold" style={{ color: '#e2e8f0' }}>Recent Consultations</h3>
        </div>
        <div>
          {all.slice(0, 10).map((c) => (
            <Link key={c.id} href={`/dashboard/consult/${c.id}`}
              className="flex items-center justify-between px-6 py-3 metrics-link"
              style={{ borderTop: '1px solid #1a1a28' }}>
              <div>
                <p className="text-sm font-medium truncate max-w-xs" style={{ color: '#e2e8f0' }}>{c.title}</p>
                <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                  {(c.profiles as any)?.full_name} · {c.case_type} · {c.urgency_level}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge text-xs" style={
                  c.status === 'Resolved' ? { background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' } :
                  c.status === 'Flagged' ? { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' } :
                  { background: 'rgba(168,85,247,0.1)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.2)' }
                }>{c.status}</span>
                <span className="text-xs" style={{ color: '#64748b' }}>{formatDistanceToNow(new Date(c.submitted_at), { addSuffix: true })}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
