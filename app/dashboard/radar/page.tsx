import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Globe, Users, Zap } from 'lucide-react'

export default async function RADARPanelPage({
  searchParams,
}: {
  searchParams: Promise<{ specialization?: string; status?: string; search?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams
  const { specialization, status, search } = params

  const { data: advisors } = await supabase
    .from('profiles')
    .select(`*, sme_schedules(*)`)
    .eq('role', 'radar_advisor')
    .order('full_name')

  // Get resolved RADAR cases per advisor
  const { data: resolvedCases } = await supabase
    .from('consultation_messages')
    .select('author_id')

  const caseCount: Record<string, number> = {}
  resolvedCases?.forEach((c) => {
    caseCount[c.author_id] = (caseCount[c.author_id] || 0) + 1
  })

  let filteredAdvisors = advisors || []
  if (search) filteredAdvisors = filteredAdvisors.filter((a) =>
    a.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    ((a.sme_schedules as any)?.[0]?.specializations || []).some((sp: string) => sp.toLowerCase().includes(search.toLowerCase()))
  )
  if (status) filteredAdvisors = filteredAdvisors.filter((a) => (a.sme_schedules as any)?.[0]?.availability_status === status)
  if (specialization) filteredAdvisors = filteredAdvisors.filter((a) => (a.sme_schedules as any)?.[0]?.specializations?.includes(specialization) || a.specializations?.includes(specialization))

  const availableCount = filteredAdvisors.filter((a) => (a.sme_schedules as any)?.[0]?.availability_status === 'Available').length

  const statusDotClass: Record<string, string> = {
    Available: 'status-available',
    Busy: 'status-busy',
    Away: 'status-away',
    Off: 'status-off',
  }

  const statusStyle: Record<string, React.CSSProperties> = {
    Available: { background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' },
    Busy: { background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' },
    Away: { background: 'rgba(100,116,139,0.12)', color: '#94a3b8', border: '1px solid rgba(100,116,139,0.3)' },
    Off: { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' },
  }

  const allSpecializations = Array.from(
    new Set((advisors || []).flatMap((a) => (a.sme_schedules as any)?.[0]?.specializations || a.specializations || []))
  ).filter(Boolean)

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: '#e2e8f0' }}>
            <span style={{ fontSize: '1.25rem' }}>📡</span> RADAR Advisors
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
            <span className="font-medium" style={{ color: '#4ade80' }}>{availableCount} available</span>
            {' · '}{filteredAdvisors.length} total RADAR Advisors
          </p>
        </div>
        <div className="rounded-lg px-4 py-2 text-sm font-medium"
          style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', color: '#22d3ee' }}>
          📡 RADAR Advisors handle flagged cases only
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-xl p-4 mb-6 flex items-start gap-3"
        style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.2)' }}>
        <span style={{ fontSize: '1.5rem' }}>📡</span>
        <div>
          <p className="text-sm font-semibold" style={{ color: '#22d3ee' }}>About RADAR Advisors</p>
          <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
            RADAR Advisors are specialized experts who only handle consultations flagged as RADAR cases.
            When creating a consultation, mark it as RADAR to get their input.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-6">
        {['', 'Available', 'Busy', 'Away'].map((s) => (
          <Link key={s}
            href={`/dashboard/radar${s ? `?status=${s}` : ''}${specialization ? `${s ? '&' : '?'}specialization=${specialization}` : ''}`}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
            style={status === s || (!status && !s)
              ? { background: 'rgba(6,182,212,0.2)', color: '#22d3ee', border: '1px solid rgba(6,182,212,0.4)' }
              : { background: '#111118', color: '#64748b', border: '1px solid #1e1e2e' }}>
            {s && <span className={`w-2 h-2 rounded-full ${statusDotClass[s]}`} />}
            {s === '' ? 'All' : s}
          </Link>
        ))}
        {allSpecializations.slice(0, 5).map((spec: any) => (
          <Link key={spec}
            href={`/dashboard/radar?specialization=${encodeURIComponent(spec)}${status ? `&status=${status}` : ''}`}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={specialization === spec
              ? { background: 'rgba(6,182,212,0.2)', color: '#22d3ee', border: '1px solid rgba(6,182,212,0.4)' }
              : { background: '#111118', color: '#64748b', border: '1px solid #1e1e2e' }}>
            {spec}
          </Link>
        ))}
      </div>

      {/* Grid */}
      {filteredAdvisors.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ background: '#111118', border: '1px solid #1e1e2e' }}>
          <Users className="w-12 h-12 mx-auto mb-3" style={{ color: '#1e1e2e' }} />
          <p className="font-medium" style={{ color: '#64748b' }}>No RADAR Advisors found</p>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>
            Ask your admin to assign the RADAR Advisor role to users
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAdvisors.map((advisor) => {
            const schedule = (advisor.sme_schedules as any)?.[0]
            const availStatus = schedule?.availability_status || 'Off'
            const specializations = schedule?.specializations || advisor.specializations || []
            const languages = schedule?.languages || []
            const responses = caseCount[advisor.id] || 0

            return (
              <div key={advisor.id} className="rounded-xl p-5 transition-all card-hover"
                style={{ background: '#111118', border: '1px solid rgba(6,182,212,0.15)' }}>
                {/* Avatar + status */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #0e7490, #06b6d4)', boxShadow: '0 0 16px rgba(6,182,212,0.3)' }}>
                        {advisor.full_name?.[0]?.toUpperCase() || 'R'}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${statusDotClass[availStatus]}`}
                        style={{ borderColor: '#111118' }} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: '#e2e8f0' }}>{advisor.full_name}</p>
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: 'rgba(6,182,212,0.12)', color: '#22d3ee', border: '1px solid rgba(6,182,212,0.25)' }}>
                        📡 RADAR
                      </span>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={statusStyle[availStatus] || statusStyle.Off}>
                    {availStatus}
                  </span>
                </div>

                {/* Specializations */}
                {specializations.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {specializations.slice(0, 3).map((spec: string) => (
                      <span key={spec} className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(6,182,212,0.08)', color: '#22d3ee', border: '1px solid rgba(6,182,212,0.15)' }}>
                        {spec}
                      </span>
                    ))}
                    {specializations.length > 3 && <span className="text-xs" style={{ color: '#64748b' }}>+{specializations.length - 3}</span>}
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 text-center">
                  {[
                    { label: 'Responses', value: responses },
                    { label: 'Avg resp.', value: schedule?.avg_response_time > 0 ? `${schedule.avg_response_time}m` : '—' },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-lg p-2" style={{ background: '#0d0d14' }}>
                      <p className="text-xs" style={{ color: '#64748b' }}>{stat.label}</p>
                      <p className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Languages + Timezone */}
                {(languages.length > 0 || schedule?.timezone) && (
                  <div className="flex items-center gap-3 mt-3 text-xs" style={{ color: '#64748b' }}>
                    {schedule?.timezone && <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{schedule.timezone}</span>}
                    {languages.length > 0 && <span>💬 {languages.join(', ')}</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
