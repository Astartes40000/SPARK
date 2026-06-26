import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import AdminActions from './AdminActions'
import Link from 'next/link'
import { Users, BarChart2 } from 'lucide-react'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: users } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
  const { data: consultations } = await supabase.from('consultations').select('status').limit(200)

  const stats = {
    totalUsers: users?.length || 0,
    smes: users?.filter((u) => u.role === 'sme').length || 0,
    investigators: users?.filter((u) => u.role === 'investigator').length || 0,
    radarAdvisors: users?.filter((u) => u.role === 'radar_advisor').length || 0,
    totalConsultations: consultations?.length || 0,
  }

  const roleBadge: Record<string, React.CSSProperties> = {
    admin: { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' },
    sme: { background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' },
    investigator: { background: 'rgba(168,85,247,0.12)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.25)' },
    radar_advisor: { background: 'rgba(6,182,212,0.12)', color: '#22d3ee', border: '1px solid rgba(6,182,212,0.25)' },
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: '#e2e8f0' }}>Admin Panel</h1>
        <Link href="/dashboard/admin/metrics" className="btn-primary text-sm">
          <BarChart2 className="w-4 h-4" /> View Metrics
        </Link>
      </div>

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
              {users?.map((u) => (
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
