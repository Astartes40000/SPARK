'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile, Consultation } from '@/lib/types'
import { UserCheck, CheckCircle, AlertTriangle } from 'lucide-react'
import RichEditor from '@/components/RichEditor'

interface Props {
  consultation: Consultation & { profiles: Profile; sme: Profile | null }
  currentProfile: Profile | null
}

export default function ConsultationActions({ consultation, currentProfile }: Props) {
  const [availableSMEs, setAvailableSMEs] = useState<Profile[]>([])
  const [selectedSME, setSelectedSME] = useState(consultation.sme_id || '')
  const [resolution, setResolution] = useState(consultation.resolution || '')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const isAdmin = currentProfile?.role === 'admin'
  const isSME = currentProfile?.role === 'sme'
  const isRadarAdvisor = currentProfile?.role === 'radar_advisor'
  const isAssignedSME = currentProfile?.id === consultation.sme_id
  const isResolved = consultation.status === 'Resolved'
  const canRespond = isAssignedSME || (isRadarAdvisor && (consultation as any).is_radar)

  useEffect(() => {
    if (isAdmin) {
      supabase.from('profiles').select('*, sme_schedules(availability_status)').eq('role', 'sme')
        .then(({ data }) => setAvailableSMEs(data || []))
    }
  }, [isAdmin, supabase])

  const assignSME = async () => {
    if (!selectedSME) return
    setLoading(true)
    await supabase.from('consultations').update({ sme_id: selectedSME, status: 'Assigned', acknowledged_at: new Date().toISOString() }).eq('id', consultation.id)
    await supabase.from('notifications').insert({ user_id: consultation.investigator_id, type: 'sme_answer', post_id: null, from_user_id: selectedSME })
    setLoading(false)
    router.refresh()
  }

  const claimConsultation = async () => {
    setLoading(true)
    await supabase.from('consultations').update({ sme_id: currentProfile!.id, status: 'In Review', acknowledged_at: new Date().toISOString() }).eq('id', consultation.id)
    setLoading(false)
    router.refresh()
  }

  const resolveConsultation = async () => {
    if (!resolution || resolution === '<p></p>') return
    setLoading(true)
    await supabase.from('consultations').update({ status: 'Resolved', resolution, resolved_at: new Date().toISOString() }).eq('id', consultation.id)
    await supabase.from('notifications').insert({ user_id: consultation.investigator_id, type: 'sme_answer', from_user_id: currentProfile!.id })
    await supabase.from('sla_tracking').update({ resolved_at: new Date().toISOString() }).eq('consultation_id', consultation.id)

    // Get investigator email and send notification
    const { data: investigator } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', consultation.investigator_id)
      .single()

    // The notification is already inserted above, polling will pick it up
    setLoading(false)
    router.refresh()
  }

  const flagConsultation = async () => {
    setLoading(true)
    await supabase.from('consultations').update({ status: 'Flagged' }).eq('id', consultation.id)
    setLoading(false)
    router.refresh()
  }

  if (isResolved) return null

  return (
    <div className="rounded-xl p-5 mb-4 space-y-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Actions</h3>

      {isAdmin && (
        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: 'var(--text-dim)' }}>Assign SME</label>
          <div className="flex gap-2">
            <select value={selectedSME} onChange={(e) => setSelectedSME(e.target.value)} className="input-dark flex-1 text-sm">
              <option value="">Select an SME...</option>
              {availableSMEs.map((s) => (
                <option key={s.id} value={s.id}>{s.full_name} — {(s as any).sme_schedules?.[0]?.availability_status || 'Unknown'}</option>
              ))}
            </select>
            <button onClick={assignSME} disabled={!selectedSME || loading} className="btn-primary text-sm">
              <UserCheck className="w-4 h-4" /> Assign
            </button>
          </div>
        </div>
      )}

      {isSME && !consultation.sme_id && (
        <button onClick={claimConsultation} disabled={loading} className="btn-primary text-sm">
          <UserCheck className="w-4 h-4" /> Claim this Consultation
        </button>
      )}

      {consultation.sme && (
        <div className="flex items-center gap-2 text-sm">
          <UserCheck className="w-4 h-4" style={{ color: '#16A34A' }} />
          <span style={{ color: 'var(--text-muted)' }}>Assigned to:</span>
          <span className="font-medium" style={{ color: 'var(--text)' }}>{(consultation.sme as any).full_name}</span>
        </div>
      )}

      {(isAssignedSME || canRespond) && (
        <div className="space-y-3">
          <label className="text-sm font-medium" style={{ color: 'var(--text-dim)' }}>Resolution</label>
          <RichEditor content={resolution} onChange={setResolution} placeholder="Write your expert resolution and recommendations..." />
          <div className="flex gap-2">
            <button onClick={resolveConsultation} disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.3)', color: '#16A34A' }}>
              <CheckCircle className="w-4 h-4" /> Mark as Resolved
            </button>
            <button onClick={flagConsultation} disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.25)', color: '#D97706' }}>
              <AlertTriangle className="w-4 h-4" /> Flag for Escalation
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
