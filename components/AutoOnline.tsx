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

      // Get this user's specializations
      const { data: mySchedule } = await supabase
        .from('sme_schedules')
        .select('specializations')
        .eq('sme_id', userId)
        .single()
      const mySpecs: string[] = mySchedule?.specializations || []

      const { data: pendingCases } = await supabase
        .from('consultations')
        .select('id, case_type')
        .is('sme_id', null)
        .eq('status', 'Pending')
        .eq('is_radar', isRadarAdvisor)
        .limit(5)

      // Map case types to specialization names
      const caseTypeToSpec: Record<string, string> = {
        'New Case': 'New Case',
        'Seller Appeal': 'Seller Appeals',
        'Amznpend': 'Amznpend',
        'SOP Discrepancy': 'SOP',
        'Defect Review': 'Defect Review',
      }

      if (pendingCases && pendingCases.length > 0) {
        for (const c of pendingCases) {
          // Only assign if SME has matching specialization or has no specializations set
          const requiredSpec = caseTypeToSpec[c.case_type] || c.case_type
          if (mySpecs.length > 0 && !mySpecs.includes(requiredSpec)) continue

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

    // Set Away when page hidden, Available when visible again
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        await supabase.from('sme_schedules').update({
          availability_status: 'Away',
          updated_at: new Date().toISOString(),
        }).eq('sme_id', userId)
      } else {
        await supabase.from('sme_schedules').update({
          availability_status: 'Available',
          updated_at: new Date().toISOString(),
        }).eq('sme_id', userId)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [userId, role, supabase])

  return null
}
