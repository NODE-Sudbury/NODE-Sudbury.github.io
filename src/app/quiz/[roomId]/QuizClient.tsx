'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'

type Question = {
  id: string
  question_text: string
  options: string[]
  correct_option_index: number
  points_value: number
  time_limit_seconds: number
  sort_order: number
}

type Room = {
  id: string
  status: string
  current_question_index: number
  join_code: string
  created_by: string
}

type Participant = { id: string; total_score: number; rank: number | null } | null

type Answer = {
  question_id: string
  selected_option_index: number
  is_correct: boolean
  points_earned: number
}

type Props = {
  room: Room
  questions: Question[]
  participant: Participant
  answers: Answer[]
  role: 'host' | 'participant'
  memberId: string
  memberName: string
  templateName: string
}

type LeaderboardEntry = { member_id: string; full_name: string; total_score: number; rank: number }

type QuizState =
  | { phase: 'lobby'; participantCount: number }
  | { phase: 'question'; question: Question; index: number; total: number; timeLeft: number; answerCount: number }
  | { phase: 'answered'; question: Question; result: { is_correct: boolean; points_earned: number; correct_option_index: number }; timeLeft: number; answerCount: number }
  | { phase: 'question_end'; question: Question; correct_option_index: number }
  | { phase: 'finished'; leaderboard: LeaderboardEntry[]; myScore: number; myRank: number | null }

const COLORS = [
  'bg-red-600 hover:bg-red-500',
  'bg-blue-600 hover:bg-blue-500',
  'bg-green-600 hover:bg-green-500',
  'bg-yellow-500 hover:bg-yellow-400',
]

