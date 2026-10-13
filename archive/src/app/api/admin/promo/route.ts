import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { data: member } = await supabase.from('members').select('role').eq('id', session.user.id).single()
  if (!member || !['board','admin','super_admin'].includes(member.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  if (!body.code?.trim()) return NextResponse.json({ error: 'Code required' }, { status: 400 })

  const { data, error } = await supabase
    .from('promo_codes')
    .insert({
      code: body.code.toUpperCase(),
      discount_pct: body.discount_pct ?? null,
      discount_cents: body.discount_cents ?? null,
      max_uses: body.max_uses ?? null,
      expires_at: body.expires_at ?? null,
      is_active: true,
      used_count: 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ promo: data })
}
