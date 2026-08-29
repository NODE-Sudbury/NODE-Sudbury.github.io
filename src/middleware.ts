import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const { pathname } = req.nextUrl

  const isAdminRoute = pathname.startsWith('/admin')
  const isCheckinRoute = pathname.startsWith('/checkin')

  if (isAdminRoute || isCheckinRoute) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) => {
              res.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.redirect(new URL('/auth/test', req.url))
    }

    const { data: member } = await supabase
      .from('members')
      .select('role')
      .eq('id', session.user.id)
      .single()

    const role = member?.role ?? 'member'

    if (isAdminRoute && role !== 'board') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    if (isCheckinRoute && role === 'member') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
