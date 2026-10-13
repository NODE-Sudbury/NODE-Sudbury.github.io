import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function makeClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )
}

async function requireBoard(supabase: ReturnType<typeof makeClient>) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return false
  const { data } = await supabase.from('members').select('role').eq('id', session.user.id).single()
  return data && ['board', 'admin', 'super_admin'].includes(data.role)
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = makeClient()
  const { data, error } = await supabase
    .from('event_mentors')
    .select('*')
    .eq('event_id', params.id)
    .order('sort_order')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = makeClient()
  if (!await requireBoard(supabase)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const tags = typeof body.expertise_tags === 'string'
    ? body.expertise_tags.split(',').map((t: string) => t.trim()).filter(Boolean)
    : (body.expertise_tags ?? [])

  const { data, error } = await supabase
    .from('event_mentors')
    .insert({
      event_id: params.id,
      member_id: body.member_id ?? null,
      name: body.name,
      title: body.title ?? null,
      company: body.company ?? null,
      bio: body.bio ?? null,
      avatar_url: body.avatar_url ?? null,
      expertise_tags: tags,
      sort_order: body.sort_order ?? 0,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
