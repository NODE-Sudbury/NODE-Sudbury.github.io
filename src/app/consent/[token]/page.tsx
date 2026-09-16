import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import ConsentActions from './ConsentActions'

export const dynamic = 'force-dynamic'

export default async function ConsentPage({ params }: { params: { token: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: consent } = await supabase
    .from('minor_consent_records')
    .select(`
      id, guardian_name, guardian_email, relationship, consent_given, consented_at,
      member_id, members(display_name),
      registration_id,
      event_id, events(title, starts_at, slug)
    `)
    .eq('consent_token', params.token)
    .single()

  if (!consent) notFound()

  const member = Array.isArray(consent.members) ? consent.members[0] : consent.members as { display_name: string | null } | null
  const event = Array.isArray(consent.events) ? consent.events[0] : consent.events as { title: string; starts_at: string; slug: string } | null

  const childName = member?.display_name ?? 'the attendee'
  const eventTitle = event?.title ?? 'NODE Event'
  const eventDate = event?.starts_at
    ? new Date(event.starts_at).toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : 'TBD'

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full p-8">
        <div className="text-center mb-6">
          <div className="text-sky-400 font-bold text-xl tracking-widest mb-1">NODE SUDBURY</div>
          <div className="text-gray-500 text-sm">Parental Consent</div>
        </div>

        {consent.consent_given ? (
          <div className="text-center">
            <div className="text-4xl mb-4">✅</div>
            <h1 className="text-xl font-bold text-white mb-2">Consent Already Given</h1>
            <p className="text-gray-400 text-sm">
              You confirmed consent for <strong className="text-white">{childName}</strong> on{' '}
              {consent.consented_at ? new Date(consent.consented_at).toLocaleDateString() : 'a previous date'}.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold text-white mb-4">Parental Consent Required</h1>
            <div className="bg-gray-800 rounded-xl p-4 mb-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Child</span>
                <span className="text-white font-medium">{childName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Event</span>
                <span className="text-white font-medium">{eventTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Date</span>
                <span className="text-white font-medium">{eventDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Your role</span>
                <span className="text-white font-medium capitalize">{consent.relationship}</span>
              </div>
            </div>

            <p className="text-gray-400 text-sm mb-6">
              By confirming, <strong className="text-white">{consent.guardian_name}</strong>, you give consent for{' '}
              <strong className="text-white">{childName}</strong> to attend{' '}
              <strong className="text-white">{eventTitle}</strong> organized by NODE Sudbury.
            </p>

            <ConsentActions token={params.token} />
          </>
        )}
      </div>
    </div>
  )
}
