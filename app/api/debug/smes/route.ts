import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select(`*, sme_schedules(*)`)
    .eq('role', 'sme')

  return NextResponse.json({ data, error })
}
