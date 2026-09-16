'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type QuizQuestion = { id: string; question_text: string; sort_order: number }
type Template = { id: string; name: string; description: string | null; created_at: string; quiz_questions: QuizQuestion[] }

const OPTION_LABELS = ['A', 'B', 'C', 'D']

export default function QuizTemplateAdmin({ templates: initial }: { templates: Template[] }) {
  const router = useRouter()
  const [templates, setTemplates] = useState(initial)
  const [selectedId, setSelectedId] = useState<string | null>(templates[0]?.id ?? null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [addingQ, setAddingQ] = useState(false)
  const [qText, setQText] = useState('')
  const [options, setOptions] = useState(['', '', '', ''])
  const [correctIdx, setCorrectIdx] = useState(0)
  const [pointsValue, setPointsValue] = useState(100)
  const [timeLimit, setTimeLimit] = useState(30)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const selected = templates.find(t => t.id === selectedId) ?? null

  const createTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setSaving(true)
    const res = await fetch('/api/admin/quiz/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, description: newDesc || null }),
    })
    setSaving(false)
    if (res.ok) {
      const t = await res.json()
      setTemplates(prev => [{ ...t, quiz_questions: [] }, ...prev])
      setSelectedId(t.id)
      setCreating(false)
      setNewName('')
      setNewDesc('')
    } else {
      const d = await res.json()
      setError(d.error)
    }
  }

  const addQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedId || !qText.trim() || options.some(o => !o.trim())) return
    setSaving(true)
    const res = await fetch(`/api/admin/quiz/templates/${selectedId}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question_text: qText,
        options,
        correct_option_index: correctIdx,
        points_value: pointsValue,
        time_limit_seconds: timeLimit,
        sort_order: selected?.quiz_questions.length ?? 0,
      }),
    })
    setSaving(false)
    if (res.ok) {
      const q = await res.json()
      setTemplates(prev => prev.map(t =>
        t.id === selectedId ? { ...t, quiz_questions: [...t.quiz_questions, q] } : t
      ))
      setAddingQ(false)
      setQText('')
      setOptions(['', '', '', ''])
      setCorrectIdx(0)
      setPointsValue(100)
      setTimeLimit(30)
      router.refresh()
    } else {
      const d = await res.json()
      setError(d.error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white">Quiz Templates</h1>
          <div className="flex gap-3">
            <button
              onClick={() => setCreating(true)}
              className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              New Template
            </button>
            {selectedId && (
              <a href="/quiz/new" className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
                Start Room
              </a>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-600 rounded-xl px-4 py-3 mb-6 text-red-300 text-sm">
            {error}
            <button onClick={() => setError('')} className="ml-4 text-red-400 underline text-xs">dismiss</button>
          </div>
        )}

        {creating && (
          <form onSubmit={createTemplate} className="bg-gray-800 rounded-xl p-6 mb-6 space-y-4">
            <h2 className="text-white font-semibold">New Template</h2>
            <input
              type="text"
              placeholder="Template name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-violet-500"
              autoFocus
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-violet-500"
            />
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm">
                Create
              </button>
              <button type="button" onClick={() => setCreating(false)} className="text-gray-400 hover:text-white text-sm px-4 py-2">
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-1 space-y-2">
            {templates.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`w-full text-left p-4 rounded-xl border transition-colors ${
                  selectedId === t.id ? 'bg-violet-900/40 border-violet-600' : 'bg-gray-800 border-gray-700 hover:border-gray-500'
                }`}
              >
                <p className="text-white font-medium">{t.name}</p>
                <p className="text-gray-400 text-xs mt-1">{t.quiz_questions.length} questions</p>
              </button>
            ))}
          </div>

          <div className="col-span-2">
            {selected ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white text-lg font-semibold">{selected.name}</h2>
                  <button
                    onClick={() => setAddingQ(true)}
                    className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-3 py-1.5 rounded-lg"
                  >
                    + Add Question
                  </button>
                </div>

                {selected.description && (
                  <p className="text-gray-400 text-sm mb-4">{selected.description}</p>
                )}

                <div className="space-y-3">
                  {selected.quiz_questions.sort((a, b) => a.sort_order - b.sort_order).map((q, i) => (
                    <div key={q.id} className="bg-gray-800 rounded-xl p-4">
                      <p className="text-gray-400 text-xs mb-1">Q{i + 1}</p>
                      <p className="text-white">{q.question_text}</p>
                    </div>
                  ))}
                  {selected.quiz_questions.length === 0 && (
                    <div className="bg-gray-800 rounded-xl p-8 text-center text-gray-500">
                      No questions yet. Add your first question.
                    </div>
                  )}
                </div>

                {addingQ && (
                  <form onSubmit={addQuestion} className="mt-6 bg-gray-800 rounded-xl p-6 space-y-4">
                    <h3 className="text-white font-medium">Add Question</h3>
                    <textarea
                      placeholder="Question text"
                      value={qText}
                      onChange={e => setQText(e.target.value)}
                      rows={2}
                      className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-violet-500 resize-none"
                    />
                    <div className="space-y-2">
                      {options.map((opt, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setCorrectIdx(i)}
                            className={`w-8 h-8 rounded-full font-bold text-sm flex-shrink-0 ${
                              correctIdx === i ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
                            }`}
                          >
                            {OPTION_LABELS[i]}
                          </button>
                          <input
                            type="text"
                            placeholder={`Option ${OPTION_LABELS[i]}`}
                            value={opt}
                            onChange={e => setOptions(prev => prev.map((o, j) => j === i ? e.target.value : o))}
                            className="flex-1 bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-gray-500 text-xs">Click the letter to mark correct answer</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-gray-400 text-xs block mb-1">Points</label>
                        <input
                          type="number"
                          value={pointsValue}
                          onChange={e => setPointsValue(Number(e.target.value))}
                          min={10}
                          step={10}
                          className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 text-xs block mb-1">Time limit (seconds)</label>
                        <input
                          type="number"
                          value={timeLimit}
                          onChange={e => setTimeLimit(Number(e.target.value))}
                          min={5}
                          max={120}
                          className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button type="submit" disabled={saving} className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm">
                        {saving ? 'Adding...' : 'Add Question'}
                      </button>
                      <button type="button" onClick={() => setAddingQ(false)} className="text-gray-400 hover:text-white text-sm px-4 py-2">
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <div className="bg-gray-800 rounded-xl p-8 text-center text-gray-500">
                Select a template to manage its questions
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
