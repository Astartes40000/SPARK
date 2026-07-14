'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CaseType, AssistanceType } from '@/lib/types'
import RichEditor from '@/components/RichEditor'
import { ArrowLeft, Upload, X, AlertTriangle, Phone, MessageSquare, Users, Link as LinkIcon, CheckCircle, Info } from 'lucide-react'
import Link from 'next/link'

const DRAFT_KEY = 'safet_consultation_draft'

const CASE_TYPE_INFO: Record<CaseType, { desc: string; example: string }> = {
  'New Case': {
    desc: 'First time submitting this case for review.',
    example: 'e.g. A new listing with unclear policy compliance',
  },
  'Seller Appeal': {
    desc: 'Appealing a decision made on a seller account.',
    example: 'e.g. Account suspension appeal, listing removal',
  },
  'Amznpend': {
    desc: 'Case currently pending Amazon internal review.',
    example: 'e.g. Escalated case awaiting Amazon response',
  },
  'SOP Discrepancy': {
    desc: 'Conflict or ambiguity found in existing SOP.',
    example: 'e.g. Two SOP sections give contradictory guidance',
  },
  'Defect Review': {
    desc: 'Reviewing a detected defect or policy violation.',
    example: 'e.g. Product authenticity, safety violation',
  },
}

const ASSISTANCE_INFO: Record<AssistanceType, { icon: React.ReactNode; desc: string; when: string }> = {
  'Text Assistance': {
    icon: <MessageSquare className="w-5 h-5" />,
    desc: 'SME or RADAR Advisor responds in writing to your question.',
    when: 'Best for straightforward or well-documented questions',
  },
  'Call Assistance': {
    icon: <Phone className="w-5 h-5" />,
    desc: 'Schedule a Zoom call with an SME or RADAR Advisor.',
    when: 'Best for complex cases requiring real-time discussion',
  },
  'Multicall': {
    icon: <Users className="w-5 h-5" />,
    desc: 'Panel of 2–4 SMEs reviews together.',
    when: 'Best for ambiguous cases needing multiple expert perspectives',
  },
}

const inactiveBtn: React.CSSProperties = { background: 'var(--bg-elevated)', border: '2px solid var(--border)', color: 'var(--text-muted)' }
const activeBtn: React.CSSProperties = { background: 'rgba(255,153,0,0.12)', border: '2px solid rgba(255,153,0,0.5)', color: '#E68A00' }
const cardStyle: React.CSSProperties = { background: 'var(--bg-surface)', border: '1px solid var(--border)' }
const labelStyle: React.CSSProperties = { color: 'var(--text-dim)' }

