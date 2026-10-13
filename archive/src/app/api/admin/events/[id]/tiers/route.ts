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

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await getAdminSupabase()
  const session = await requireBoard(supabase as any)
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { data, error } = await (supabase as any)
    .from('ticket_tiers')
    .select('*')
    .eq('event_id', params.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tiers: data ?? [] })
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await getAdminSupabase()
  const session = await requireBoard(supabase as any)
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  let body: {
    name?: string
    price_cents?: number
    capacity?: number | null
    description?: string | null
    sort_order?: number
  }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const { name, price_cents, capacity, description, sort_order } = body
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 })
  }
  if (typeof price_cents !== 'number' || price_cents < 0) {
    return NextResponse.json({ error: 'price_cents_invalid' }, { status: 400 })
  }

  const { data, error } = await (supabase as any)
    .from('ticket_tiers')
    .insert({
      event_id: params.id,
      name: name.trim(),
      price_cents,
      capacity: capacity ?? null,
      description: description?.trim() ?? null,
      sort_order: sort_order ?? 0,
      is_active: true,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tier: data }, { status: 201 })
}
