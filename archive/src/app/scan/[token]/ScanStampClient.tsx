'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Props {
  token: string
  station: { id: string; name: string; hint_text: string | null; points_value: number }
  hunt: { id: string; title: string }
  existingStamp: { id: string; stamped_at: string } | null
}

export default function ScanStampClient({ token, station, hunt, existingStamp }: Props) {
  const [stamp, setStamp] = useState(existingStamp)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function collect() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/scan/stamp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.')
      } else {
        setStamp({ id: data.stamp_id, stamped_at: new Date().toISOString() })
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (stamp) {
    return (
      <div className="min-h-screen bg-[#0b0e14] text-[#c9d1e8] flex items-center justify-center p-6">
        <div className="max-w-sm w-full">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-xl font-semibold text-white mb-1">Stamp Collected!</h1>
            <p className="text-sm text-[#5a6278]">{station.name}</p>
          </div>
          <div className="bg-[#13161f] border border-[#9ece6a]/20 rounded-xl p-6 text-center space-y-3">
            <p className="text-2xl font-bold text-[#9ece6a]">+{station.points_value} pts</p>
            <p className="text-xs text-[#5a6278]">
              Collected {new Date(stamp.stamped_at).toLocaleString('en-CA', { timeZone: 'America/Toronto', dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          </div>
          <div className="mt-6 text-center">
            <Link href={`/hunt/${hunt.id}`} className="text-sm text-[#7aa2f7] hover:underline">
              View hunt progress
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0b0e14] text-[#c9d1e8] flex items-center justify-center p-6">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">📍</div>
          <h1 className="text-xl font-semibold text-white mb-1">{station.name}</h1>
          <p className="text-sm text-[#5a6278]">{hunt.title}</p>
        </div>

        <div className="bg-[#13161f] border border-[#252b3a] rounded-xl p-6 space-y-4">
          <div className="text-center">
            <p className="text-sm text-[#8892a4] mb-1">Points for this station</p>
            <p className="text-3xl font-bold text-[#f0e6d3]">{station.points_value}</p>
          </div>

          {station.hint_text && (
            <div className="pt-2 border-t border-[#252b3a]">
              <p className="text-xs text-[#5a6278] text-center italic">{station.hint_text}</p>
            </div>
          )}

          {error && (
            <p className="text-xs text-[#f7768e] text-center">{error}</p>
          )}

          <button
            onClick={collect}
            disabled={loading}
            className="w-full py-3 rounded-lg bg-[#f0e6d3] text-[#0b0e14] text-sm font-semibold hover:bg-[#e8ddc8] transition-colors disabled:opacity-50"
          >
            {loading ? 'Collecting...' : 'Collect Stamp'}
          </button>
        </div>

        <div className="mt-6 text-center">
          <Link href={`/hunt/${hunt.id}`} className="text-sm text-[#5a6278] hover:text-[#c9d1e8]">
            View hunt progress
          </Link>
        </div>
      </div>
    </div>
  )
}
