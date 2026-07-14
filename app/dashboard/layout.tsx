import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import AutoOnline from '@/components/AutoOnline'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isSmeOrRadar = profile?.role === 'sme' || profile?.role === 'radar_advisor'

  // Set SME/Radar Advisor as Available on page load (server-side)
  if (isSmeOrRadar) {
    await supabase.from('sme_schedules').upsert({
      sme_id: user.id,
      availability_status: 'Available',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'sme_id' })
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }} className="bg-grid">
      <Navbar />
      {isSmeOrRadar && <AutoOnline userId={user.id} role={profile!.role} />}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
