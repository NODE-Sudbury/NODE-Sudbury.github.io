'use client'

import { useState } from 'react'

export default function ConsentActions({ token }: { token: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'confirmed' | 'declined' | 'error'>('idle')

  async function act(action: 'confirm' | 'decline') {
    setStatus('loading')
    const endpoint = action === 'confirm'
      ? `/api/consent/confirm/${token}`
      : `/api/consent/decline/${token}`
    const res = await fetch(endpoint, { method: 'PATCH' })
    setStatus(res.ok ? (action === 'confirm' ? 'confirmed' : 'declined') : 'error')
  }

  if (status === 'confirmed') {
    return (
      <div className="text-center">
        <div className="text-4xl mb-3">✅</div>
        <p className="text-green-400 font-semibold">Consent confirmed!</p>
        <p className="text-gray-400 text-sm mt-1">The registration is now confirmed. Thank you.</p>
      </div>
    )
  }

  if (status === 'declined') {
    return (
      <div className="text-center">
        <div className="text-4xl mb-3">❌</div>
        <p className="text-red-400 font-semibold">Consent declined.</p>
        <p className="text-gray-400 text-sm mt-1">The registration has been cancelled.</p>
      </div>
    )
  }

  if (status === 'error') {
    return <p className="text-red-400 text-center text-sm">Something went wrong. Please try again or contact us.</p>
  }

  return (
    <div className="flex gap-3">
      <button
        onClick={() => act('decline')}
        disabled={status === 'loading'}
        className="flex-1 py-3 rounded-xl border border-red-500/40 text-red-400 hover:bg-red-500/10 font-semibold transition disabled:opacity-50"
      >
        Decline
      </button>
      <button
        onClick={() => act('confirm')}
        disabled={status === 'loading'}
        className="flex-1 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-bold transition disabled:opacity-50"
      >
        {status === 'loading' ? 'Processing...' : 'Confirm Consent'}
      </button>
    </div>
  )
}
