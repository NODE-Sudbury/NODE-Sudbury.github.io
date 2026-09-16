import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import SpeakerPortalClient from './SpeakerPortalClient'

export const dynamic = 'force-dynamic'

export default async function SpeakerPortalPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: assignments, error } = await supabase
    .from('event_speakers')
    .select(`
      id,
      member_id,
      name,
      bio,
      photo_url,
      talk_title,
      talk_description,
      session_type,
      display_order,
      events (
        id,
        title,
        starts_at,
        status,
        slug
      )
    `)
    .eq('member_id', session.user.id)
    .order('display_order')

  return (
    <SpeakerPortalClient
      assignments={(assignments ?? []) as any[]}
      userId={session.user.id}
    />
  )
}
