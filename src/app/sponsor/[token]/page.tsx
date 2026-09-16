import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import SponsorPortalClient from './SponsorPortalClient'

export const dynamic = 'force-dynamic'

function serviceRole() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface PageProps {
  params: { token: string }
}

export default async function SponsorTokenPage({ params }: PageProps) {
  const { token } = params

  if (!token || token.length < 16) {
    return <InvalidLink />
  }

  const supabase = serviceRole()

  const { data: sponsor, error } = await supabase
    .from('event_sponsors')
    .select(`
      id,
      tier,
      amount_cents,
      logo_url,
      website_url,
      description,
      booth_description,
      booth_assignment,
      contact_name,
      contact_email,
      portal_access_token,
      portal_token_expires_at,
      is_active,
      event:events (
        id,
        title,
        slug,
        starts_at,
        ends_at,
        status,
        event_locations ( name, address )
      ),
      member:members ( id, full_name, email )
    `)
    .eq('portal_access_token', token)
    .gt('portal_token_expires_at', new Date().toISOString())
    .maybeSingle()

  if (error || !sponsor) {
    return <InvalidLink />
  }

  // Fetch basic attendee metrics for this event
  const eventId = (sponsor.event as any)?.id
  let registrationCount = 0
  if (eventId) {
    const { count } = await supabase
      .from('registrations')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .not('status', 'eq', 'cancelled')
    registrationCount = count ?? 0
  }

  return (
    <SponsorPortalClient
      sponsor={sponsor as any}
      token={token}
      registrationCount={registrationCount}
    />
  )
}

function InvalidLink() {
  return (
    <div style={{ minHeight: '100vh', background: '#0f111a', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: 400, padding: '24px' }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>&#128274;</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Link expired or invalid</h1>
        <p style={{ color: '#8892a4', fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
          This sponsor portal link has expired or is no longer valid. Magic links expire after 7 days.
          Request a fresh link using your email address.
        </p>
        <Link
          href="/sponsor"
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            background: '#38bdf8',
            color: '#000',
            borderRadius: 6,
            fontWeight: 600,
            fontSize: 14,
            textDecoration: 'none',
          }}
        >
          Get a new link
        </Link>
      </div>
    </div>
  )
}
