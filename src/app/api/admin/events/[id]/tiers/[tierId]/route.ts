import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function getAdminSupabase() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
}

async function requireBoard(supabase: ReturnType<typeof createServerClient>) {
  const { data: { session } } = await (supabase as any).auth.getSession()
  if (!session) return null
  const { data: member } = await (supabase as any)
    .from('members').select('role').eq('id', session.user.id).single()
  if (!member || !['board', 'admin', 'super_admin'].includes(member.role)) return null
  return session
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; tierId: string } }
) {
  const supabase = await getAdminSupabase()
  const session = await requireBoard(supabase as any)
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  let body: Partial<{
    name: string
    price_cents: number
    capacity: number | null
    description: string | null
    is_active: boolean
    sort_order: number
  }>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const patch: Record<string, unknown> = {}
  if (body.name !== undefined) patch.name = String(body.name).trim()
  if (body.price_cents !== undefined) patch.price_cents = Number(body.price_cents)
  if ('capacity' in body) patch.capacity = body.capacity ?? null
  if ('description' in body) patch.description = body.description ?? null
  if (body.is_active !== undefined) patch.is_active = Boolean(body.is_active)
  if (body.sort_order !== undefined) patch.sort_order = Number(body.sort_order)

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'no_fields' }, { status: 400 })
  }

  const { data, error } = await (supabase as any)
    .from('ticket_tiers')
    .update(patch)
    .eq('id', params.tierId)
    .eq('event_id', params.id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json({ tier: data })
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; tierId: string } }
) {
  const supabase = await getAdminSupabase()
  const session = await requireBoard(supabase as any)
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  // Check if any registrations reference this tier
  const { count } = await (supabase as any)
    .from('registrations')
    .select('id', { count: 'exact', head: true })
    .eq('ticket_type_id', params.tierId)

  if ((count ?? 0) > 0) {
    // Soft-delete: deactivate so existing registrations remain valid
    const { data, error } = await (supabase as any)
      .from('ticket_tiers')
      .update({ is_active: false })
      .eq('id', params.tierId)
      .eq('event_id', params.id)
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    return NextResponse.json({ deleted: false, deactivated: true })
  }

  // Hard-delete when no registrations reference it
  const { error } = await (supabase as any)
    .from('ticket_tiers')
    .delete()
    .eq('id', params.tierId)
    .eq('event_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: true })
}
