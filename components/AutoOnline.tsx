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
    const setOnline = async () => {
      // Set status to Available when SME/Radar Advisor opens the page
      await supabase.from('sme_schedules').upsert({
        sme_id: userId,
        availability_status: 'Available',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'sme_id' })
    }

    setOnline()

    // Also auto-assign pending consultations that match this user's marketplaces
    const autoAssign = async () => {
      const isRadarAdvisor = role === 'radar_advisor'

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
        .limit(1)

      if (pendingCases && pendingCases.length > 0) {
        for (const c of pendingCases) {
          if (myMarketplaces.length > 0 && c.marketplace && !myMarketplaces.includes(c.marketplace)) continue

          await supabase.from('consultations').update({
            sme_id: userId,
            status: 'Assigned',
            acknowledged_at: new Date().toISOString(),
          }).eq('id', c.id)

          // Set to Busy after taking a case
          await supabase.from('sme_schedules').update({
            availability_status: 'Busy',
            current_queue: 1,
            updated_at: new Date().toISOString(),
          }).eq('sme_id', userId)

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

    autoAssign()
  }, [userId, role, supabase])

  return null
}
