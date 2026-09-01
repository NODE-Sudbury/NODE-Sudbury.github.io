'use client'

import { useState } from 'react'

const EVENT_TYPES = ['', 'meetup', 'workshop', 'hackathon', 'conference', 'multi_track', 'norcat_series']

export function EmbedGenerator({ appUrl }: { appUrl: string }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [type, setType] = useState('')
  const [limit, setLimit] = useState(5)
  const [copied, setCopied] = useState(false)

  const params = new URLSearchParams({ theme, limit: String(limit) })
  if (type) params.set('type', type)
  const src = `${appUrl}/embed/calendar?${params.toString()}`

  const code = `<iframe\n  src="${src}"\n  width="400"\n  height="500"\n  frameborder="0"\n  style="border-radius:12px"\n></iframe>`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Controls */}
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Theme</label>
          <div className="flex gap-2">
            {(['dark', 'light'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${theme === t ? 'bg-sky-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Event Type</label>
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm"
          >
            <option value="">All types</option>
            {EVENT_TYPES.filter(Boolean).map(t => (
              <option key={t} value={t}>{t.replace('_', ' ')}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Number of events: <span className="text-sky-400">{limit}</span>
          </label>
          <input
            type="range"
            min={1}
            max={10}
            value={limit}
            onChange={e => setLimit(Number(e.target.value))}
            className="w-full accent-sky-400"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1"><span>1</span><span>10</span></div>
        </div>

        {/* Code snippet */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-gray-300">Embed code</label>
            <button
              onClick={handleCopy}
              className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1 rounded-lg transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs text-green-400 overflow-x-auto whitespace-pre-wrap break-all">
            {code}
          </pre>
        </div>
      </div>

      {/* Live preview */}
      <div>
        <p className="text-sm font-semibold text-gray-300 mb-2">Live preview</p>
        <div className="rounded-xl overflow-hidden border border-gray-700">
          <iframe
            key={src}
            src={src}
            width="100%"
            height="500"
            frameBorder="0"
            title="NODE Events Widget Preview"
          />
        </div>
      </div>
    </div>
  )
}
