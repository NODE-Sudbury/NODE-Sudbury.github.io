import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const GATE_DAYS = 14

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  // Auth check via session client
  const cookieStore = cookies()
  const _authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  // Use service role for all DB reads to bypass RLS on directory query
  const db = createServiceClient()

  // Resolve event from slug
  const { data: event, error: eventError } = await db
    .from('events')
    .select('id, title, starts_at, ends_at')
    .eq('slug', params.slug)
    .is('deleted_at', null)
    .single()

  if (eventError || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // 14-day post-event gate
  const now = new Date()
  let eventEnded = false
  let directoryClosesAt: string | null = null

  if (event.ends_at) {
    const endsAt = new Date(event.ends_at)
    eventEnded = endsAt < now
    const gateExpiry = new Date(endsAt.getTime() + GATE_DAYS * 24 * 60 * 60 * 1000)
    directoryClosesAt = gateExpiry.toISOString()

    if (now > gateExpiry) {
      return NextResponse.json({
        error: 'Directory no longer available',
        event_ended: true,
        directory_closes_at: gateExpiry.toISOString(),
      }, { status: 410 })
    }
  }

  // Parse query params
  const { searchParams } = new URL(req.url)
  const skillFilter = searchParams.get('skill') ?? null
  const openToConnectParam = searchParams.get('open_to_connect')
  const openToConnect = openToConnectParam === 'true' ? true : openToConnectParam === 'false' ? false : null
  const page = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
  const offset = page * limit

  // Build registrations query with member join
  let query = db
    .from('registrations')
    .select(
      `
      id,
      open_to_connect,
      members!inner(
        id,
        full_name,
        avatar_url,
        bio,
        company,
        title,
        skills
      )
      `,
      { count: 'exact' }
    )
    .eq('event_id', event.id)
    .eq('status', 'confirmed')
    .eq('show_in_directory', true)

  if (openToConnect !== null) {
    query = query.eq('open_to_connect', openToConnect)
  }

  // Skill filter: check if the skills jsonb array contains the given skill
  if (skillFilter) {
    query = query.contains('members.skills', JSON.stringify([skillFilter]))
  }

  query = query.range(offset, offset + limit - 1)

  const { data: rows, count, error: regError } = await query

  if (regError) {
    return NextResponse.json({ error: 'Failed to fetch attendees' }, { status: 500 })
  }

  const attendees = (rows ?? []).map((row: any) => ({
    id: row.members.id,
    full_name: row.members.full_name,
    avatar_url: row.members.avatar_url,
    bio: row.members.bio,
    company: row.members.company,
    title: row.members.title,
    skills: row.members.skills ?? [],
    open_to_connect: row.open_to_connect ?? false,
  }))

  return NextResponse.json({
    attendees,
    total: count ?? 0,
    event_ended: eventEnded,
    directory_closes_at: directoryClosesAt,
  })
}
