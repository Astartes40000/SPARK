'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
