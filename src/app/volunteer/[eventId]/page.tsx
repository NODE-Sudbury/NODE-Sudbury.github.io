import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { VolunteerApplyClient } from './VolunteerApplyClient'

export const dynamic = 'force-dynamic'

export default async function VolunteerApplyPage({ params }: { params: { eventId: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: event } = await supabase
    .from('events').select('id, title, starts_at, ends_at').eq('id', params.eventId).single()
  if (!event) notFound()

  const { data: existing } = await supabase
    .from('volunteer_applications')
    .select('id, status')
    .eq('event_id', params.eventId)
    .eq('member_id', session.user.id)
    .single()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <VolunteerApplyClient event={event} existing={existing} memberId={session.user.id} />
      </div>
    </div>
  )
}
