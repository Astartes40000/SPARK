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
    admin: { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' },
    sme: { background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' },
    investigator: { background: 'rgba(168,85,247,0.12)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.25)' },
    radar_advisor: { background: 'rgba(6,182,212,0.12)', color: '#22d3ee', border: '1px solid rgba(6,182,212,0.25)' },
    pending_sme: { background: 'rgba(234,179,8,0.12)', color: '#facc15', border: '1px solid rgba(234,179,8,0.25)' },
    pending_radar_advisor: { background: 'rgba(234,179,8,0.12)', color: '#facc15', border: '1px solid rgba(234,179,8,0.25)' },
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
        <div className="rounded-xl overflow-hidden" style={{ background: '#111118', border: '1px solid rgba(234,179,8,0.3)' }}>
          <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(234,179,8,0.2)', background: 'rgba(234,179,8,0.05)' }}>
            <Clock className="w-4 h-4" style={{ color: '#facc15' }} />
            <h2 className="font-semibold" style={{ color: '#facc15' }}>Pending Approvals</h2>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(234,179,8,0.2)', color: '#facc15' }}>
              {pendingUsers.length}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: '#0d0d14' }}>
                  {['Name', 'Email', 'Requested Role', 'Submitted', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: '#64748b' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map((u) => (
                  <tr key={u.id} className="transition-colors" style={{ borderTop: '1px solid #1a1a28' }}>
                    <td className="px-6 py-3 text-sm font-medium" style={{ color: '#e2e8f0' }}>{u.full_name || '—'}</td>
                    <td className="px-6 py-3 text-sm" style={{ color: '#64748b' }}>{u.email}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-1.5">
                        {u.role === 'pending_sme' ? (
                          <><GraduationCap className="w-3.5 h-3.5" style={{ color: '#facc15' }} /><span className="badge" style={roleBadge.pending_sme}>SME Expert</span></>
                        ) : (
                          <><Radar className="w-3.5 h-3.5" style={{ color: '#facc15' }} /><span className="badge" style={roleBadge.pending_radar_advisor}>Radar Advisor</span></>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm" style={{ color: '#64748b' }}>
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
          { label: 'Total Users', value: stats.totalUsers, color: '#e2e8f0' },
          { label: 'SMEs', value: stats.smes, color: '#4ade80' },
          { label: 'Investigators', value: stats.investigators, color: '#c084fc' },
          { label: 'RADAR Advisors', value: stats.radarAdvisors, color: '#22d3ee' },
          { label: 'Consultations', value: stats.totalConsultations, color: '#38bdf8' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: '#111118', border: '1px solid #1e1e2e' }}>
            <p className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-1" style={{ color: '#64748b' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#111118', border: '1px solid #1e1e2e' }}>
        <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid #1e1e2e' }}>
          <Users className="w-4 h-4" style={{ color: '#64748b' }} />
          <h2 className="font-semibold" style={{ color: '#e2e8f0' }}>Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: '#0d0d14' }}>
                {['Name', 'Email', 'Role', 'Joined', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: '#64748b' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeUsers.map((u) => (
                <tr key={u.id} className="transition-colors" style={{ borderTop: '1px solid #1a1a28' }}>
                  <td className="px-6 py-3 text-sm font-medium" style={{ color: '#e2e8f0' }}>{u.full_name || '—'}</td>
                  <td className="px-6 py-3 text-sm" style={{ color: '#64748b' }}>{u.email}</td>
                  <td className="px-6 py-3">
                    <span className="badge" style={roleBadge[u.role] || roleBadge.investigator}>{u.role.toUpperCase()}</span>
                  </td>
                  <td className="px-6 py-3 text-sm" style={{ color: '#64748b' }}>
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
