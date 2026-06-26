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
    <div className="rounded-xl p-5 mb-4 space-y-4" style={{ background: '#111118', border: '1px solid #1e1e2e' }}>
      <h3 className="font-semibold" style={{ color: '#e2e8f0' }}>Actions</h3>

      {isAdmin && (
        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: '#94a3b8' }}>Assign SME</label>
          <div className="flex gap-2">
            <select value={selectedSME} onChange={(e) => setSelectedSME(e.target.value)} className="input-dark flex-1 text-sm">
              <option value="">Select an SME...</option>
              {availableSMEs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} — {(s as any).sme_schedules?.[0]?.availability_status || 'Unknown'}
                </option>
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
          <UserCheck className="w-4 h-4" style={{ color: '#4ade80' }} />
          <span style={{ color: '#64748b' }}>Assigned to:</span>
          <span className="font-medium" style={{ color: '#e2e8f0' }}>{(consultation.sme as any).full_name}</span>
        </div>
      )}

      {(isAssignedSME || canRespond) && (
        <div className="space-y-3">
          <label className="text-sm font-medium" style={{ color: '#94a3b8' }}>Resolution</label>
          <RichEditor content={resolution} onChange={setResolution} placeholder="Write your expert resolution and recommendations..." />
          <div className="flex gap-2">
            <button onClick={resolveConsultation} disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }}>
              <CheckCircle className="w-4 h-4" /> Mark as Resolved
            </button>
            <button onClick={flagConsultation} disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', color: '#fb923c' }}>
              <AlertTriangle className="w-4 h-4" /> Flag for Escalation
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
