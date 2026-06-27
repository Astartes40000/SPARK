'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile, ConsultationMessage } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'
import RichEditor from '@/components/RichEditor'
import { MessageSquare } from 'lucide-react'

interface Props {
  consultationId: string
  messages: (ConsultationMessage & { profiles: Profile })[]
  currentProfile: Profile | null
}

export default function MessageThread({ consultationId, messages: initial, currentProfile }: Props) {
  const [messages, setMessages] = useState(initial)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()
  const isSME = currentProfile?.role === 'sme'
  const isRadarAdvisor = currentProfile?.role === 'radar_advisor'
  const isResponder = isSME || isRadarAdvisor
  const responderLabel = isRadarAdvisor ? '📡 RADAR Advisor Response' : '🎓 SME Response'
  const responderPrompt = isRadarAdvisor ? '📡 Post your RADAR guidance' : '🎓 SME Response'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content || content === '<p></p>') { setError('Message cannot be empty'); return }
    setLoading(true); setError('')
    const { data: msg, error: msgError } = await supabase.from('consultation_messages')
      .insert({ consultation_id: consultationId, author_id: currentProfile!.id, content, is_sme_response: isResponder })
      .select('*, profiles(full_name, role)').single()
    if (msgError) { setError(msgError.message) }
    else {
      setMessages([...messages, msg as ConsultationMessage & { profiles: Profile }])
      setContent('')
      router.refresh()

      // Send push notification to investigator if SME/radar responded
      if (isResponder) {
        const { data: consultation } = await supabase
          .from('consultations')
          .select('investigator_id, title')
          .eq('id', consultationId)
          .single()

        if (consultation) {
          await fetch('/api/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: consultation.investigator_id,
              title: 'New response on your consultation',
              body: consultation.title,
              url: `/dashboard/consult/${consultationId}`,
            }),
          })
        }
      }
    }
    setLoading(false)
  }

  const roleBadgeStyle: Record<string, React.CSSProperties> = {
    admin: { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' },
    sme: { background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' },
    investigator: { background: 'rgba(168,85,247,0.12)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.25)' },
    radar_advisor: { background: 'rgba(6,182,212,0.12)', color: '#22d3ee', border: '1px solid rgba(6,182,212,0.25)' },
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5" style={{ color: '#64748b' }} />
        <h2 className="font-semibold" style={{ color: '#e2e8f0' }}>{messages.length} {messages.length === 1 ? 'Message' : 'Messages'}</h2>
      </div>

      {messages.length === 0 ? (
        <div className="rounded-xl p-8 text-center" style={{ background: '#111118', border: '1px solid #1e1e2e' }}>
          <MessageSquare className="w-10 h-10 mx-auto mb-2" style={{ color: '#1e1e2e' }} />
          <p className="text-sm" style={{ color: '#64748b' }}>No messages yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className="rounded-xl p-4"
              style={msg.is_sme_response
                ? { background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)' }
                : { background: '#111118', border: '1px solid #1e1e2e' }}>
              {msg.is_sme_response && (
                <div className="flex items-center gap-1.5 text-xs font-medium mb-2" style={{ color: isRadarAdvisor ? '#22d3ee' : '#4ade80' }}>
                  {(msg.profiles as any)?.role === 'radar_advisor' ? '📡 RADAR Advisor Response' : '🎓 SME Response'}
                </div>
              )}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
                  {(msg.profiles as any)?.full_name?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="text-sm font-medium" style={{ color: '#e2e8f0' }}>{(msg.profiles as any)?.full_name}</span>
                <span className="badge text-xs" style={roleBadgeStyle[(msg.profiles as any)?.role] || roleBadgeStyle.investigator}>
                  {(msg.profiles as any)?.role?.toUpperCase()}
                </span>
                <span className="text-xs ml-auto" style={{ color: '#64748b' }}>
                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                </span>
              </div>
              <div className="prose prose-sm max-w-none" style={{ color: '#94a3b8' }}
                dangerouslySetInnerHTML={{ __html: msg.content }} />
            </div>
          ))}
        </div>
      )}

      {currentProfile && (
        <div className="rounded-xl p-4" style={{ background: '#111118', border: '1px solid #1e1e2e' }}>
          <h3 className="font-medium mb-3" style={{ color: '#e2e8f0' }}>
            {isResponder ? responderPrompt : '💬 Ask a follow-up question'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && <div className="text-sm px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>{error}</div>}
            <RichEditor content={content} onChange={setContent} placeholder={isResponder ? 'Share your expert guidance...' : 'Ask a follow-up question...'} />
            <div className="flex justify-end">
              <button type="submit" disabled={loading} className="btn-primary text-sm"
                style={isSME ? { background: 'linear-gradient(135deg, #16a34a, #22c55e)' } : isRadarAdvisor ? { background: 'linear-gradient(135deg, #0e7490, #06b6d4)' } : {}}>
                {loading ? 'Sending...' : isResponder ? 'Post Response' : 'Send Message'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
