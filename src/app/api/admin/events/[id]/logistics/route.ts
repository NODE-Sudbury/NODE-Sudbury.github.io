import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function isBoard(supabase: ReturnType<typeof createServerClient>, userId: string) {
  const { data } = await supabase.from('members').select('role').eq('user_id', userId).single()
  return data?.role === 'board' || data?.role === 'admin'
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  if (!await isBoard(supabase, session.user.id)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { data: event } = await supabase
    .from('events')
    .select('meal_notes, collect_dietary, collect_tshirt_size, collect_accessibility')
    .eq('id', params.id)
    .single()

  const { data: regs } = await supabase
    .from('registrations')
    .select('dietary_notes, tshirt_size, accessibility_needs')
    .eq('event_id', params.id)
    .eq('status', 'confirmed')

  const dietaryCount: Record<string, number> = {}
  const tshirtCount: Record<string, number> = {}
  const accessibilityList: string[] = []

  for (const r of regs ?? []) {
    if (Array.isArray(r.dietary_notes)) {
      for (const d of r.dietary_notes) {
        dietaryCount[d] = (dietaryCount[d] ?? 0) + 1
      }
    }
    if (r.tshirt_size) tshirtCount[r.tshirt_size] = (tshirtCount[r.tshirt_size] ?? 0) + 1
    if (r.accessibility_needs?.trim()) accessibilityList.push(r.accessibility_needs.trim())
  }

  return NextResponse.json({
    meal_notes: event?.meal_notes ?? null,
    collect_dietary: event?.collect_dietary,
    collect_tshirt_size: event?.collect_tshirt_size,
    collect_accessibility: event?.collect_accessibility,
    dietary_count: dietaryCount,
    tshirt_count: tshirtCount,
    accessibility_list: accessibilityList,
    total_confirmed: regs?.length ?? 0,
  })
}
