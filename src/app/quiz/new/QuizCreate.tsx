'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Template = { id: string; name: string; description: string | null }
type Event = { id: string; title: string }

export default function QuizCreate({ templates, events }: { templates: Template[]; events: Event[] }) {
  const router = useRouter()
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '')
  const [eventId, setEventId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!templateId) return
    setLoading(true)
    setError('')

    const res = await fetch('/api/quiz/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_id: templateId, event_id: eventId || undefined }),
    })

    if (res.ok) {
      const room = await res.json()
      router.push(`/quiz/${room.id}`)
    } else {
      const data = await res.json()
      setError(data.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-12">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Create Quiz Room</h1>
        <p className="text-gray-400 mb-8">Start a live quiz session from a template</p>
        {templates.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-6 text-center">
            <p className="text-gray-400 mb-4">No quiz templates yet.</p>
            <a href="/admin/quiz" className="text-violet-400 hover:underline">Create a template first</a>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Template</label>
              <select
                value={templateId}
                onChange={e => setTemplateId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-violet-500"
              >
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Link to Event (optional)</label>
              <select
                value={eventId}
                onChange={e => setEventId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-violet-500"
              >
                <option value="">No event</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.title}</option>
                ))}
              </select>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-colors"
            >
              {loading ? 'Creating...' : 'Create Room'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
