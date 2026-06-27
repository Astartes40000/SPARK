'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Shield, ArrowRight, Microscope, GraduationCap, Radar } from 'lucide-react'

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'sme' | 'investigator' | 'radar_advisor'>('investigator')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!email.endsWith('@amazon.com')) {
      setError('Only @amazon.com email addresses are allowed.')
      setLoading(false)
      return
    }

    const actualRole = role === 'sme' ? 'pending_sme'
      : role === 'radar_advisor' ? 'pending_radar_advisor'
      : 'investigator'

    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, role: actualRole } },
    })

    if (error) { setError(error.message); setLoading(false) }
    else {
      if (actualRole === 'pending_sme' || actualRole === 'pending_radar_advisor') router.push('/login?pending=true')
      else { router.push('/dashboard'); router.refresh() }
    }
  }

  const roleOptions = [
    { value: 'investigator', label: 'Investigator', icon: <Microscope className="w-5 h-5" />, desc: 'Submit consultations', badge: null },
    { value: 'sme', label: 'SME Expert', icon: <GraduationCap className="w-5 h-5" />, desc: 'Provide expert guidance', badge: 'Requires approval' },
    { value: 'radar_advisor', label: 'Radar Advisor', icon: <Radar className="w-5 h-5" />, desc: 'Review radar cases', badge: 'Requires approval' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#F3F4F6' }} className="bg-grid flex items-center justify-center px-4">
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #E68A00, #FF9900)', boxShadow: '0 4px 16px rgba(255,153,0,0.3)' }}>
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#0F172A' }}>
            Safe<span style={{ color: '#FF9900' }}>-T</span>
          </h1>
          <p className="mt-2 text-sm" style={{ color: '#64748B' }}>Create your account</p>
        </div>

        <div className="rounded-2xl p-8" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <div className="px-4 py-3 rounded-lg text-sm" style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', color: '#DC2626' }}>
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#475569' }}>Full Name</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required
                className="input-dark" placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#475569' }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="input-dark" placeholder="you@amazon.com" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#475569' }}>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                className="input-dark" placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#475569' }}>I am a...</label>
              <div className="grid grid-cols-1 gap-3">
                {roleOptions.map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setRole(opt.value as any)}
                    className="p-3.5 rounded-xl text-left transition-all"
                    style={role === opt.value ? {
                      background: 'rgba(255,153,0,0.08)',
                      border: '2px solid rgba(255,153,0,0.5)',
                    } : {
                      background: '#F8FAFC',
                      border: '2px solid #E2E8F0',
                    }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div style={{ color: role === opt.value ? '#FF9900' : '#64748B' }}>{opt.icon}</div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: role === opt.value ? '#E68A00' : '#0F172A' }}>{opt.label}</p>
                          <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>{opt.desc}</p>
                        </div>
                      </div>
                      {opt.badge && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(217,119,6,0.1)', color: '#D97706', border: '1px solid rgba(217,119,6,0.25)' }}>
                          {opt.badge}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 mt-2">
              {loading ? 'Creating account...' : (<><span>Create Account</span><ArrowRight className="w-4 h-4" /></>)}
            </button>
          </form>
          <p className="text-center text-sm mt-6" style={{ color: '#64748B' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#FF9900' }} className="font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
