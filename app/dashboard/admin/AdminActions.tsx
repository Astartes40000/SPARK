'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, XCircle } from 'lucide-react'

interface AdminActionsProps {
  userId: string
  currentRole: string
}

export default function AdminActions({ userId, currentRole }: AdminActionsProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const changeRole = async (newRole: string) => {
    setLoading(true)
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    setLoading(false)
    router.refresh()
  }

  const isPending = currentRole === 'pending_sme' || currentRole === 'pending_radar_advisor'

  if (isPending) {
    const approvedRole = currentRole === 'pending_sme' ? 'sme' : 'radar_advisor'
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => changeRole(approvedRole)}
          disabled={loading}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
          style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}
        >
          <CheckCircle className="w-3.5 h-3.5" />
          Approve
        </button>
        <button
          onClick={() => changeRole('investigator')}
          disabled={loading}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
          style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
        >
          <XCircle className="w-3.5 h-3.5" />
          Reject
        </button>
      </div>
    )
  }

  return (
    <select
      value={currentRole}
      onChange={(e) => changeRole(e.target.value)}
      disabled={loading}
      className="text-xs rounded-lg px-2 py-1.5 focus:outline-none disabled:opacity-50"
      style={{ background: '#0d0d14', border: '1px solid #1e1e2e', color: '#94a3b8' }}
    >
      <option value="investigator">Investigator</option>
      <option value="sme">SME</option>
      <option value="radar_advisor">RADAR Advisor</option>
    </select>
  )
}