export default function QuizClient({ room, questions, participant, answers, role, memberId, memberName, templateName }: Props) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [state, setState] = useState<QuizState>({
    phase: room.status === 'finished' ? 'finished' : 'lobby',
    ...(room.status === 'finished' ? { leaderboard: [], myScore: participant?.total_score ?? 0, myRank: participant?.rank ?? null } : { participantCount: 1 }),
  } as QuizState)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const currentQuestionRef = useRef<Question | null>(null)

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const startTimer = useCallback((seconds: number, onTick: (t: number) => void, onEnd: () => void) => {
    clearTimer()
    let t = seconds
    timerRef.current = setInterval(() => {
      t--
      onTick(t)
      if (t <= 0) {
        clearTimer()
        onEnd()
      }
    }, 1000)
  }, [])

  const fetchLeaderboard = useCallback(async () => {
    const { data } = await supabase
      .from('quiz_participants')
      .select('member_id, total_score, rank, members(full_name)')
      .eq('room_id', room.id)
      .order('total_score', { ascending: false })

    const lb = (data ?? []).map((p: { member_id: string; total_score: number; rank: number | null; members: { full_name: string }[] | null }, i: number) => ({
      member_id: p.member_id,
      full_name: (Array.isArray(p.members) ? p.members[0]?.full_name : (p.members as { full_name: string } | null)?.full_name) ?? 'Player',
      total_score: p.total_score ?? 0,
      rank: i + 1,
    }))

    const myEntry = lb.find(e => e.member_id === memberId)
    setState({
      phase: 'finished',
      leaderboard: lb,
      myScore: myEntry?.total_score ?? 0,
      myRank: myEntry?.rank ?? null,
    })
  }, [supabase, room.id, memberId])

  useEffect(() => {
    if (room.status === 'finished') {
      fetchLeaderboard()
      return
    }

    const channel = supabase.channel(`quiz-room-${room.id}`)
    channelRef.current = channel

    channel
      .on('broadcast', { event: 'question' }, ({ payload }) => {
        clearTimer()
        const q: Question = payload.question
        currentQuestionRef.current = q
        const limit = q.time_limit_seconds ?? 30
        setState({ phase: 'question', question: q, index: payload.index, total: payload.total, timeLeft: limit, answerCount: 0 })
        if (role === 'host') {
          startTimer(limit, t => {
            setState(prev => prev.phase === 'question' ? { ...prev, timeLeft: t } : prev)
          }, () => {
            channel.send({ type: 'broadcast', event: 'question_end', payload: { question_id: q.id, correct_option_index: q.correct_option_index } })
            setState(prev => prev.phase === 'question' ? { phase: 'question_end', question: q, correct_option_index: q.correct_option_index } : prev)
          })
        }
      })
      .on('broadcast', { event: 'answer_count' }, ({ payload }) => {
        setState(prev => (prev.phase === 'question' || prev.phase === 'answered') ? { ...prev, answerCount: payload.count } : prev)
      })
      .on('broadcast', { event: 'question_end' }, ({ payload }) => {
        clearTimer()
        setState(prev => {
          const q = currentQuestionRef.current
          if (!q) return prev
          return { phase: 'question_end', question: q, correct_option_index: payload.correct_option_index }
        })
      })
      .on('broadcast', { event: 'finished' }, () => {
        clearTimer()
        fetchLeaderboard()
      })
      .on('broadcast', { event: 'participant_count' }, ({ payload }) => {
        setState(prev => prev.phase === 'lobby' ? { ...prev, participantCount: payload.count } : prev)
      })
      .subscribe()

    if (room.status === 'active' && questions.length > 0) {
      const q = questions[room.current_question_index] ?? questions[0]
      currentQuestionRef.current = q
      setState({ phase: 'question', question: q, index: room.current_question_index, total: questions.length, timeLeft: q.time_limit_seconds ?? 30, answerCount: 0 })
    }

    return () => {
      clearTimer()
      supabase.removeChannel(channel)
    }
  }, [room.id, room.status, role, startTimer, fetchLeaderboard, supabase, questions, room.current_question_index])

  const controlRoom = async (action: 'start' | 'next' | 'end') => {
    await fetch(`/api/quiz/${room.id}/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
  }

  const hostBroadcast = (event: string, payload: object) => {
    channelRef.current?.send({ type: 'broadcast', event, payload })
  }

  const hostStart = async () => {
    await controlRoom('start')
    const q = questions[0]
    if (!q) return
    hostBroadcast('question', { question: q, index: 0, total: questions.length })
  }

  const hostNext = async () => {
    if (state.phase !== 'question_end') return
    const s = state as { phase: 'question_end'; question: Question; correct_option_index: number }
    const currentIdx = questions.findIndex(q => q.id === s.question.id)
    const nextIdx = currentIdx + 1
    if (nextIdx >= questions.length) {
      await controlRoom('end')
      hostBroadcast('finished', {})
      fetchLeaderboard()
    } else {
      await controlRoom('next')
      const q = questions[nextIdx]
      hostBroadcast('question', { question: q, index: nextIdx, total: questions.length })
    }
  }

  const hostEnd = async () => {
    await controlRoom('end')
    hostBroadcast('finished', {})
    fetchLeaderboard()
  }

  const participantAnswer = async (question: Question, optionIdx: number, startTime: number) => {
    const time_taken_ms = Date.now() - startTime
    const res = await fetch('/api/quiz/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_id: room.id, question_id: question.id, selected_option_index: optionIdx, time_taken_ms }),
    })
    if (res.ok) {
      const result = await res.json()
      setState(prev => prev.phase === 'question' ? { phase: 'answered', question, result, timeLeft: prev.timeLeft, answerCount: prev.answerCount } : prev)
    }
  }

  if (state.phase === 'lobby') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md w-full">
          <p className="text-violet-400 text-sm font-semibold uppercase tracking-widest mb-2">{templateName}</p>
          <h1 className="text-4xl font-bold text-white mb-6">Quiz Lobby</h1>
          {role === 'host' ? (
            <>
              <div className="bg-gray-800 rounded-2xl p-8 mb-6">
                <p className="text-gray-400 text-sm mb-2">Join at <span className="text-violet-400">/quiz/join</span></p>
                <p className="text-6xl font-mono font-bold text-white tracking-widest">{room.join_code}</p>
              </div>
              <p className="text-gray-400 mb-6">
                {(state as { participantCount: number }).participantCount} participant{(state as { participantCount: number }).participantCount !== 1 ? 's' : ''} waiting
              </p>
              <button
                onClick={hostStart}
                disabled={questions.length === 0}
                className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl text-xl transition-colors"
              >
                Start Quiz ({questions.length} questions)
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="w-3 h-3 rounded-full bg-violet-400 animate-pulse" />
                <p className="text-gray-300 text-lg">Waiting for host to start...</p>
              </div>
              <p className="text-gray-500 text-sm">You will join as <span className="text-white">{memberName}</span></p>
            </>
          )}
        </div>
      </div>
    )
  }

  if (state.phase === 'question') {
    const s = state
    const questionStartTime = Date.now() - ((s.question.time_limit_seconds - s.timeLeft) * 1000)
    const timerPct = (s.timeLeft / (s.question.time_limit_seconds ?? 30)) * 100
    const timerRed = s.timeLeft <= 10

    return (
      <div className="min-h-screen bg-gray-950 flex flex-col px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <span className="text-gray-400 text-sm">Question {s.index + 1} / {s.total}</span>
          <div className={`text-2xl font-mono font-bold ${timerRed ? 'text-red-400' : 'text-white'}`}>{s.timeLeft}s</div>
          {role === 'host' && <span className="text-gray-400 text-sm">{s.answerCount} answered</span>}
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2 mb-8">
          <div
            className={`h-2 rounded-full transition-all ${timerRed ? 'bg-red-500' : 'bg-violet-500'}`}
            style={{ width: `${timerPct}%` }}
          />
        </div>
        <div className="bg-gray-800 rounded-2xl p-6 mb-8 flex-1 flex items-center justify-center">
          <p className="text-white text-2xl font-semibold text-center">{s.question.question_text}</p>
        </div>
        {role === 'host' ? (
          <div className="grid grid-cols-2 gap-3">
            {s.question.options.map((opt, i) => (
              <div key={i} className={`rounded-xl p-4 ${COLORS[i % COLORS.length].split(' ')[0]} opacity-60`}>
                <p className="text-white font-semibold text-center">{opt}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {s.question.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => participantAnswer(s.question, i, questionStartTime)}
                className={`w-full rounded-xl p-5 text-white font-bold text-lg text-left transition-all ${COLORS[i % COLORS.length]}`}
              >
                <span className="inline-block w-8 h-8 rounded-full bg-black/20 text-center leading-8 mr-3 text-sm">
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
              </button>
            ))}
          </div>
        )}
        {role === 'host' && (
          <button onClick={hostEnd} className="mt-4 text-gray-500 hover:text-red-400 text-sm underline text-center w-full">
            End Quiz
          </button>
        )}
      </div>
    )
  }

  if (state.phase === 'answered') {
    const s = state
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 text-center">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 text-5xl ${s.result.is_correct ? 'bg-green-600' : 'bg-red-600'}`}>
          {s.result.is_correct ? '✓' : '✗'}
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {s.result.is_correct ? 'Correct!' : 'Wrong!'}
        </h2>
        {s.result.is_correct && (
          <p className="text-violet-400 text-lg mb-2">+{s.result.points_earned} points</p>
        )}
        {!s.result.is_correct && (
          <p className="text-gray-400 text-sm mb-2">
            Correct answer: {s.question.options[s.result.correct_option_index]}
          </p>
        )}
        <div className="mt-8 flex items-center gap-2 text-gray-400">
          <div className="w-2 h-2 rounded-full bg-gray-600 animate-pulse" />
          <span className="text-sm">{s.answerCount} answered - waiting for next question...</span>
        </div>
      </div>
    )
  }

  if (state.phase === 'question_end') {
    const s = state
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
        <h2 className="text-xl font-semibold text-white mb-4 text-center">Time&apos;s up!</h2>
        <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md mb-8">
          <p className="text-gray-400 text-sm mb-2 text-center">Question</p>
          <p className="text-white text-lg text-center mb-4">{s.question.question_text}</p>
          <div className="grid grid-cols-1 gap-2">
            {s.question.options.map((opt, i) => (
              <div
                key={i}
                className={`rounded-xl px-4 py-3 text-center font-semibold ${
                  i === s.correct_option_index ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400'
                }`}
              >
                {opt}
              </div>
            ))}
          </div>
        </div>
        {role === 'host' && (
          <button
            onClick={hostNext}
            className="bg-violet-600 hover:bg-violet-500 text-white font-bold py-4 px-10 rounded-xl text-lg transition-colors"
          >
            {questions.findIndex(q => q.id === s.question.id) >= questions.length - 1 ? 'End Quiz' : 'Next Question'}
          </button>
        )}
        {role === 'participant' && (
          <p className="text-gray-400 animate-pulse">Waiting for next question...</p>
        )}
      </div>
    )
  }

  if (state.phase === 'finished') {
    const s = state
    return (
      <div className="min-h-screen bg-gray-950 px-4 py-8">
        <div className="max-w-md mx-auto">
          <h1 className="text-3xl font-bold text-white text-center mb-2">Quiz Complete!</h1>
          <p className="text-violet-400 text-center mb-8">{templateName}</p>
          {role === 'participant' && (
            <div className="bg-gray-800 rounded-2xl p-6 mb-6 text-center">
              <p className="text-gray-400 text-sm mb-1">Your Score</p>
              <p className="text-4xl font-bold text-white">{s.myScore}</p>
              {s.myRank && <p className="text-violet-400 mt-1">Rank #{s.myRank}</p>}
            </div>
          )}
          <div className="space-y-3">
            {s.leaderboard.map((entry, i) => (
              <div
                key={entry.member_id}
                className={`flex items-center gap-4 rounded-xl p-4 ${
                  entry.member_id === memberId ? 'bg-violet-900/40 border border-violet-600' : 'bg-gray-800'
                }`}
              >
                <span className={`text-lg font-bold w-8 text-center ${
                  i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-gray-500'
                }`}>{i + 1}</span>
                <span className="flex-1 text-white font-medium">{entry.full_name}</span>
                <span className="text-violet-400 font-bold">{entry.total_score}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <a href="/events" className="text-gray-400 hover:text-white text-sm underline">
              Back to Events
            </a>
          </div>
        </div>
      </div>
    )
  }

  return null
}
