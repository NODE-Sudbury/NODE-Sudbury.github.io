import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function serviceRole() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  // Board-only check
  const { data: member } = await supabase
    .from('members')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!member || member.role !== 'board') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  let body: {
    member_id: string
    points: number
    reason: string
    badge_slug?: string
    badge_name?: string
    source_type?: string
    source_id?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const { member_id, points, reason, badge_slug, badge_name, source_type, source_id } = body

  if (!member_id || points == null || !reason) {
    return NextResponse.json({ error: 'missing_required_fields' }, { status: 400 })
  }

  const svc = serviceRole()

  // Insert points entry
  const { error: pointsErr } = await svc.from('member_points').insert({
    member_id,
    points,
    reason,
    source_type: source_type ?? 'manual',
    source_id: source_id ?? null,
  })

  if (pointsErr) {
    return NextResponse.json({ error: pointsErr.message }, { status: 500 })
  }

  // Upsert badge if provided
  if (badge_slug) {
    const { error: badgeErr } = await svc.from('member_badges').upsert(
      {
        member_id,
        badge_slug,
        badge_name: badge_name ?? badge_slug,
        awarded_at: new Date().toISOString(),
      },
      { onConflict: 'member_id,badge_slug', ignoreDuplicates: false }
    )
    if (badgeErr) {
      return NextResponse.json({ error: badgeErr.message }, { status: 500 })
    }
  }

  // Return updated totals for the member
  const { data: pointsRows } = await svc
    .from('member_points')
    .select('points')
    .eq('member_id', member_id)

  const total_points = (pointsRows ?? []).reduce((acc, r) => acc + (r.points ?? 0), 0)

  const { data: badges } = await svc
    .from('member_badges')
    .select('badge_slug, badge_name, awarded_at')
    .eq('member_id', member_id)
    .order('awarded_at', { ascending: false })

  return NextResponse.json({ ok: true, member_id, total_points, badges: badges ?? [] })
}
