import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import SpeakerEditClient from './SpeakerEditClient'

export const dynamic = 'force-dynamic'

export default async function SpeakerEditPage({ params }: { params: { speakerId: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: speaker, error } = await supabase
    .from('event_speakers')
    .select(`
      id,
      event_id,
      member_id,
      name,
      bio,
      photo_url,
      website_url,
      talk_title,
      talk_description,
      slide_deck_url,
      logistics_notes,
      session_type,
      events (
        id,
        title,
        starts_at,
        slug
      )
    `)
    .eq('id', params.speakerId)
    .single()

  if (error || !speaker) notFound()

  // Verify ownership
  if (speaker.member_id !== session.user.id) {
    redirect('/speaker')
  }

  return <SpeakerEditClient speaker={speaker as any} />
}
