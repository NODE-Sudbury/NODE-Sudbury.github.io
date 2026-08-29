'use client'

import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'

export default function SSOTest() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [session, setSession] = useState<any>(null)
  const [member, setMember] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) fetchMember(data.session.user.id)
      else setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchMember(session.user.id)
      else { setMember(null); setLoading(false) }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function fetchMember(userId: string) {
    const { data } = await supabase.from('members').select('*').eq('id', userId).single()
    setMember(data)
    setLoading(false)
  }

  async function handleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/auth/test` },
    })
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    setSession(null)
    setMember(null)
  }

  const box: React.CSSProperties = {
    background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px',
    padding: '16px', marginTop: '16px', fontFamily: 'monospace', fontSize: '13px',
    whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#e0e0e0',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', padding: '40px 24px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>SSO Test Page</h1>
        <p style={{ color: '#888', marginBottom: '32px' }}>NODE Sudbury - Google Sign-In verification</p>

        {loading ? (
          <p style={{ color: '#888' }}>Loading session...</p>
        ) : !session ? (
          <div>
            <p style={{ marginBottom: '16px', color: '#aaa' }}>Not signed in.</p>
            <button
              onClick={handleSignIn}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '12px 24px', border: '1px solid #dadce0', borderRadius: '6px',
                background: '#fff', color: '#3c4043', fontSize: '15px', fontWeight: 500, cursor: 'pointer',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 6.294C4.672 4.167 6.656 3.58 9 3.58z"/>
              </svg>
              Sign in with Google
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              {session.user.user_metadata?.avatar_url && (
                <img src={session.user.user_metadata.avatar_url} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
              )}
              <div>
                <p style={{ fontWeight: 600 }}>{session.user.user_metadata?.full_name ?? session.user.email}</p>
                <p style={{ color: '#888', fontSize: '13px' }}>{session.user.email}</p>
              </div>
            </div>

            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>auth.users</h2>
            <div style={box}>{JSON.stringify({ id: session.user.id, email: session.user.email, provider: session.user.app_metadata?.provider }, null, 2)}</div>

            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '24px', marginBottom: '4px' }}>members table</h2>
            <div style={box}>{member ? JSON.stringify(member, null, 2) : 'No member row found - check handle_new_user trigger'}</div>

            <button onClick={handleSignOut} style={{ marginTop: '32px', padding: '10px 20px', border: '1px solid #444', borderRadius: '6px', background: 'transparent', color: '#fff', fontSize: '14px', cursor: 'pointer' }}>
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
