'use client'

import { useEffect, useState } from 'react'

const TSHIRT_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

interface LogisticsData {
  meal_notes: string | null
  collect_dietary: boolean
  collect_tshirt_size: boolean
  collect_accessibility: boolean
  dietary_count: Record<string, number>
  tshirt_count: Record<string, number>
  accessibility_list: string[]
  total_confirmed: number
}

export default function LogisticsAdmin({ eventId }: { eventId: string }) {
  const [data, setData] = useState<LogisticsData | null>(null)
  const [mealNotes, setMealNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/events/${eventId}/logistics`)
      .then(r => r.json())
      .then((d: LogisticsData) => { setData(d); setMealNotes(d.meal_notes ?? '') })
  }, [eventId])

  async function saveMealNotes() {
    setSaving(true)
    await fetch(`/api/admin/events/${eventId}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meal_notes: mealNotes }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!data) return <div className="p-6 text-gray-400">Loading...</div>

  const dietaryEntries = Object.entries(data.dietary_count ?? {}).sort((a, b) => b[1] - a[1])
  const maxDietary = Math.max(...dietaryEntries.map(e => e[1]), 1)
  const tshirtEntries = TSHIRT_ORDER.map(s => [s, (data.tshirt_count ?? {})[s] ?? 0] as [string, number]).filter(e => e[1] > 0)
  const maxTshirt = Math.max(...tshirtEntries.map(e => e[1]), 1)

  return (
    <div className="p-6 max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-bold text-white mb-1">Logistics</h1>
        <p className="text-gray-400 text-sm">{data.total_confirmed} confirmed attendees</p>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-widest mb-3">Meal Notes</h2>
        <textarea
          value={mealNotes}
          onChange={e => setMealNotes(e.target.value)}
          placeholder="e.g. Pizza provided by NORCAT, coffee station near entrance"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 resize-none h-24 focus:outline-none focus:border-sky-500"
        />
        <button
          onClick={saveMealNotes}
          disabled={saving}
          className="mt-2 px-4 py-1.5 bg-sky-500 hover:bg-sky-400 text-black text-sm font-semibold rounded-lg disabled:opacity-50"
        >
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Notes'}
        </button>
      </section>

      {data.collect_dietary && (
        <section>
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-widest mb-3">Dietary Restrictions</h2>
          {dietaryEntries.length === 0 ? (
            <p className="text-gray-500 text-sm">No responses yet.</p>
          ) : (
            <div className="space-y-2">
              {dietaryEntries.map(([label, count]) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-sm text-gray-300 w-32 shrink-0">{label}</span>
                  <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-500 rounded-full" style={{ width: `${(count / maxDietary) * 100}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-white w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {data.collect_tshirt_size && (
        <section>
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-widest mb-3">T-Shirt Sizes</h2>
          {tshirtEntries.length === 0 ? (
            <p className="text-gray-500 text-sm">No responses yet.</p>
          ) : (
            <div className="space-y-2">
              {tshirtEntries.map(([size, count]) => (
                <div key={size} className="flex items-center gap-3">
                  <span className="text-sm text-gray-300 w-12 shrink-0">{size}</span>
                  <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full" style={{ width: `${(count / maxTshirt) * 100}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-white w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {data.collect_accessibility && (data.accessibility_list ?? []).length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-widest mb-3">Accessibility Needs</h2>
          <ul className="space-y-1">
            {(data.accessibility_list ?? []).map((note, i) => (
              <li key={i} className="text-sm text-gray-300 bg-gray-800 rounded-lg px-3 py-2">{note}</li>
            ))}
          </ul>
        </section>
      )}

      <a
        href={`/api/admin/events/${eventId}/logistics/export`}
        className="inline-block px-4 py-2 bg-gray-700 hover:bg-gray-600 text-sm text-white rounded-lg"
      >
        Export CSV
      </a>
    </div>
  )
}
