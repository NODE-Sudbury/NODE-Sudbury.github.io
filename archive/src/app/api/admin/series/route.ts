import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function makeSupabase() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
}

async function getBoard(supabase: ReturnType<typeof createServerClient>, userId: string) {
  const { data } = await supabase.from('members').select('role').eq('id', userId).single()
  return data?.role === 'board' || data?.role === 'admin'
}

export async function GET() {
  const supabase = await makeSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  if (!await getBoard(supabase, session.user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('event_series')
    .select('id, name, slug, is_active, description, created_at')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ series: data })
}

export async function POST(req: Request) {
  const supabase = await makeSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  if (!await getBoard(supabase, session.user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const name = String(body.name ?? '').trim()
  const slug = String(body.slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).trim()
  const description = body.description ? String(body.description).trim() : null

  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
  if (!slug) return NextResponse.json({ error: 'slug is required' }, { status: 400 })

  const { data, error } = await supabase
    .from('event_series')
    .insert({ name, slug, description, is_active: true })
    .select('id, name, slug, is_active, description')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ series: data }, { status: 201 })
}
