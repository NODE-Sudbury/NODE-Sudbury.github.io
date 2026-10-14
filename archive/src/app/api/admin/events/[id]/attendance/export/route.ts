import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function csvEscape(val: unknown): string {
  if (val === null || val === undefined) return ''
  const s = String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: member } = await supabase.from('members').select('role').eq('id', session.user.id).single()
  if (member?.role !== 'board') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { data: rows } = await supabase
    .from('registrations')
    .select('status, checked_in_at, amount_paid_cents, members(full_name, email), ticket_types(name)')
    .eq('event_id', params.id)
    .order('created_at', { ascending: true })

  const header = 'name,email,ticket_type,status,checked_in_at,amount_paid\n'
  const body = (rows ?? []).map(r => {
    const m = Array.isArray(r.members) ? r.members[0] : r.members
    const tt = Array.isArray(r.ticket_types) ? r.ticket_types[0] : r.ticket_types
    return [
      (m as any)?.full_name,
      (m as any)?.email,
      (tt as any)?.name,
      r.status,
      r.checked_in_at,
      r.amount_paid_cents ? `$${(r.amount_paid_cents / 100).toFixed(2)}` : '$0.00',
    ].map(csvEscape).join(',')
  }).join('\n')

  return new NextResponse(header + body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="attendance-${params.id}.csv"`,
    },
  })
}
