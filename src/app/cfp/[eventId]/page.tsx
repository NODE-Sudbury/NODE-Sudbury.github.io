import { supabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import CFPForm from './CFPForm'

export const dynamic = 'force-dynamic'

export default async function CFPPage({ params }: { params: { eventId: string } }) {
  const { data: event } = await supabase
    .from('events')
    .select('id, title, slug, type, status, starts_at')
    .eq('id', params.eventId)
    .single()

  if (!event) redirect('/')

  const { data: flag } = await supabase
    .from('feature_flags')
    .select('enabled')
    .eq('key', 'cfp_enabled')
    .maybeSingle()

  if (!flag?.enabled) {
    return (
      <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#f0e6d3] text-xl font-semibold mb-2">CFP is closed</p>
          <p className="text-[#5a6278] text-sm">Call for proposals is not currently open for this event.</p>
        </div>
      </div>
    )
  }

  return <CFPForm event={event} />
}
