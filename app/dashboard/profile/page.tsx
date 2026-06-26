'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { Save } from 'lucide-react'

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(data)
        setFullName(data?.full_name || '')
      }
    }
    getProfile()
  }, [supabase])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setLoading(true)
    await supabase.from('profiles').update({ full_name: fullName }).eq('id', profile.id)
    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const roleBadge: Record<string, React.CSSProperties> = {
    admin: { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' },
    sme: { background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' },
    investigator: { background: 'rgba(168,85,247,0.12)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.25)' },
    radar_advisor: { background: 'rgba(6,182,212,0.12)', color: '#22d3ee', border: '1px solid rgba(6,182,212,0.25)' },
  }

  if (!profile) return (
    <div className="flex items-center justify-center py-20">
      <p style={{ color: '#64748b' }}>Loading...</p>
    </div>
  )

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-6" style={{ color: '#e2e8f0' }}>Profile</h1>

      <div className="rounded-xl p-6" style={{ background: '#111118', border: '1px solid #1e1e2e' }}>
        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6 pb-6" style={{ borderBottom: '1px solid #1e1e2e' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', boxShadow: '0 0 20px rgba(168,85,247,0.4)' }}>
            {profile.full_name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="font-semibold" style={{ color: '#e2e8f0' }}>{profile.full_name || 'No name set'}</p>
            <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>{profile.email}</p>
            <span className="badge mt-1.5" style={roleBadge[profile.role] || roleBadge.investigator}>
              {profile.role.toUpperCase()}
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#94a3b8' }}>Full Name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-dark" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#94a3b8' }}>Email</label>
            <input type="email" value={profile.email} disabled
              className="input-dark opacity-50 cursor-not-allowed" />
            <p className="text-xs mt-1" style={{ color: '#64748b' }}>Email cannot be changed</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#94a3b8' }}>Role</label>
            <input type="text" value={profile.role.toUpperCase()} disabled
              className="input-dark opacity-50 cursor-not-allowed" />
            <p className="text-xs mt-1" style={{ color: '#64748b' }}>Contact admin to change your role</p>
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
