'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AvailabilityStatus } from '@/lib/types'
import { ArrowLeft, Save, Globe, Clock } from 'lucide-react'
import Link from 'next/link'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const TIMEZONES = ['UTC','America/New_York','America/Chicago','America/Denver','America/Los_Angeles','America/Sao_Paulo','Europe/London','Europe/Paris','Europe/Madrid','Asia/Dubai','Asia/Kolkata','Asia/Bangkok','Asia/Singapore','Asia/Tokyo','Australia/Sydney']
const SPECIALIZATION_OPTIONS = ['Seller Appeals','Policy','Defect Review','SOP','Regulatory','Chemistry','Safety','Operations','Legal','Regional']
const LANGUAGE_OPTIONS = ['English','Spanish','Portuguese','French','German','Japanese','Mandarin','Arabic','Hindi']

export default function SchedulePage() {
  const [availability, setAvailability] = useState<AvailabilityStatus>('Away')
  const [timezone, setTimezone] = useState('UTC')
  const [shiftStart, setShiftStart] = useState('09:00')
  const [shiftEnd, setShiftEnd] = useState('17:00')
  const [workingDays, setWorkingDays] = useState<string[]>(['Monday','Tuesday','Wednesday','Thursday','Friday'])
  const [specializations, setSpecializations] = useState<string[]>([])
  const [languages, setLanguages] = useState<string[]>(['English'])
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('sme_schedules').select('*').eq('sme_id', user.id).single()
      if (data) {
        setAvailability(data.availability_status)
        setTimezone(data.timezone)
        setShiftStart(data.shift_start || '09:00')
        setShiftEnd(data.shift_end || '17:00')
        setWorkingDays(data.working_days || [])
        setSpecializations(data.specializations || [])
        setLanguages(data.languages || [])
      }
    }
    load()
  }, [supabase])

  const toggle = (arr: string[], setArr: (v: string[]) => void, val: string) =>
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val])

  const handleSave = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('sme_schedules').upsert({ sme_id: user.id, availability_status: availability, timezone, shift_start: shiftStart, shift_end: shiftEnd, working_days: workingDays, specializations, languages, updated_at: new Date().toISOString() }, { onConflict: 'sme_id' })
    await supabase.from('profiles').update({ specializations }).eq('id', user.id)
    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const statusOptions: { value: AvailabilityStatus; label: string; style: React.CSSProperties; activeStyle: React.CSSProperties }[] = [
    { value: 'Available', label: '🟢 Available', style: { background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }, activeStyle: { background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.4)', color: '#16A34A' } },
    { value: 'Busy', label: '🟡 Busy', style: { background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }, activeStyle: { background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.4)', color: '#D97706' } },
    { value: 'Away', label: '⚫ Away', style: { background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }, activeStyle: { background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.4)', color: '#64748B' } },
    { value: 'Off', label: '🔴 Off', style: { background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }, activeStyle: { background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.4)', color: '#DC2626' } },
  ]

  const sectionClass = "rounded-xl p-5 space-y-4"
  const sectionStyle: React.CSSProperties = { background: 'var(--bg-surface)', border: '1px solid var(--border)' }

  const toggleBtn = (active: boolean) => active
    ? { background: 'rgba(255,153,0,0.12)', border: '2px solid rgba(255,153,0,0.5)', color: '#E68A00' }
    : { background: 'var(--bg-elevated)', border: '2px solid var(--border)', color: 'var(--text-muted)' }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="p-2 rounded-lg" style={{ color: '#64748b' }}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#e2e8f0' }}>My Schedule & Availability</h1>
          <p className="text-sm" style={{ color: '#64748b' }}>Set when you are available for consultations</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Status */}
        <div className={sectionClass} style={sectionStyle}>
          <h2 className="font-semibold" style={{ color: 'var(--text)' }}>Current Status</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {statusOptions.map((s) => (
              <button key={s.value} onClick={() => setAvailability(s.value)}
                className="px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={availability === s.value ? s.activeStyle : s.style}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Timezone + Hours */}
        <div className={sectionClass} style={sectionStyle}>
          <h2 className="font-semibold flex items-center gap-2" style={{ color: '#e2e8f0' }}>
            <Globe className="w-4 h-4" style={{ color: '#64748b' }} /> Timezone & Hours
          </h2>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#94a3b8' }}>Timezone</label>
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="input-dark">
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[{ label: 'Shift Start', val: shiftStart, set: setShiftStart }, { label: 'Shift End', val: shiftEnd, set: setShiftEnd }].map((f) => (
              <div key={f.label}>
                <label className="block text-sm font-medium mb-1.5 flex items-center gap-1" style={{ color: '#94a3b8' }}>
                  <Clock className="w-3.5 h-3.5" />{f.label}
                </label>
                <input type="time" value={f.val} onChange={(e) => f.set(e.target.value)} className="input-dark" />
              </div>
            ))}
          </div>
        </div>

        {/* Working days */}
        <div className={sectionClass} style={sectionStyle}>
          <h2 className="font-semibold" style={{ color: '#e2e8f0' }}>Working Days</h2>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => (
              <button key={day} onClick={() => toggle(workingDays, setWorkingDays, day)}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
                style={toggleBtn(workingDays.includes(day))}>
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {/* Specializations */}
        <div className={sectionClass} style={sectionStyle}>
          <h2 className="font-semibold" style={{ color: '#e2e8f0' }}>Specializations</h2>
          <div className="flex flex-wrap gap-2">
            {SPECIALIZATION_OPTIONS.map((spec) => (
              <button key={spec} onClick={() => toggle(specializations, setSpecializations, spec)}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
                style={specializations.includes(spec)
                  ? { background: 'rgba(168,85,247,0.15)', border: '2px solid rgba(168,85,247,0.5)', color: '#c084fc' }
                  : { background: '#0d0d14', border: '2px solid #1e1e2e', color: '#64748b' }}>
                {spec}
              </button>
            ))}
          </div>
        </div>

        {/* Languages */}
        <div className={sectionClass} style={sectionStyle}>
          <h2 className="font-semibold" style={{ color: '#e2e8f0' }}>Languages</h2>
          <div className="flex flex-wrap gap-2">
            {LANGUAGE_OPTIONS.map((lang) => (
              <button key={lang} onClick={() => toggle(languages, setLanguages, lang)}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
                style={languages.includes(lang)
                  ? { background: 'rgba(34,197,94,0.12)', border: '2px solid rgba(34,197,94,0.4)', color: '#4ade80' }
                  : { background: '#0d0d14', border: '2px solid #1e1e2e', color: '#64748b' }}>
                {lang}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleSave} disabled={loading} className="btn-primary">
          <Save className="w-4 h-4" />
          {loading ? 'Saving...' : saved ? '✓ Saved!' : 'Save Schedule'}
        </button>
      </div>
    </div>
  )
}
