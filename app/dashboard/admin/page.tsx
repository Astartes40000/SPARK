import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import AdminActions from './AdminActions'
import Link from 'next/link'
import { Users, BarChart2, Clock, GraduationCap, Radar } from 'lucide-react'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: users } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
  const { data: consultations } = await supabase.from('consultations').select('status').limit(200)

  const pendingUsers = users?.filter(u => u.role === 'pending_sme' || u.role === 'pending_radar_advisor') || []
  const activeUsers = users?.filter(u => u.role !== 'pending_sme' && u.role !== 'pending_radar_advisor') || []

  const stats = {
    totalUsers: activeUsers.length,
    smes: activeUsers.filter(u => u.role === 'sme').length,
    investigators: activeUsers.filter(u => u.role === 'investigator').length,
    radarAdvisors: activeUsers.filter(u => u.role === 'radar_advisor').length,
    totalConsultations: consultations?.length || 0,
  }

  const roleBadge: Record<string, React.CSSProperties> = {
    admin: { background: 'rgba(220,38,38,0.1)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.2)' },
    sme: { background: 'rgba(22,163,74,0.1)', color: '#16A34A', border: '1px solid rgba(22,163,74,0.2)' },
    investigator: { background: 'rgba(26,115,200,0.1)', color: '#1A73C8', border: '1px solid rgba(26,115,200,0.2)' },
    radar_advisor: { background: 'rgba(6,182,212,0.1)', color: '#0E7490', border: '1px solid rgba(6,182,212,0.2)' },
    pending_sme: { background: 'rgba(217,119,6,0.1)', color: '#D97706', border: '1px solid rgba(217,119,6,0.2)' },
    pending_radar_advisor: { background: 'rgba(217,119,6,0.1)', color: '#D97706', border: '1px solid rgba(217,119,6,0.2)' },
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: '#e2e8f0' }}>Admin Panel</h1>
        <Link href="/dashboard/admin/metrics" className="btn-primary text-sm">
          <BarChart2 className="w-4 h-4" /> View Metrics
        </Link>
      </div>

      {/* Pending requests */}
      {pendingUsers.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(217,119,6,0.3)' }}>
          <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(217,119,6,0.2)', background: 'rgba(217,119,6,0.04)' }}>
            <Clock className="w-4 h-4" style={{ color: '#D97706' }} />
            <h2 className="font-semibold" style={{ color: '#D97706' }}>Pending Approvals</h2>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(217,119,6,0.15)', color: '#D97706' }}>
              {pendingUsers.length}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: 'var(--bg-elevated)' }}>
                  {['Name', 'Email', 'Requested Role', 'Submitted', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map((u) => (
                  <tr key={u.id} className="transition-colors" style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="px-6 py-3 text-sm font-medium" style={{ color: 'var(--text)' }}>{u.full_name || '—'}</td>
                    <td className="px-6 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-1.5">
                        {u.role === 'pending_sme' ? (
                          <><GraduationCap className="w-3.5 h-3.5" style={{ color: '#D97706' }} /><span className="badge" style={roleBadge.pending_sme}>SME Expert</span></>
                        ) : (
                          <><Radar className="w-3.5 h-3.5" style={{ color: '#D97706' }} /><span className="badge" style={roleBadge.pending_radar_advisor}>Radar Advisor</span></>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                      {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-6 py-3">
                      <AdminActions userId={u.id} currentRole={u.role} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Users', value: stats.totalUsers, color: 'var(--text)' },
          { label: 'SMEs', value: stats.smes, color: '#16A34A' },
          { label: 'Investigators', value: stats.investigators, color: '#1A73C8' },
          { label: 'RADAR Advisors', value: stats.radarAdvisors, color: '#0E7490' },
          { label: 'Consultations', value: stats.totalConsultations, color: '#FF9900' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <p className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
          <Users className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <h2 className="font-semibold" style={{ color: 'var(--text)' }}>Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {['Name', 'Email', 'Role', 'Joined', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeUsers.map((u) => (
                <tr key={u.id} className="transition-colors" style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="px-6 py-3 text-sm font-medium" style={{ color: 'var(--text)' }}>{u.full_name || '—'}</td>
                  <td className="px-6 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                  <td className="px-6 py-3">
                    <span className="badge" style={roleBadge[u.role] || roleBadge.investigator}>{u.role.toUpperCase()}</span>
                  </td>
                  <td className="px-6 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                    {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                  </td>
                  <td className="px-6 py-3">
                    {u.role !== 'admin' && <AdminActions userId={u.id} currentRole={u.role} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
