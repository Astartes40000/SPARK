'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userId: string
  role: string
}

export default function AutoOnline({ userId, role }: Props) {
  const supabase = createClient()

  useEffect(() => {
    const setOnlineAndAssign = async () => {
      // Set status to Available
      await supabase.from('sme_schedules').upsert({
        sme_id: userId,
        availability_status: 'Available',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'sme_id' })

      // Auto-assign pending consultations without an SME
      const isRadarAdvisor = role === 'radar_advisor'

      // Get this user's marketplaces
      const { data: mySchedule } = await supabase
        .from('sme_schedules')
        .select('marketplaces')
        .eq('sme_id', userId)
        .single()
      const myMarketplaces: string[] = mySchedule?.marketplaces || []

      const { data: pendingCases } = await supabase
        .from('consultations')
        .select('id, marketplace')
        .is('sme_id', null)
        .eq('status', 'Pending')
        .eq('is_radar', isRadarAdvisor)
        .limit(5)

      if (pendingCases && pendingCases.length > 0) {
        for (const c of pendingCases) {
          // Only assign if SME handles that marketplace or has no marketplaces set
          if (myMarketplaces.length > 0 && c.marketplace && !myMarketplaces.includes(c.marketplace)) continue

          await supabase.from('consultations').update({
            sme_id: userId,
            status: 'Assigned',
            acknowledged_at: new Date().toISOString(),
          }).eq('id', c.id)

          // Notify the investigator
          const { data: consultation } = await supabase
            .from('consultations')
            .select('investigator_id')
            .eq('id', c.id)
            .single()

          if (consultation) {
            await supabase.from('notifications').insert({
              user_id: consultation.investigator_id,
              type: 'sme_answer',
              from_user_id: userId,
              read: false,
              consultation_id: c.id,
            })
          }
        }
      }
    }

    setOnlineAndAssign()

    // Set Away when page hidden for more than 30 seconds, Available when visible again
    let awayTimeout: NodeJS.Timeout | null = null

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        // Wait 30 seconds before marking as Away
        awayTimeout = setTimeout(async () => {
          await supabase.from('sme_schedules').update({
            availability_status: 'Away',
            updated_at: new Date().toISOString(),
          }).eq('sme_id', userId)
        }, 30000)
      } else {
        // Cancel the away timeout if page becomes visible again
        if (awayTimeout) clearTimeout(awayTimeout)
        await supabase.from('sme_schedules').update({
          availability_status: 'Available',
          updated_at: new Date().toISOString(),
        }).eq('sme_id', userId)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (awayTimeout) clearTimeout(awayTimeout)
    }
  }, [userId, role, supabase])

  return null
}
