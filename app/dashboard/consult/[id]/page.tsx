import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { ArrowLeft, AlertTriangle, CheckCircle, Link as LinkIcon, Tag } from 'lucide-react'
import Link from 'next/link'
import ConsultationActions from './ConsultationActions'
import MessageThread from './MessageThread'

export default async function ConsultationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()

  const { data: consultation } = await supabase
    .from('consultations')
    .select(`*, profiles!consultations_investigator_id_fkey(full_name, role, email), sme:profiles!consultations_sme_id_fkey(full_name, role, email, sme_schedules(*))`)
    .eq('id', id).single()

  if (!consultation) notFound()

  const { data: messages } = await supabase
    .from('consultation_messages')
    .select('*, profiles(full_name, role)')
    .eq('consultation_id', id)
    .order('created_at', { ascending: true })

  const isInvestigator = profile?.id === consultation.investigator_id
  const isSME = profile?.id === consultation.sme_id || profile?.role === 'sme'
  const isRadarAdvisor = profile?.role === 'radar_advisor'
  const isAdmin = profile?.role === 'admin'

  const isSensitive = consultation.case_type === 'Defect Review'
  if (isSensitive && !isInvestigator && !isSME && !isAdmin) {
    notFound()
  }

  const canInteract = isInvestigator || isSME || isAdmin || (isRadarAdvisor && !isSensitive)

  const statusStyle: Record<string, React.CSSProperties> = {
    Pending: { background: 'rgba(100,116,139,0.12)', color: '#475569', border: '1px solid rgba(100,116,139,0.3)' },
    Assigned: { background: 'rgba(56,189,248,0.1)', color: '#0284c7', border: '1px solid rgba(56,189,248,0.3)' },
    'In Review': { background: 'rgba(26,115,200,0.1)', color: '#1A73C8', border: '1px solid rgba(26,115,200,0.3)' },
    Resolved: { background: 'rgba(34,197,94,0.1)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.3)' },
    Escalated: { background: 'rgba(249,115,22,0.1)', color: '#ea580c', border: '1px solid rgba(249,115,22,0.3)' },
    Flagged: { background: 'rgba(239,68,68,0.1)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.3)' },
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm mb-4 transition-colors" style={{ color: '#94A3B8' }}>
        <ArrowLeft className="w-4 h-4" /> Back to dashboard
      </Link>

      {/* Main card */}
      <div className="rounded-xl p-6 mb-4" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className="badge" style={statusStyle[consultation.status] || statusStyle.Pending}>
            {consultation.status === 'Resolved' && <CheckCircle className="w-3 h-3" />}
            {consultation.status}
          </span>
          <span className="badge" style={{ background: 'rgba(255,153,0,0.1)', color: '#E68A00', border: '1px solid rgba(255,153,0,0.25)' }}>
            <Tag className="w-3 h-3" />{consultation.case_type}
          </span>
          <span className="badge" style={{ background: 'rgba(56,189,248,0.1)', color: '#0284c7', border: '1px solid rgba(56,189,248,0.25)' }}>
            {consultation.assistance_type}
          </span>
          {consultation.previous_investigator_conflict && (
            <span className="badge" style={{ background: 'rgba(249,115,22,0.1)', color: '#ea580c', border: '1px solid rgba(249,115,22,0.3)' }}>
              <AlertTriangle className="w-3 h-3" /> Conflict Flagged
            </span>
          )}
          {consultation.is_radar && (
            <span className="badge" style={{ background: 'rgba(6,182,212,0.12)', color: '#0e7490', border: '1px solid rgba(6,182,212,0.35)' }}>
              📡 RADAR
            </span>
          )}
          {consultation.case_type === 'Defect Review' && (
            <span className="badge" style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.25)' }}>
              🔒 Sensitive
            </span>
          )}
        </div>

        <h1 className="text-2xl font-bold mb-3" style={{ color: '#0F172A' }}>{consultation.title}</h1>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #FF9900, #FF6B00)' }}>
            {(consultation.profiles as any)?.full_name?.[0]?.toUpperCase() || 'I'}
          </div>
          <span className="text-sm font-medium" style={{ color: '#0F172A' }}>{(consultation.profiles as any)?.full_name}</span>
          <span className="text-xs" style={{ color: '#94A3B8' }}>
            {formatDistanceToNow(new Date(consultation.submitted_at), { addSuffix: true })}
          </span>
        </div>

        <div className="prose prose-sm max-w-none mb-4" style={{ color: '#475569' }}
          dangerouslySetInnerHTML={{ __html: consultation.case_details }} />

        {/* Case refs */}
        {(consultation.case_id_reference || consultation.case_link) && (
          <div className="flex gap-3 flex-wrap mb-4">
            {consultation.case_id_reference && (
              <div className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg"
                style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#475569' }}>
                <Tag className="w-3.5 h-3.5" style={{ color: '#94A3B8' }} />
                Case ID: <span className="font-mono" style={{ color: '#FF9900' }}>{consultation.case_id_reference}</span>
              </div>
            )}
            {consultation.case_link && (
              <a href={consultation.case_link} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', color: '#0284c7' }}>
                <LinkIcon className="w-3.5 h-3.5" /> View Case
              </a>
            )}
          </div>
        )}

        {/* SOP Reference */}
        {(consultation.sop_link || consultation.sop_section || consultation.sop_discrepancy_note) && (
          <div className="rounded-lg p-4 mb-4" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <h3 className="text-sm font-semibold mb-2" style={{ color: '#d97706' }}>📋 SOP Reference</h3>
            <div className="space-y-1 text-sm" style={{ color: '#475569' }}>
              {consultation.sop_section && <p>Section: <span className="font-medium" style={{ color: '#0F172A' }}>{consultation.sop_section}</span></p>}
              {consultation.sop_link && (
                <a href={consultation.sop_link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1" style={{ color: '#1A73C8' }}>
                  <LinkIcon className="w-3 h-3" /> View SOP
                </a>
              )}
              {consultation.sop_discrepancy_note && <p>{consultation.sop_discrepancy_note}</p>}
            </div>
          </div>
        )}

        {/* Conflict */}
        {consultation.previous_investigator_conflict && consultation.conflict_description && (
          <div className="rounded-lg p-4 mb-4" style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)' }}>
            <h3 className="text-sm font-semibold mb-1 flex items-center gap-1.5" style={{ color: '#ea580c' }}>
              <AlertTriangle className="w-4 h-4" /> Previous Investigator Conflict
            </h3>
            <p className="text-sm" style={{ color: '#475569' }}>{consultation.conflict_description}</p>
          </div>
        )}

        {/* Previous actions */}
        {consultation.previous_actions && (
          <div className="rounded-lg p-4 mb-4" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <h3 className="text-sm font-semibold mb-1" style={{ color: '#475569' }}>Previous Actions Taken</h3>
            <p className="text-sm" style={{ color: '#94A3B8' }}>{consultation.previous_actions}</p>
          </div>
        )}

        {/* Images */}
        {consultation.image_urls && consultation.image_urls.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {consultation.image_urls.map((url: string, i: number) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={url} alt="" className="max-h-48 rounded-lg object-contain"
                style={{ border: '1px solid #E2E8F0' }} />
            ))}
          </div>
        )}
      </div>

      <ConsultationActions consultation={consultation as any} currentProfile={profile} />

      {/* Resolution */}
      {consultation.resolution && (
        <div className="rounded-xl p-5 mb-4" style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <h3 className="font-semibold mb-2 flex items-center gap-2" style={{ color: '#16a34a' }}>
            <CheckCircle className="w-5 h-5" /> Resolution
          </h3>
          <div className="prose prose-sm max-w-none" style={{ color: '#475569' }}
            dangerouslySetInnerHTML={{ __html: consultation.resolution }} />
        </div>
      )}

      {canInteract && (
        <MessageThread consultationId={id} messages={messages || []} currentProfile={profile} />
      )}
    </div>
  )
}
