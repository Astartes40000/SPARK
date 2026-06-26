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

  // Block access to Defect Review cases for non-owners, non-SMEs, non-admins and RADAR advisors
  const isSensitive = consultation.case_type === 'Defect Review'
  if (isSensitive && !isInvestigator && !isSME && !isAdmin) {
    notFound()
  }

  // RADAR Advisors can interact on non-sensitive cases only
  const canInteract = isInvestigator || isSME || isAdmin || (isRadarAdvisor && !isSensitive)

  const statusStyle: Record<string, React.CSSProperties> = {
    Pending: { background: 'rgba(100,116,139,0.15)', color: '#94a3b8', border: '1px solid rgba(100,116,139,0.3)' },
    Assigned: { background: 'rgba(56,189,248,0.12)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)' },
    'In Review': { background: 'rgba(168,85,247,0.12)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.3)' },
    Resolved: { background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' },
    Escalated: { background: 'rgba(249,115,22,0.12)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.3)' },
    Flagged: { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' },
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm mb-4 transition-colors" style={{ color: '#64748b' }}>
        <ArrowLeft className="w-4 h-4" /> Back to dashboard
      </Link>

      {/* Main card */}
      <div className="rounded-xl p-6 mb-4" style={{ background: '#111118', border: '1px solid #1e1e2e' }}>
        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className="badge" style={statusStyle[consultation.status] || statusStyle.Pending}>
            {consultation.status === 'Resolved' && <CheckCircle className="w-3 h-3" />}
            {consultation.status}
          </span>
          <span className="badge" style={{ background: 'rgba(168,85,247,0.1)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.25)' }}>
            <Tag className="w-3 h-3" />{consultation.case_type}
          </span>
          <span className="badge" style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.25)' }}>
            {consultation.assistance_type}
          </span>
          {consultation.previous_investigator_conflict && (
            <span className="badge" style={{ background: 'rgba(249,115,22,0.12)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.3)' }}>
              <AlertTriangle className="w-3 h-3" /> Conflict Flagged
            </span>
          )}
          {consultation.is_radar && (
            <span className="badge" style={{ background: 'rgba(6,182,212,0.15)', color: '#22d3ee', border: '1px solid rgba(6,182,212,0.4)', boxShadow: '0 0 10px rgba(6,182,212,0.2)' }}>
              📡 RADAR
            </span>
          )}
          {consultation.case_type === 'Defect Review' && (
            <span className="badge" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>
              🔒 Sensitive
            </span>
          )}
        </div>

        <h1 className="text-2xl font-bold mb-3" style={{ color: '#e2e8f0' }}>{consultation.title}</h1>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
            {(consultation.profiles as any)?.full_name?.[0]?.toUpperCase() || 'I'}
          </div>
          <span className="text-sm font-medium" style={{ color: '#e2e8f0' }}>{(consultation.profiles as any)?.full_name}</span>
          <span className="text-xs" style={{ color: '#64748b' }}>
            {formatDistanceToNow(new Date(consultation.submitted_at), { addSuffix: true })}
          </span>
        </div>

        <div className="prose prose-sm max-w-none mb-4" style={{ color: '#94a3b8' }}
          dangerouslySetInnerHTML={{ __html: consultation.case_details }} />

        {/* Case refs */}
        {(consultation.case_id_reference || consultation.case_link) && (
          <div className="flex gap-3 flex-wrap mb-4">
            {consultation.case_id_reference && (
              <div className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg"
                style={{ background: '#0d0d14', border: '1px solid #1e1e2e', color: '#94a3b8' }}>
                <Tag className="w-3.5 h-3.5" style={{ color: '#64748b' }} />
                Case ID: <span className="font-mono" style={{ color: '#a855f7' }}>{consultation.case_id_reference}</span>
              </div>
            )}
            {consultation.case_link && (
              <a href={consultation.case_link} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', color: '#38bdf8' }}>
                <LinkIcon className="w-3.5 h-3.5" /> View Case
              </a>
            )}
          </div>
        )}

        {/* SOP Reference */}
        {(consultation.sop_link || consultation.sop_section || consultation.sop_discrepancy_note) && (
          <div className="rounded-lg p-4 mb-4" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <h3 className="text-sm font-semibold mb-2" style={{ color: '#fbbf24' }}>📋 SOP Reference</h3>
            <div className="space-y-1 text-sm" style={{ color: '#94a3b8' }}>
              {consultation.sop_section && <p>Section: <span className="font-medium" style={{ color: '#e2e8f0' }}>{consultation.sop_section}</span></p>}
              {consultation.sop_link && (
                <a href={consultation.sop_link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1" style={{ color: '#38bdf8' }}>
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
            <h3 className="text-sm font-semibold mb-1 flex items-center gap-1.5" style={{ color: '#fb923c' }}>
              <AlertTriangle className="w-4 h-4" /> Previous Investigator Conflict
            </h3>
            <p className="text-sm" style={{ color: '#94a3b8' }}>{consultation.conflict_description}</p>
          </div>
        )}

        {/* Previous actions */}
        {consultation.previous_actions && (
          <div className="rounded-lg p-4 mb-4" style={{ background: '#0d0d14', border: '1px solid #1e1e2e' }}>
            <h3 className="text-sm font-semibold mb-1" style={{ color: '#94a3b8' }}>Previous Actions Taken</h3>
            <p className="text-sm" style={{ color: '#64748b' }}>{consultation.previous_actions}</p>
          </div>
        )}

        {/* Images */}
        {consultation.image_urls && consultation.image_urls.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {consultation.image_urls.map((url: string, i: number) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={url} alt="" className="max-h-48 rounded-lg object-contain"
                style={{ border: '1px solid #1e1e2e' }} />
            ))}
          </div>
        )}
      </div>

      <ConsultationActions consultation={consultation as any} currentProfile={profile} />

      {/* Resolution */}
      {consultation.resolution && (
        <div className="rounded-xl p-5 mb-4" style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <h3 className="font-semibold mb-2 flex items-center gap-2" style={{ color: '#4ade80' }}>
            <CheckCircle className="w-5 h-5" /> Resolution
          </h3>
          <div className="prose prose-sm max-w-none" style={{ color: '#94a3b8' }}
            dangerouslySetInnerHTML={{ __html: consultation.resolution }} />
        </div>
      )}

      {canInteract && (
        <MessageThread consultationId={id} messages={messages || []} currentProfile={profile} />
      )}
    </div>
  )
}
