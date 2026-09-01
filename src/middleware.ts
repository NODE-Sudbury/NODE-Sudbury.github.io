import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const { pathname } = req.nextUrl

  const isAdminRoute = pathname.startsWith('/admin')
  const isCheckinRoute = pathname.startsWith('/checkin')
  const isOnboardingRoute = pathname.startsWith('/onboarding')
  const isApiRoute = pathname.startsWith('/api')
  const isAuthRoute = pathname.startsWith('/auth')
  const isLoginRoute = pathname.startsWith('/login')

  // Skip onboarding gate for static/public routes
  const skipOnboarding = isOnboardingRoute || isApiRoute || isAuthRoute || isLoginRoute

  if (isAdminRoute || isCheckinRoute || !skipOnboarding) {
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

    // Admin / checkin route protection
    if (isAdminRoute || isCheckinRoute) {
      if (!session) {
        return NextResponse.redirect(new URL('/login', req.url))
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

      if (isCheckinRoute && !['checkin', 'board'].includes(role)) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    // Onboarding gate: redirect logged-in users who haven't completed onboarding
    if (!skipOnboarding && session) {
      const { data: onboarding } = await supabase
        .from('member_onboarding_state')
        .select('completed_at')
        .eq('member_id', session.user.id)
        .single()

      // If no onboarding row or completed_at is null, redirect to onboarding
      const needsOnboarding = !onboarding || onboarding.completed_at === null
      if (needsOnboarding) {
        return NextResponse.redirect(new URL('/onboarding', req.url))
      }
    }
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
