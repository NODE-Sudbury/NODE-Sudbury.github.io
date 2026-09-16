import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('members')
    .select('id, full_name')
    .eq('user_id', session.user.id)
    .single()

  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  const { data: cert } = await supabase
    .from('certificates')
    .select('id, cert_type, issued_at, metadata, event:events(title, slug)')
    .eq('id', params.id)
    .eq('member_id', member.id)
    .single()

  if (!cert) return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })

  const format = req.nextUrl.searchParams.get('format')

  if (format === 'badge') {
    // Open Badges v3 JSON-LD
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://nodesudbury.com'
    const badge = {
      '@context': [
        'https://www.w3.org/ns/credentials/v2',
        'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json',
      ],
      id: `${appUrl}/api/certificates/${cert.id}?format=badge`,
      type: ['VerifiableCredential', 'OpenBadgeCredential'],
      name: `NODE ${cert.cert_type} Certificate`,
      issuer: {
        id: `${appUrl}`,
        type: 'Profile',
        name: 'NODE Sudbury',
        url: appUrl,
        email: 'hello@nodesudbury.com',
      },
      validFrom: cert.issued_at,
      credentialSubject: {
        id: `${appUrl}/profile/${member.id}`,
        type: 'AchievementSubject',
        name: member.full_name,
        achievement: {
          id: `${appUrl}/badges/${cert.cert_type}`,
          type: 'Achievement',
          name: `NODE ${cert.cert_type}`,
          description: `Awarded by NODE Sudbury for ${cert.cert_type} at ${(cert.event as unknown as { title: string; slug: string } | null)?.title ?? 'an event'}.`,
          criteria: { narrative: 'Verified by NODE Sudbury community platform.' },
        },
      },
    }
    return NextResponse.json(badge, {
      headers: { 'Content-Type': 'application/ld+json' },
    })
  }

  // Plain JSON fallback (PDF generation would require a render service)
  return NextResponse.json({
    id: cert.id,
    cert_type: cert.cert_type,
    issued_at: cert.issued_at,
    member_name: member.full_name,
    event_title: (cert.event as unknown as { title: string; slug: string } | null)?.title ?? 'NODE Event',
    metadata: cert.metadata,
  })
}
