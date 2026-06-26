'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Star } from 'lucide-react'

interface Props { consultationId: string; smeId: string; investigatorId: string }

export default function RatingForm({ consultationId, smeId, investigatorId }: Props) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) return
    setLoading(true)
    await supabase.from('ratings').insert({ consultation_id: consultationId, sme_id: smeId, investigator_id: investigatorId, rating, feedback: feedback || null })
    setLoading(false)
    setSubmitted(true)
    router.refresh()
  }

  if (submitted) return (
    <div className="rounded-xl p-5 mt-4 text-center" style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.2)' }}>
      <Star className="w-8 h-8 mx-auto mb-2" style={{ color: '#f59e0b', fill: '#f59e0b' }} />
      <p className="font-medium" style={{ color: '#e2e8f0' }}>Thanks for your feedback!</p>
      <p className="text-sm mt-1" style={{ color: '#64748b' }}>Your rating helps improve the consultation process.</p>
    </div>
  )

  return (
    <div className="rounded-xl p-5 mt-4" style={{ background: '#111118', border: '1px solid #1e1e2e' }}>
      <h3 className="font-semibold mb-1" style={{ color: '#e2e8f0' }}>Rate this consultation</h3>
      <p className="text-sm mb-4" style={{ color: '#64748b' }}>How helpful was the SME&apos;s response?</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-1">
          {[1,2,3,4,5].map((star) => (
            <button key={star} type="button" onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)} onMouseLeave={() => setHover(0)} className="p-1">
              <Star className="w-8 h-8 transition-colors"
                style={{ color: star <= (hover || rating) ? '#f59e0b' : '#1e1e2e', fill: star <= (hover || rating) ? '#f59e0b' : '#1e1e2e' }} />
            </button>
          ))}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: '#94a3b8' }}>
            Feedback <span style={{ color: '#64748b' }}>(optional)</span>
          </label>
          <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={3}
            className="input-dark resize-none" placeholder="What did you find most helpful? Any suggestions?" />
        </div>
        <button type="submit" disabled={rating === 0 || loading}
          className="px-5 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
          style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)', color: '#fbbf24' }}>
          {loading ? 'Submitting...' : 'Submit Rating'}
        </button>
      </form>
    </div>
  )
}
