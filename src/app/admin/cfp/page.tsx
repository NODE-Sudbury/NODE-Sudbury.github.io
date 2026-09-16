import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminCFPIndexPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: member } = await supabase.from('members').select('role').eq('id', session.user.id).single()
  if (!member || !['board', 'admin'].includes(member.role)) redirect('/dashboard')

  const { data: events } = await supabase
    .from('events')
    .select('id, title, slug, status, starts_at, type')
    .in('status', ['draft', 'published'])
    .order('starts_at', { ascending: false })
    .limit(50)

  const STATUS_COLOR: Record<string, string> = {
    draft:     'text-[#5a6278]',
    published: 'text-[#9ece6a]',
    archived:  'text-[#f7768e]',
    cancelled: 'text-[#f7768e]',
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Call for Papers</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Review speaker and talk submissions for any event.
      </p>

      {(!events || events.length === 0) ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No upcoming events.{' '}
          <Link href="/admin/events" className="underline">Create one in Events.</Link>
        </p>
      ) : (
        <div className="space-y-2">
          {events.map(ev => (
            <Link
              key={ev.id}
              href={`/admin/cfp/${ev.id}`}
              className="flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors group"
            >
              <div>
                <p className="font-medium text-sm group-hover:text-foreground">{ev.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {ev.type.replace(/_/g, ' ')} - {new Date(ev.starts_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-medium capitalize ${STATUS_COLOR[ev.status] ?? 'text-muted-foreground'}`}>
                  {ev.status}
                </span>
                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