export default function NewConsultationPage() {
  const [step, setStep] = useState(1)
  const [caseType, setCaseType] = useState<CaseType>('New Case')
  const [assistanceType, setAssistanceType] = useState<AssistanceType>('Text Assistance')
  const [caseDetails, setCaseDetails] = useState('')
  const [caseIdReference, setCaseIdReference] = useState('')
  const [caseLink, setCaseLink] = useState('')
  const [sopLink, setSopLink] = useState('')
  const [sopSection, setSopSection] = useState('')
  const [sopDiscrepancyNote, setSopDiscrepancyNote] = useState('')
  const [hasPrevConflict, setHasPrevConflict] = useState(false)
  const [conflictDescription, setConflictDescription] = useState('')
  const [previousActions, setPreviousActions] = useState('')
  const [isRadar, setIsRadar] = useState(false)
  const [marketplace, setMarketplace] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [hoveredCaseType, setHoveredCaseType] = useState<CaseType | null>(null)
  const [draftSaved, setDraftSaved] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Load draft from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY)
    if (saved) {
      try {
        const draft = JSON.parse(saved)
        setCaseType(draft.caseType || 'New Case')
        setAssistanceType(draft.assistanceType || 'Text Assistance')
        setCaseDetails(draft.caseDetails || '')
        setCaseIdReference(draft.caseIdReference || '')
        setCaseLink(draft.caseLink || '')
        setSopLink(draft.sopLink || '')
        setSopSection(draft.sopSection || '')
        setSopDiscrepancyNote(draft.sopDiscrepancyNote || '')
        setHasPrevConflict(draft.hasPrevConflict || false)
        setConflictDescription(draft.conflictDescription || '')
        setPreviousActions(draft.previousActions || '')
        setIsRadar(draft.isRadar || false)
      } catch {}
    }
  }, [])

  // Auto-save draft to localStorage
  useEffect(() => {
    const draft = { caseType, assistanceType, caseDetails, caseIdReference, caseLink, sopLink, sopSection, sopDiscrepancyNote, hasPrevConflict, conflictDescription, previousActions, isRadar }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    if (caseDetails) {
      setDraftSaved(true)
      const t = setTimeout(() => setDraftSaved(false), 2000)
      return () => clearTimeout(t)
    }
  }, [caseType, assistanceType, caseDetails, caseIdReference, caseLink, sopLink, sopSection, sopDiscrepancyNote, hasPrevConflict, conflictDescription, previousActions, isRadar])

  const clearDraft = () => localStorage.removeItem(DRAFT_KEY)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const newImages = [...images, ...files].slice(0, 5)
    setImages(newImages)
    setImagePreviewUrls(newImages.map((f) => URL.createObjectURL(f)))
  }

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    setImages(newImages)
    setImagePreviewUrls(newImages.map((f) => URL.createObjectURL(f)))
  }

  const handleSubmit = async () => {
    setShowConfirm(false)
    setLoading(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profileData } = await supabase.from('profiles').select('role, email, full_name').eq('id', user.id).single()
    if (profileData?.role === 'sme' || profileData?.role === 'radar_advisor') {
      router.push('/dashboard')
      return
    }

    const imageUrls: string[] = []
    for (const image of images) {
      const fileName = `${user.id}/${Date.now()}-${image.name}`
      const { data, error: uploadError } = await supabase.storage.from('post-images').upload(fileName, image)
      if (!uploadError && data) {
        const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(data.path)
        imageUrls.push(urlData.publicUrl)
      }
    }

    const autoTitle = caseIdReference.trim()
      ? `${caseType} — ${caseIdReference.trim()}`
      : `${caseType} — ${new Date().toISOString().split('T')[0]}`

    // Auto-assign to available SME or Radar Advisor based on marketplace
    let assignedSmeId: string | null = null
    let assignedSme: any = null

    if (isRadar) {
      const { data: radarAdvisors } = await supabase
        .from('profiles')
        .select('id, full_name, email, sme_schedules(availability_status, current_queue, marketplaces)')
        .eq('role', 'radar_advisor')
      // Filter by marketplace match
      const available = radarAdvisors?.filter((r: any) =>
        r.sme_schedules?.[0]?.availability_status === 'Available' &&
        (r.sme_schedules?.[0]?.marketplaces || []).includes(marketplace)
      ) || []
      if (available.length > 0) {
        available.sort((a: any, b: any) =>
          (a.sme_schedules?.[0]?.current_queue || 0) - (b.sme_schedules?.[0]?.current_queue || 0)
        )
        assignedSme = available[0]
        assignedSmeId = available[0].id
      } else {
        // Fallback: any available radar advisor
        const fallback = radarAdvisors?.filter((r: any) =>
          r.sme_schedules?.[0]?.availability_status === 'Available'
        ) || []
        if (fallback.length > 0) {
          fallback.sort((a: any, b: any) =>
            (a.sme_schedules?.[0]?.current_queue || 0) - (b.sme_schedules?.[0]?.current_queue || 0)
          )
          assignedSme = fallback[0]
          assignedSmeId = fallback[0].id
        }
      }
    } else {
      const { data: smes } = await supabase
        .from('profiles')
        .select('id, full_name, email, sme_schedules(availability_status, current_queue, marketplaces)')
        .eq('role', 'sme')
      // Filter by marketplace match
      const available = smes?.filter((s: any) =>
        s.sme_schedules?.[0]?.availability_status === 'Available' &&
        (s.sme_schedules?.[0]?.marketplaces || []).includes(marketplace)
      ) || []
      if (available.length > 0) {
        available.sort((a: any, b: any) =>
          (a.sme_schedules?.[0]?.current_queue || 0) - (b.sme_schedules?.[0]?.current_queue || 0)
        )
        assignedSme = available[0]
        assignedSmeId = available[0].id
      } else {
        // Fallback: any available SME
        const fallback = smes?.filter((s: any) =>
          s.sme_schedules?.[0]?.availability_status === 'Available'
        ) || []
        if (fallback.length > 0) {
          fallback.sort((a: any, b: any) =>
            (a.sme_schedules?.[0]?.current_queue || 0) - (b.sme_schedules?.[0]?.current_queue || 0)
          )
          assignedSme = fallback[0]
          assignedSmeId = fallback[0].id
        }
      }
    }

    const { data: consultation, error: consultError } = await supabase.from('consultations').insert({
      investigator_id: user.id,
      sme_id: assignedSmeId,
      case_type: caseType,
      assistance_type: assistanceType,
      urgency_level: 'Medium',
      title: autoTitle,
      case_details: caseDetails,
      case_id_reference: caseIdReference || null,
      case_link: caseLink || null,
      sop_link: sopLink || null,
      sop_section: sopSection || null,
      sop_discrepancy_note: sopDiscrepancyNote || null,
      previous_investigator_conflict: hasPrevConflict,
      conflict_description: conflictDescription || null,
      previous_actions: previousActions || null,
      image_urls: imageUrls,
      is_radar: isRadar,
      marketplace: marketplace || null,
      status: assignedSmeId ? 'Assigned' : 'Pending',
      acknowledged_at: assignedSmeId ? new Date().toISOString() : null,
    }).select().single()

    if (consultError) { setError(consultError.message); setLoading(false); return }

    // Insert notifications if auto-assigned
    if (assignedSme && consultation) {
      // Notify the SME/Radar Advisor that a consultation was assigned to them
      await supabase.from('notifications').insert({
        user_id: assignedSmeId,
        type: 'sme_answer',
        from_user_id: user.id,
        read: false,
        consultation_id: consultation.id,
      })

      // Notify the investigator that their consultation was assigned
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'sme_answer',
        from_user_id: assignedSmeId,
        read: false,
        consultation_id: consultation.id,
      })

      // Update SME queue count and set to Busy
      await supabase.from('sme_schedules')
        .update({ 
          current_queue: (assignedSme.sme_schedules?.[0]?.current_queue || 0) + 1,
          availability_status: 'Busy',
          updated_at: new Date().toISOString(),
        })
        .eq('sme_id', assignedSmeId!)
    }

    clearDraft()
    router.push(`/dashboard/consult/${consultation.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 rounded-lg" style={{ color: 'var(--text-muted)' }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>New Consultation</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Step {step} of 3</p>
          </div>
        </div>
        {/* Draft indicator */}
        {draftSaved && (
          <span className="text-xs flex items-center gap-1" style={{ color: '#16A34A' }}>
            <CheckCircle className="w-3 h-3" /> Draft saved
          </span>
        )}
        {!draftSaved && (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Auto-saving draft...</span>
        )}
      </div>

      {/* Progress bar */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className="h-1 flex-1 rounded-full transition-all"
            style={{ background: s <= step ? 'linear-gradient(90deg, #E68A00, #FF9900)' : 'var(--border)' }} />
        ))}
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg text-sm mb-4"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#DC2626' }}>
          {error}
        </div>
      )}

      <div className="rounded-xl p-6 space-y-5" style={cardStyle}>

        {/* STEP 1 — Case Info */}
        {step === 1 && (
          <>
            <h2 className="font-semibold text-lg" style={{ color: 'var(--text)' }}>Case Information</h2>

            {/* Case Type with tooltips */}
            <div>
              <label className="block text-sm font-medium mb-2" style={labelStyle}>Case Type *</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(Object.keys(CASE_TYPE_INFO) as CaseType[]).map((type) => (
                  <div key={type} className="relative">
                    <button type="button"
                      onClick={() => {
                        setCaseType(type)
                        if (type === 'New Case') {
                          setPreviousActions('')
                          setHasPrevConflict(false)
                          setConflictDescription('')
                        }
                      }}
                      onMouseEnter={() => setHoveredCaseType(type)}
                      onMouseLeave={() => setHoveredCaseType(null)}
                      className="w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left flex items-center justify-between gap-1"
                      style={caseType === type ? activeBtn : inactiveBtn}>
                      <span>{type}</span>
                      <Info className="w-3 h-3 shrink-0 opacity-50" />
                    </button>
                    {/* Tooltip */}
                    {hoveredCaseType === type && (
                      <div className="absolute z-50 left-0 top-full mt-1.5 w-56 rounded-lg p-3 text-xs pointer-events-none"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(255,153,0,0.25)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
                        <p className="font-medium mb-1" style={{ color: '#E68A00' }}>{type}</p>
                        <p style={{ color: 'var(--text-dim)' }}>{CASE_TYPE_INFO[type].desc}</p>
                        <p className="mt-1 italic" style={{ color: 'var(--text-muted)' }}>{CASE_TYPE_INFO[type].example}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {/* Active case type description */}
              {caseType && (
                <div className="mt-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(255,153,0,0.06)', border: '1px solid rgba(255,153,0,0.12)' }}>
                  <span style={{ color: '#E68A00' }}>{caseType}: </span>
                  <span style={{ color: 'var(--text-dim)' }}>{CASE_TYPE_INFO[caseType].desc}</span>
                </div>
              )}
            </div>

            {/* Marketplace selector */}
            <div>
              <label className="block text-sm font-medium mb-2" style={labelStyle}>Marketplace *</label>
              <select value={marketplace} onChange={(e) => setMarketplace(e.target.value)} required
                className="input-dark">
                <option value="">Select marketplace...</option>
                {['NA', 'UK', 'MX', 'IN', 'BR', 'DE', 'ES', 'JP', 'IT', 'FR'].map((mp) => (
                  <option key={mp} value={mp}>{mp}</option>
                ))}
              </select>
            </div>

            {/* RADAR flag — right after Case Type */}
            <div className="rounded-lg p-4" style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.2)' }}>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={isRadar} onChange={(e) => {
                  setIsRadar(e.target.checked)
                  if (e.target.checked && assistanceType === 'Multicall') {
                    setAssistanceType('Text Assistance')
                  }
                }} className="w-4 h-4 rounded" />
                <div>
                  <p className="text-sm font-medium flex items-center gap-1.5" style={{ color: '#0E7490' }}>
                    📡 Flag as RADAR Consultation
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    RADAR Advisors will be notified and can respond to this case
                  </p>
                </div>
              </label>
            </div>

            {/* Assistance Type */}
            <div>
              <label className="block text-sm font-medium mb-2" style={labelStyle}>Assistance Type *</label>
              {isRadar && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-2 text-xs"
                  style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)', color: '#0E7490' }}>
                  📡 RADAR cases support Text and Call Assistance only
                </div>
              )}
              <div className="space-y-2">
                {(Object.keys(ASSISTANCE_INFO) as AssistanceType[])
                  .filter((type) => !isRadar || type !== 'Multicall')
                  .map((type) => (
                  <button key={type} type="button" onClick={() => setAssistanceType(type)}
                    className="w-full flex items-start gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left"
                    style={assistanceType === type ? activeBtn : inactiveBtn}>
                    <span className="mt-0.5 shrink-0" style={{ color: assistanceType === type ? '#FF9900' : 'var(--text-muted)' }}>
                      {ASSISTANCE_INFO[type].icon}
                    </span>
                    <div>
                      <p className="font-medium">{type}</p>
                      <p className="text-xs mt-0.5" style={{ color: assistanceType === type ? '#FF9900' : 'var(--text-muted)', opacity: 0.8 }}>
                        {ASSISTANCE_INFO[type].desc}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        💡 {ASSISTANCE_INFO[type].when}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </>
        )}

        {/* STEP 2 — Case Details */}
        {step === 2 && (
          <>
            <h2 className="font-semibold text-lg" style={{ color: 'var(--text)' }}>Case Details</h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Case ID / Reference</label>
                <input type="text" value={caseIdReference} onChange={(e) => setCaseIdReference(e.target.value)}
                  className="input-dark" placeholder="e.g. CASE-12345" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Case Link</label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                  <input type="url" value={caseLink} onChange={(e) => setCaseLink(e.target.value)}
                    className="input-dark" style={{ paddingLeft: '2rem' }} placeholder="https://..." />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Case Details *</label>
              <RichEditor content={caseDetails} onChange={setCaseDetails}
                placeholder="Describe the case in detail. Include what you've tried, what's confusing, and what guidance you need..." />
            </div>

            {/* Previous actions and conflict — only for non-new cases */}
            {caseType !== 'New Case' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Previous Investigator Actions</label>
                  <textarea value={previousActions} onChange={(e) => setPreviousActions(e.target.value)} rows={3}
                    className="input-dark resize-none" placeholder="What actions were taken by previous investigators on this case?" />
                </div>

                <div className="rounded-lg p-4" style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)' }}>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={hasPrevConflict} onChange={(e) => setHasPrevConflict(e.target.checked)} className="w-4 h-4 rounded" />
                    <div>
                      <p className="text-sm font-medium flex items-center gap-1.5" style={{ color: '#fb923c' }}>
                        <AlertTriangle className="w-4 h-4" /> Flag Previous Investigator Conflict
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                        Check if a prior investigator took an action that contradicts SOP
                      </p>
                    </div>
                  </label>
                  {hasPrevConflict && (
                    <textarea value={conflictDescription} onChange={(e) => setConflictDescription(e.target.value)} rows={2}
                      className="input-dark resize-none mt-3" placeholder="Describe the conflict with the previous investigator's action..." />
                  )}
                </div>
              </>
            )}

            {/* Images */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
                Screenshots <span style={{ color: 'var(--text-muted)' }} className="font-normal">(up to 5)</span>
              </label>
              {imagePreviewUrls.length > 0 && (
                <div className="flex gap-2 mb-3 flex-wrap">
                  {imagePreviewUrls.map((url, i) => (
                    <div key={i} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg" style={{ border: '1px solid var(--border)' }} />
                      <button type="button" onClick={() => removeImage(i)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white"
                        style={{ background: '#ef4444' }}>
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {images.length < 5 && (
                <label className="flex items-center gap-2 px-4 py-2.5 rounded-lg cursor-pointer transition-all w-fit"
                  style={{ border: '2px dashed var(--border)', color: 'var(--text-muted)' }}
                  onMouseEnter={(e: any) => { e.currentTarget.style.borderColor = 'rgba(255,153,0,0.4)'; e.currentTarget.style.color = '#FF9900' }}
                  onMouseLeave={(e: any) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}>
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">Upload screenshots</span>
                  <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                </label>
              )}
            </div>
          </>
        )}

        {/* STEP 3 — SOP Reference */}
        {step === 3 && (
          <>
            <h2 className="font-semibold text-lg" style={{ color: 'var(--text)' }}>
              SOP Reference <span className="text-base font-normal" style={{ color: 'var(--text-muted)' }}>(optional)</span>
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Pin the exact SOP section you find unclear so the SME can address it directly.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={labelStyle}>SOP Link</label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                  <input type="url" value={sopLink} onChange={(e) => setSopLink(e.target.value)}
                    className="input-dark" style={{ paddingLeft: '2rem' }} placeholder="https://..." />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Section Number</label>
                <input type="text" value={sopSection} onChange={(e) => setSopSection(e.target.value)}
                  className="input-dark" placeholder="e.g. 3.2.1" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Discrepancy Note</label>
              <textarea value={sopDiscrepancyNote} onChange={(e) => setSopDiscrepancyNote(e.target.value)} rows={4}
                className="input-dark resize-none" placeholder="Explain what is unclear or conflicting in this SOP section..." />
            </div>

            {/* Summary */}
            <div className="rounded-lg p-4 space-y-2.5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-dim)' }}>📋 Consultation Summary</h3>
              {[
                { label: 'Case Type', value: caseType },
                { label: 'Assistance', value: assistanceType },
                caseIdReference ? { label: 'Case ID', value: caseIdReference } : null,
                hasPrevConflict ? { label: 'Conflict Flag', value: '⚠️ Yes' } : null,
                isRadar ? { label: 'RADAR Flag', value: '📡 Yes' } : null,
                sopSection ? { label: 'SOP Section', value: sopSection } : null,
              ].filter(Boolean).map((row: any) => (
                <div key={row.label} className="flex justify-between text-sm" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{row.label}</span>
                  <span className="font-medium" style={{ color: 'var(--text)' }}>{row.value}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          {step > 1 && (
            <button type="button" onClick={() => setStep(step - 1)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>
              Back
            </button>
          )}
          {step < 3 ? (
            <button type="button"
              onClick={() => {
                if (step === 2 && (!caseDetails || caseDetails === '<p></p>')) { setError('Please describe the case'); return }
                setError('')
                setStep(step + 1)
              }}
              className="btn-primary flex-1 justify-center">
              Continue →
            </button>
          ) : (
            <button type="button" onClick={() => setShowConfirm(true)} disabled={loading}
              className="btn-primary flex-1 justify-center">
              {loading ? 'Submitting...' : 'Review & Submit'}
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4"
            style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,153,0,0.25)', boxShadow: '0 4px 12px rgba(255,153,0,0.1)' }}>
            <h3 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Confirm Submission</h3>
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
              Please review your consultation before submitting. Once sent, it will be assigned to an SME.
            </p>

            {/* Summary */}
            <div className="rounded-lg p-4 space-y-2 text-sm" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              {[
                { label: 'Auto Title', value: caseIdReference.trim() ? `${caseType} — ${caseIdReference}` : `${caseType} — ${new Date().toISOString().split('T')[0]}` },
                { label: 'Case Type', value: caseType },
                { label: 'Assistance', value: assistanceType },
                caseIdReference ? { label: 'Case ID', value: caseIdReference } : null,
                hasPrevConflict ? { label: 'Conflict Flag', value: '⚠️ Yes' } : null,
                isRadar ? { label: 'RADAR Flag', value: '📡 Yes' } : null,
              ].filter(Boolean).map((row: any) => (
                <div key={row.label} className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>{row.label}</span>
                  <span className="font-medium" style={{ color: 'var(--text)' }}>{row.value}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>
                Go Back & Edit
              </button>
              <button onClick={handleSubmit} disabled={loading}
                className="btn-primary flex-1 justify-center">
                {loading ? 'Submitting...' : '✓ Confirm & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
