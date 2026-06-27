import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Globe, Users, Zap } from 'lucide-react'

export default async function SMEPanelPage({
  searchParams,
}: {
  searchParams: Promise<{ specialization?: string; status?: string; search?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams
  const { specialization, status, search } = params

  const { data: smes } = await supabase
    .from('profiles')
    .select(`*, sme_schedules(*)`)
    .eq('role', 'sme')
    .order('full_name')

  let filteredSMEs = smes || []
  if (search) filteredSMEs = filteredSMEs.filter((s) =>
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    ((s.sme_schedules as any)?.[0]?.specializations || []).some((sp: string) => sp.toLowerCase().includes(search.toLowerCase()))
  )
  if (specialization) filteredSMEs = filteredSMEs.filter((s) => (s.sme_schedules as any)?.[0]?.specializations?.includes(specialization) || s.specializations?.includes(specialization))
  if (status) filteredSMEs = filteredSMEs.filter((s) => (s.sme_schedules as any)?.[0]?.availability_status === status)

  const allSpecializations = Array.from(new Set((smes || []).flatMap((s) => (s.sme_schedules as any)?.[0]?.specializations || s.specializations || []))).filter(Boolean)
  const availableCount = filteredSMEs.filter((s) => (s.sme_schedules as any)?.[0]?.availability_status === 'Available').length

  const statusDotClass: Record<string, string> = {
    Available: 'status-available',
    Busy: 'status-busy',
    Away: 'status-away',
    Off: 'status-off',
  }

  const statusStyle: Record<string, React.CSSProperties> = {
    Available: { background: 'rgba(22,163,74,0.12)', color: '#16A34A', border: '1px solid rgba(22,163,74,0.3)' },
    Busy: { background: 'rgba(217,119,6,0.12)', color: '#D97706', border: '1px solid rgba(217,119,6,0.3)' },
    Away: { background: 'rgba(100,116,139,0.12)', color: '#64748B', border: '1px solid rgba(100,116,139,0.3)' },
    Off: { background: 'rgba(220,38,38,0.12)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.3)' },
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>SME&apos;s</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            <span style={{ color: '#16A34A' }} className="font-medium">{availableCount} available</span>
            {' · '}{filteredSMEs.length} total SMEs
          </p>
        </div>
        <Link href="/dashboard/consult/new" className="btn-primary text-sm">
          <Zap className="w-4 h-4" /> New Consultation
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-6">
        {['', 'Available', 'Busy', 'Away'].map((s) => (
          <Link key={s}
            href={`/dashboard/smes${s ? `?status=${s}` : ''}${specialization ? `${s ? '&' : '?'}specialization=${specialization}` : ''}`}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
            style={status === s || (!status && !s)
              ? { background: 'rgba(255,153,0,0.12)', color: '#E68A00', border: '1px solid rgba(255,153,0,0.4)' }
              : { background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            {s && <span className={`w-2 h-2 rounded-full ${statusDotClass[s]}`} />}
            {s === '' ? 'All' : s}
          </Link>
        ))}
        {allSpecializations.slice(0, 5).map((spec: any) => (
          <Link key={spec}
            href={`/dashboard/smes?specialization=${encodeURIComponent(spec)}${status ? `&status=${status}` : ''}`}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={specialization === spec
              ? { background: 'rgba(255,153,0,0.12)', color: '#E68A00', border: '1px solid rgba(255,153,0,0.4)' }
              : { background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            {spec}
          </Link>
        ))}
      </div>

      {/* SME Grid */}
      {filteredSMEs.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <Users className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--border)' }} />
          <p className="font-medium" style={{ color: 'var(--text-muted)' }}>No SMEs found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSMEs.map((sme) => {
            const schedule = (sme.sme_schedules as any)?.[0]
            const availStatus = schedule?.availability_status || 'Off'
            const specializations = schedule?.specializations || sme.specializations || []
            const languages = schedule?.languages || []

            return (
              <Link key={sme.id} href={`/dashboard/smes/${sme.id}`}
                className="block rounded-xl p-5 transition-all card-hover"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #E68A00, #FF9900)' }}>
                        {sme.full_name?.[0]?.toUpperCase() || 'S'}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${statusDotClass[availStatus]}`}
                        style={{ borderColor: 'var(--bg-surface)' }} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{sme.full_name}</p>
                      {sme.site && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{sme.site}</p>}
                    </div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={statusStyle[availStatus] || statusStyle.Off}>{availStatus}</span>
                </div>

                {specializations.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {specializations.slice(0, 3).map((spec: string) => (
                      <span key={spec} className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(255,153,0,0.1)', color: '#E68A00', border: '1px solid rgba(255,153,0,0.2)' }}>
                        {spec}
                      </span>
                    ))}
                    {specializations.length > 3 && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>+{specializations.length - 3}</span>}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-center">
                  {[
                    { label: 'Queue', value: schedule?.current_queue || 0 },
                    { label: 'Avg resp.', value: schedule?.avg_response_time > 0 ? `${schedule.avg_response_time}m` : '—' },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-lg p-2" style={{ background: 'var(--bg-elevated)' }}>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{stat.value}</p>
                    </div>
                  ))}
                </div>

                {(languages.length > 0 || schedule?.timezone) && (
                  <div className="flex items-center gap-3 mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {schedule?.timezone && <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{schedule.timezone}</span>}
                    {languages.length > 0 && <span>💬 {languages.join(', ')}</span>}
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
