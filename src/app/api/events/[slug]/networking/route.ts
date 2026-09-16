import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Helper: generate pairs from an array of member IDs for a given round.
// Pairs members by index after rotating the list by (round - 1) positions.
// The first member is fixed; the rest rotate.
// ---------------------------------------------------------------------------
function buildPairs(
  memberIds: string[],
  names: Record<string, { display_name: string | null; title: string | null; company: string | null }>,
  round: number
): Array<{
  member_id: string
  partner_id: string
  partner_name: string
  partner_title: string | null
  partner_company: string | null
  table_number: number
  round: number
}> {
  if (memberIds.length < 2) return []

  const ids = [...memberIds]
  const fixed = ids[0]
  const rotating = ids.slice(1)

  // Rotate by (round - 1)
  const offset = (round - 1) % rotating.length
  const rotated = [...rotating.slice(offset), ...rotating.slice(0, offset)]
  const ordered = [fixed, ...rotated]

  const pairs: ReturnType<typeof buildPairs> = []
  for (let i = 0; i < ordered.length - 1; i += 2) {
    const aId = ordered[i]
    const bId = ordered[i + 1]
    const tableNumber = Math.floor(i / 2) + 1

    const aInfo = names[aId] ?? { display_name: null, title: null, company: null }
    const bInfo = names[bId] ?? { display_name: null, title: null, company: null }

    pairs.push({
      member_id: aId,
      partner_id: bId,
      partner_name: bInfo.display_name ?? 'Unknown',
      partner_title: bInfo.title,
      partner_company: bInfo.company,
      table_number: tableNumber,
      round,
    })
    pairs.push({
      member_id: bId,
      partner_id: aId,
      partner_name: aInfo.display_name ?? 'Unknown',
      partner_title: aInfo.title,
      partner_company: aInfo.company,
      table_number: tableNumber,
      round,
    })
  }
  return pairs
}

// ---------------------------------------------------------------------------
// GET /api/events/[slug]/networking
// ---------------------------------------------------------------------------
export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  const cookieStore = cookies()

  // Auth client - identifies the calling user
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  // Service client - bypasses RLS for internal reads
  const service = createServiceClient()

  // Resolve the event
  const { data: event } = await service
    .from('events')
    .select('id, title, networking_round, networking_round_ends_at')
    .eq('slug', params.slug)
    .is('deleted_at', null)
    .single()

  if (!event) {
    return NextResponse.json({ error: 'event_not_found' }, { status: 404 })
  }

  const currentRound: number = (event as { networking_round?: number | null }).networking_round ?? 1
  const roundEndsAt: string | null =
    (event as { networking_round_ends_at?: string | null }).networking_round_ends_at ?? null

  // Identify the logged-in member (optional - pairs include everyone regardless)
  let currentMemberId: string | null = null
  const {
    data: { session },
  } = await authClient.auth.getSession()
  if (session?.user) {
    const { data: member } = await service
      .from('members')
      .select('id')
      .eq('user_id', session.user.id)
      .single()
    if (member) currentMemberId = member.id
  }

  // Fetch confirmed registrations for the event
  const { data: registrations } = await service
    .from('event_registrations')
    .select('member_id')
    .eq('event_id', event.id)
    .eq('status', 'confirmed')

  const memberIds: string[] = (registrations ?? []).map(
    (r: { member_id: string }) => r.member_id
  )

  // Fetch member profiles
  let nameMap: Record<
    string,
    { display_name: string | null; title: string | null; company: string | null }
  > = {}

  if (memberIds.length > 0) {
    const { data: profiles } = await service
      .from('members')
      .select('id, display_name, title, company')
      .in('id', memberIds)

    for (const p of profiles ?? []) {
      nameMap[p.id] = {
        display_name: p.display_name,
        title: p.title ?? null,
        company: p.company ?? null,
      }
    }
  }

  // Build all pairs for the current round
  const allPairs = buildPairs(memberIds, nameMap, currentRound)

  // Filter to only the pair for the current member (if logged in)
  const pairs = currentMemberId
    ? allPairs.filter(p => p.member_id === currentMemberId)
    : allPairs

  // Fetch topic tables for this event
  const { data: tables } = await service
    .from('speed_networking_tables')
    .select('id, topic, created_at')
    .eq('event_id', event.id)
    .order('created_at', { ascending: true })

  const tableIds = (tables ?? []).map((t: { id: string }) => t.id)

  // Fetch signups for those tables
  let signupRows: Array<{ table_id: string; member_id: string }> = []
  if (tableIds.length > 0) {
    const { data: signups } = await service
      .from('speed_networking_signups')
      .select('table_id, member_id')
      .in('table_id', tableIds)
    signupRows = (signups ?? []) as typeof signupRows
  }

  // Map member ids in signups to names
  const signupMemberIds = [...new Set(signupRows.map(s => s.member_id))]
  let signupNames: Record<string, string> = {}
  if (signupMemberIds.length > 0) {
    const { data: signupProfiles } = await service
      .from('members')
      .select('id, display_name')
      .in('id', signupMemberIds)
    for (const p of signupProfiles ?? []) {
      signupNames[p.id] = p.display_name ?? 'Member'
    }
  }

  // Assemble topic_tables response
  const topic_tables = (tables ?? []).map((t: { id: string; topic: string }) => ({
    id: t.id,
    topic: t.topic,
    signups: signupRows
      .filter(s => s.table_id === t.id)
      .map(s => ({ name: signupNames[s.member_id] ?? 'Member' })),
  }))

  return NextResponse.json({
    pairs,
    topic_tables,
    current_round: currentRound,
    round_ends_at: roundEndsAt,
  })
}

// ---------------------------------------------------------------------------
// POST /api/events/[slug]/networking
// Body: { action: "join_table", table_id: string }
// ---------------------------------------------------------------------------
export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const cookieStore = cookies()

  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const {
    data: { session },
  } = await authClient.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()

  // Resolve member
  const { data: member } = await service
    .from('members')
    .select('id')
    .eq('user_id', session.user.id)
    .single()
  if (!member) {
    return NextResponse.json({ error: 'member_not_found' }, { status: 404 })
  }

  // Resolve event
  const { data: event } = await service
    .from('events')
    .select('id')
    .eq('slug', params.slug)
    .is('deleted_at', null)
    .single()
  if (!event) {
    return NextResponse.json({ error: 'event_not_found' }, { status: 404 })
  }

  let body: { action: string; table_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (body.action === 'join_table') {
    const tableId = body.table_id
    if (!tableId) {
      return NextResponse.json({ error: 'table_id_required' }, { status: 400 })
    }

    // Verify the table belongs to this event
    const { data: table } = await service
      .from('speed_networking_tables')
      .select('id')
      .eq('id', tableId)
      .eq('event_id', event.id)
      .single()
    if (!table) {
      return NextResponse.json({ error: 'table_not_found' }, { status: 404 })
    }

    // Upsert - idempotent join
    const { error } = await service
      .from('speed_networking_signups')
      .upsert(
        { table_id: tableId, member_id: member.id },
        { onConflict: 'table_id,member_id', ignoreDuplicates: true }
      )

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true }, { status: 201 })
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 })
}
