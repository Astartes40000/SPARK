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
    admin: { background: 'rgba(220,38,38,0.1)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.2)' },
    sme: { background: 'rgba(22,163,74,0.1)', color: '#16A34A', border: '1px solid rgba(22,163,74,0.2)' },
    investigator: { background: 'rgba(26,115,200,0.1)', color: '#1A73C8', border: '1px solid rgba(26,115,200,0.2)' },
    radar_advisor: { background: 'rgba(6,182,212,0.1)', color: '#0E7490', border: '1px solid rgba(6,182,212,0.2)' },
  }

  if (!profile) return (
    <div className="flex items-center justify-center py-20">
      <p style={{ color: '#64748b' }}>Loading...</p>
    </div>
  )

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-6" style={{ color: 'var(--text)' }}>Profile</h1>
      <div className="rounded-xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-4 mb-6 pb-6" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #E68A00, #FF9900)' }}>
            {profile.full_name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="font-semibold" style={{ color: 'var(--text)' }}>{profile.full_name || 'No name set'}</p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{profile.email}</p>
            <span className="badge mt-1.5" style={roleBadge[profile.role] || roleBadge.investigator}>{profile.role.toUpperCase()}</span>
          </div>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-dim)' }}>Full Name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-dark" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-dim)' }}>Email</label>
            <input type="email" value={profile.email} disabled className="input-dark opacity-50 cursor-not-allowed" />
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Email cannot be changed</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-dim)' }}>Role</label>
            <input type="text" value={profile.role.toUpperCase()} disabled className="input-dark opacity-50 cursor-not-allowed" />
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Contact admin to change your role</p>
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
