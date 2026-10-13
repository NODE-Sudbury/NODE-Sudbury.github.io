import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const QRCode = require('qrcode')

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string; regId: string } }
) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // Fetch the registration and verify it exists
  const { data: registration } = await supabase
    .from('registrations')
    .select('id, member_id, event_id, events!inner(id, slug)')
    .eq('id', params.regId)
    .single()

  if (!registration) {
    return new NextResponse('Registration not found', { status: 404 })
  }

  const eventRaw = registration.events as unknown
  const event = (Array.isArray(eventRaw) ? eventRaw[0] : eventRaw) as { id: string; slug: string } | null

  // Verify the event slug matches
  if (!event || event.slug !== params.slug) {
    return new NextResponse('Not found', { status: 404 })
  }

  // Check authorization: registration owner or admin
  const isOwner = registration.member_id === session.user.id

  if (!isOwner) {
    // Check if the user is an admin
    const { data: member } = await supabase
      .from('members')
      .select('role')
      .eq('user_id', session.user.id)
      .single()

    const isAdmin = member?.role === 'admin' || member?.role === 'organizer'
    if (!isAdmin) {
      return new NextResponse('Forbidden', { status: 403 })
    }
  }

  const eventId = event.id
  const regId = params.regId
  const content = `https://nodesudbury.com/checkin/${eventId}?attendee=${regId}`

  const buffer: Buffer = await QRCode.toBuffer(content, { type: 'png', width: 300 })

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
