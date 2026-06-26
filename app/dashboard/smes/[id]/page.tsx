import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Globe, Star, Clock, Briefcase, MessageSquare, Phone, Users, Calendar } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default async function SMEProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: sme } = await supabase.from('profiles').select('*, sme_schedules(*)').eq('id', id).eq('role', 'sme').single()
  if (!sme) notFound()

  const schedule = (sme.sme_schedules as any)?.[0]
  const { data: ratings } = await supabase.from('ratings').select('*, profiles!ratings_investigator_id_fkey(full_name)').eq('sme_id', id).order('created_at', { ascending: false }).limit(10)
  const { count: resolvedCount } = await supabase.from('consultations').select('*', { count: 'exact', head: true }).eq('sme_id', id).eq('status', 'Resolved')

  const avgRating = ratings && ratings.length > 0 ? ratings.reduce((a, b) => a + b.rating, 0) / ratings.length : null
  const availStatus = schedule?.availability_status || 'Off'
  const specializations = schedule?.specializations || sme.specializations || []
  const languages = schedule?.languages || []
  const workingDays = schedule?.working_days || []

  const statusDotClass: Record<string, string> = { Available: 'status-available', Busy: 'status-busy', Away: 'status-away', Off: 'status-off' }
  const statusStyle: Record<string, React.CSSProperties> = {
    Available: { background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' },
    Busy: { background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' },
    Away: { background: 'rgba(100,116,139,0.12)', color: '#94a3b8', border: '1px solid rgba(100,116,139,0.3)' },
    Off: { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' },
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/dashboard/smes" className="inline-flex items-center gap-2 text-sm mb-5 transition-colors" style={{ color: '#64748b' }}>
        <ArrowLeft className="w-4 h-4" /> Back to SME Panel
      </Link>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Left */}
        <div className="sm:col-span-1 space-y-4">
          <div className="rounded-xl p-5 text-center" style={{ background: '#111118', border: '1px solid #1e1e2e' }}>
            <div className="relative inline-block mb-3">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto text-3xl font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', boxShadow: '0 0 24px rgba(168,85,247,0.4)' }}>
                {sme.full_name?.[0]?.toUpperCase() || 'S'}
              </div>
              <span className={`absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full border-2 ${statusDotClass[availStatus]}`}
                style={{ borderColor: '#111118' }} />
            </div>
            <h1 className="font-bold text-lg" style={{ color: '#e2e8f0' }}>{sme.full_name}</h1>
            {sme.site && <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>{sme.site}</p>}
            <span className="inline-block mt-2 text-xs px-3 py-1 rounded-full font-medium" style={statusStyle[availStatus] || statusStyle.Off}>
              {availStatus}
            </span>

            <div className="grid grid-cols-3 gap-2 mt-4">
              {[
                { label: 'Resolved', value: resolvedCount || 0 },
                { label: 'Rating', value: avgRating ? avgRating.toFixed(1) : '—', star: !!avgRating },
                { label: 'Queue', value: schedule?.current_queue || 0 },
              ].map((s) => (
                <div key={s.label} className="rounded-lg p-2" style={{ background: '#0d0d14' }}>
                  <p className="text-xs" style={{ color: '#64748b' }}>{s.label}</p>
                  <p className="text-base font-bold flex items-center justify-center gap-0.5" style={{ color: '#e2e8f0' }}>
                    {s.star && <Star className="w-3.5 h-3.5" style={{ color: '#f59e0b', fill: '#f59e0b' }} />}
                    {s.value}
                  </p>
                </div>
              ))}
            </div>

            <Link href={`/dashboard/consult/new?sme_id=${sme.id}`}
              className="btn-primary w-full justify-center mt-4 py-2.5 text-sm">
              <MessageSquare className="w-4 h-4" /> Request Consultation
            </Link>
          </div>

          {/* Schedule */}
          {schedule && (
            <div className="rounded-xl p-4 space-y-2.5" style={{ background: '#111118', border: '1px solid #1e1e2e' }}>
              <h3 className="font-semibold text-sm" style={{ color: '#e2e8f0' }}>Schedule</h3>
              {[
                { icon: <Globe className="w-4 h-4" />, text: schedule.timezone },
                { icon: <Clock className="w-4 h-4" />, text: schedule.shift_start && schedule.shift_end ? `${schedule.shift_start} — ${schedule.shift_end}` : null },
                { icon: <Calendar className="w-4 h-4" />, text: workingDays.length > 0 ? workingDays.join(', ') : null },
                { icon: <Clock className="w-4 h-4" />, text: schedule.avg_response_time > 0 ? `Avg. ${schedule.avg_response_time} min response` : null },
              ].filter((r) => r.text).map((row, i) => (
                <div key={i} className="flex items-center gap-2 text-sm" style={{ color: '#94a3b8' }}>
                  <span style={{ color: '#64748b' }}>{row.icon}</span>{row.text}
                </div>
              ))}
              {languages.length > 0 && (
                <div className="text-sm" style={{ color: '#94a3b8' }}>💬 {languages.join(', ')}</div>
              )}
            </div>
          )}
        </div>

        {/* Right */}
        <div className="sm:col-span-2 space-y-4">
          {/* Specializations */}
          <div className="rounded-xl p-5" style={{ background: '#111118', border: '1px solid #1e1e2e' }}>
            <h2 className="font-semibold mb-3 flex items-center gap-2" style={{ color: '#e2e8f0' }}>
              <Briefcase className="w-4 h-4" style={{ color: '#64748b' }} /> Specializations
            </h2>
            {specializations.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {specializations.map((spec: string) => (
                  <span key={spec} className="text-sm px-3 py-1.5 rounded-full font-medium"
                    style={{ background: 'rgba(168,85,247,0.12)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.25)' }}>
                    {spec}
                  </span>
                ))}
              </div>
            ) : <p className="text-sm" style={{ color: '#64748b' }}>No specializations listed yet</p>}
          </div>

          {/* Assistance modes */}
          <div className="rounded-xl p-5" style={{ background: '#111118', border: '1px solid #1e1e2e' }}>
            <h2 className="font-semibold mb-3" style={{ color: '#e2e8f0' }}>Assistance Modes</h2>
            <div className="space-y-2">
              {[
                { icon: <MessageSquare className="w-4 h-4" />, label: 'Text Assistance', desc: 'Written responses to your questions' },
                { icon: <Phone className="w-4 h-4" />, label: 'Call Assistance', desc: 'Zoom call for complex cases' },
                { icon: <Users className="w-4 h-4" />, label: 'Multicall', desc: 'Panel review with multiple SMEs' },
              ].map((mode) => (
                <div key={mode.label} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: '#0d0d14' }}>
                  <span style={{ color: '#a855f7' }}>{mode.icon}</span>
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#e2e8f0' }}>{mode.label}</p>
                    <p className="text-xs" style={{ color: '#64748b' }}>{mode.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ratings */}
          <div className="rounded-xl p-5" style={{ background: '#111118', border: '1px solid #1e1e2e' }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold flex items-center gap-2" style={{ color: '#e2e8f0' }}>
                <Star className="w-4 h-4" style={{ color: '#f59e0b' }} /> Reviews
              </h2>
              {avgRating && (
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} className="w-4 h-4" style={{ color: s <= Math.round(avgRating) ? '#f59e0b' : '#1e1e2e', fill: s <= Math.round(avgRating) ? '#f59e0b' : '#1e1e2e' }} />
                  ))}
                  <span className="text-sm font-medium ml-1" style={{ color: '#e2e8f0' }}>{avgRating.toFixed(1)}</span>
                </div>
              )}
            </div>
            {!ratings || ratings.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: '#64748b' }}>No reviews yet</p>
            ) : (
              <div className="space-y-3">
                {ratings.map((r) => (
                  <div key={r.id} className="pb-3 border-b last:border-0" style={{ borderColor: '#1e1e2e' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map((s) => (
                          <Star key={s} className="w-3.5 h-3.5" style={{ color: s <= r.rating ? '#f59e0b' : '#1e1e2e', fill: s <= r.rating ? '#f59e0b' : '#1e1e2e' }} />
                        ))}
                      </div>
                      <span className="text-xs" style={{ color: '#64748b' }}>
                        by {(r as any).profiles?.full_name || 'Investigator'} · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {r.feedback && <p className="text-sm" style={{ color: '#94a3b8' }}>{r.feedback}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
