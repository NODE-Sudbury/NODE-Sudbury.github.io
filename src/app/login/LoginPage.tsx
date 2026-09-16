'use client'

import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [loading, setLoading] = useState(true)
  const [signingIn, setSigningIn] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/dashboard')
      else setLoading(false)
    })
  }, [])

  async function handleSignIn() {
    setSigningIn(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-[#f0e6d3] border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Top bar */}
      <header className="px-8 py-5 flex items-center">
        <span className="text-sm font-bold tracking-widest text-[#f0e6d3]">NODE</span>
        <span className="text-sm font-light tracking-wider text-[#666] ml-1">Sudbury</span>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">

          {/* Logo mark */}
          <div className="mb-10 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#f0e6d3]/10 border border-[#f0e6d3]/20 flex items-center justify-center mb-5">
              <span className="text-xl font-black tracking-tighter text-[#f0e6d3]">N</span>
            </div>
            <h1 className="text-2xl font-semibold text-white mb-2">
              Welcome to NODE
            </h1>
            <p className="text-sm text-[#888] leading-relaxed max-w-xs">
              Northern Ontario's developer community. Sign in to access your member dashboard.
            </p>
          </div>

          {/* Sign-in card */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
            <button
              onClick={handleSignIn}
              disabled={signingIn}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 active:bg-gray-100 text-[#3c4043] font-medium text-sm rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {signingIn ? (
                <div className="w-4 h-4 rounded-full border-2 border-[#3c4043] border-t-transparent animate-spin" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 6.294C4.672 4.167 6.656 3.58 9 3.58z"/>
                </svg>
              )}
              {signingIn ? 'Redirecting...' : 'Continue with Google'}
            </button>

            <p className="mt-4 text-xs text-center text-[#555] leading-relaxed">
              By signing in you agree to share your Google profile with NODE Sudbury.
              Only NODE members can access the dashboard.
            </p>
          </div>

          {/* Footer note */}
          <p className="mt-6 text-center text-xs text-[#444]">
            Not a member yet?{' '}
            <a href="https://nodesudbury.com" className="text-[#f0e6d3]/60 hover:text-[#f0e6d3] underline underline-offset-2 transition-colors">
              Learn about NODE
            </a>
          </p>
        </div>
      </main>

      {/* Bottom */}
      <footer className="px-8 py-5 flex items-center justify-between">
        <span className="text-xs text-[#333]">Northern Ontario Dev Exchange</span>
        <span className="text-xs text-[#333]">Sudbury, ON</span>
      </footer>
    </div>
  )
}
