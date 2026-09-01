'use client'

import { useState } from 'react'

const DIETARY_OPTIONS = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Halal', 'Kosher',
  'Nut Allergy', 'Dairy-Free', 'No Restrictions',
]
const TSHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

interface PreferencesClientProps {
  dietary: string[]
  tshirt: string
  dob?: string | null
}

export default function PreferencesClient({ dietary, tshirt, dob }: PreferencesClientProps) {
  const [selected, setSelected] = useState<string[]>(dietary)
  const [size, setSize] = useState(tshirt)
  const [dateOfBirth, setDateOfBirth] = useState(dob ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggle(opt: string) {
    setSelected(prev => prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt])
  }

  async function save() {
    setSaving(true)
    setError(null)
    const res = await fetch('/api/profile/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dietary_restrictions: selected, tshirt_size: size || null, date_of_birth: dateOfBirth || null }),
    })
    setSaving(false)
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
    else setError('Failed to save. Please try again.')
  }

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-white mb-1">Event Preferences</h1>
      <p className="text-gray-400 text-sm mb-8">
        Your preferences are pre-filled when registering for events that collect this info.
      </p>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-widest mb-3">Dietary Restrictions</h2>
        <div className="flex flex-wrap gap-2">
          {DIETARY_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => toggle(opt)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                selected.includes(opt)
                  ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-widest mb-3">T-Shirt Size</h2>
        <div className="flex gap-2 flex-wrap">
          {TSHIRT_SIZES.map(s => (
            <button
              key={s}
              onClick={() => setSize(prev => prev === s ? '' : s)}
              className={`w-14 py-2 rounded-lg text-sm font-medium border transition-colors ${
                size === s
                  ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-widest mb-1">Date of Birth</h2>
        <p className="text-gray-500 text-xs mb-3">Used to determine if parental consent is required for events with age restrictions.</p>
        <input
          type="date"
          value={dateOfBirth}
          onChange={e => setDateOfBirth(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
        />
      </section>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <button
        onClick={save}
        disabled={saving}
        className="px-6 py-2.5 bg-sky-500 hover:bg-sky-400 text-black font-semibold rounded-lg text-sm transition-colors disabled:opacity-50"
      >
        {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Preferences'}
      </button>
    </div>
  )
}
