import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function boardOnly(supabase: ReturnType<typeof createServerClient>, session: { user: { id: string } } | null) {
  if (!session) return false
  const { data } = await supabase.from('members').select('role').eq('id', session.user.id).single()
  return data && ['board','admin','super_admin'].includes(data.role)
}

export async function POST(req: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )
  const { data: { session } } = await supabase.auth.getSession()
  if (!await boardOnly(supabase, session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { data, error } = await supabase
    .from('event_sponsors')
    .insert({ tier: body.tier, website_url: body.website_url ?? null, is_active: true })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sponsor: data })
}
