'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userId: string
}

export default function AutoOnline({ userId }: Props) {
  const supabase = createClient()

  useEffect(() => {
    // Set status to Available when SME/Radar Advisor opens the page
    const setOnline = async () => {
      await supabase.from('sme_schedules').upsert({
        sme_id: userId,
        availability_status: 'Available',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'sme_id' })
    }

    setOnline()

    // Set status to Away when page is hidden/closed
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
  }, [userId, supabase])

  return null
}
