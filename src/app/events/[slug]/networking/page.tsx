'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Partner {
  member_id: string;
  partner_id: string;
  partner_name: string;
  partner_title: string | null;
  partner_company: string | null;
  table_number: number;
  round: number;
}

interface TopicSignup {
  name: string;
}

interface TopicTable {
  id: string;
  topic: string;
  signups: TopicSignup[];
}

interface NetworkingData {
  pairs: Partner[];
  topic_tables: TopicTable[];
  current_round: number;
  round_ends_at: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ICEBREAKERS = [
  'What project are you most excited about right now?',
  'Describe your work in one sentence.',
  'What is one technology you want to learn this year?',
  'What is the best piece of career advice you have ever received?',
  'What problem do you wish someone would just solve?',
  'What does your ideal workday look like?',
  'What is a side project you are proud of?',
  'If you could automate one thing in your life, what would it be?',
  'What community or open-source project has shaped you the most?',
  'What brought you to this event today?',
];

const DEFAULT_ROUND_DURATION_SECONDS = 5 * 60; // 5 minutes

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(seconds: number): string {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.max(0, seconds) % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getIcebreaker(round: number): string {
  return ICEBREAKERS[(round - 1) % ICEBREAKERS.length];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SpeedNetworkingPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [data, setData] = useState<NetworkingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Timer state
  const [secondsLeft, setSecondsLeft] = useState<number>(DEFAULT_ROUND_DURATION_SECONDS);
  const [timerRunning, setTimerRunning] = useState(false);
  const [roundDuration, setRoundDuration] = useState(DEFAULT_ROUND_DURATION_SECONDS);
  const [totalRounds, setTotalRounds] = useState(5);
  const [localRound, setLocalRound] = useState(1);

  // UI state
  const [joiningTable, setJoiningTable] = useState<string | null>(null);
  const [joinedTables, setJoinedTables] = useState<Set<string>>(new Set());
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [tab, setTab] = useState<'pair' | 'tables'>('pair');
  const [roundAdvanced, setRoundAdvanced] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---------------------------------------------------------------------------
  // Online / offline detection
  // ---------------------------------------------------------------------------

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Data fetch
  // ---------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    if (!slug) return;
    try {
      const res = await fetch(`/api/events/${slug}/networking`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setFetchError(d.error ?? 'Failed to load networking data.');
        setLoading(false);
        return;
      }
      const d: NetworkingData = await res.json();
      setData(d);
      setLocalRound(d.current_round ?? 1);

      // Sync timer with server round_ends_at if available
      if (d.round_ends_at) {
        const endsAt = new Date(d.round_ends_at).getTime();
        const now = Date.now();
        const diff = Math.floor((endsAt - now) / 1000);
        setSecondsLeft(diff > 0 ? diff : 0);
        setTimerRunning(diff > 0);
      }
    } catch {
      setFetchError('Network error - could not load data.');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---------------------------------------------------------------------------
  // Countdown timer
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!timerRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setTimerRunning(false);
          setRoundAdvanced(true);
          // Auto-advance local round if not at max
          setLocalRound(r => {
            if (r < totalRounds) return r + 1;
            return r;
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning, totalRounds]);

  // ---------------------------------------------------------------------------
  // Timer controls
  // ---------------------------------------------------------------------------

  const startTimer = () => {
    setSecondsLeft(roundDuration);
    setTimerRunning(true);
    setRoundAdvanced(false);
  };

  const pauseTimer = () => setTimerRunning(false);

  const resetTimer = () => {
    setTimerRunning(false);
    setSecondsLeft(roundDuration);
    setRoundAdvanced(false);
  };

  const nextRound = () => {
    setLocalRound(r => Math.min(r + 1, totalRounds));
    setSecondsLeft(roundDuration);
    setTimerRunning(false);
    setRoundAdvanced(false);
  };

  // ---------------------------------------------------------------------------
  // Join table
  // ---------------------------------------------------------------------------

  const joinTable = async (tableId: string) => {
    setJoiningTable(tableId);
    setJoinError(null);
    try {
      const res = await fetch(`/api/events/${slug}/networking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join_table', table_id: tableId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setJoinError(d.error ?? 'Could not join table.');
      } else {
        setJoinedTables(prev => new Set(prev).add(tableId));
        // Refresh data to get updated signups
        await fetchData();
      }
    } catch {
      setJoinError('Network error.');
    } finally {
      setJoiningTable(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const activeRound = data?.current_round ?? localRound;
  const currentPair = data?.pairs?.find(p => p.round === activeRound) ?? data?.pairs?.[0] ?? null;
  const icebreaker = getIcebreaker(activeRound);
  const progress = roundDuration > 0 ? ((roundDuration - secondsLeft) / roundDuration) * 100 : 0;

  const isTimerCritical = secondsLeft <= 30 && secondsLeft > 0;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">

      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-amber-600 text-amber-950 text-sm font-semibold text-center py-2 px-4">
          You are offline. Some features may not be available.
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">Speed Networking</h1>
          <p className="text-gray-400 text-sm">Meet fellow members, one round at a time.</p>
        </div>

        {/* Loading / error states */}
        {loading && (
          <div className="flex items-center gap-3 text-gray-400 py-12 justify-center">
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading networking session...
          </div>
        )}

        {fetchError && !loading && (
          <div className="p-4 bg-red-900/40 border border-red-700 rounded-xl text-red-300 text-sm mb-6">
            {fetchError}
          </div>
        )}

        {!loading && !fetchError && (
          <>
            {/* Round info + timer card */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Round</span>
                  <p className="text-2xl font-bold text-white">
                    {activeRound} <span className="text-gray-500 font-normal text-lg">/ {totalRounds}</span>
                  </p>
                </div>

                {/* Big timer display */}
                <div className={`text-5xl font-mono font-bold tabular-nums transition-colors ${
                  isTimerCritical ? 'text-red-400' : secondsLeft === 0 ? 'text-gray-600' : 'text-sky-400'
                }`}>
                  {formatTime(secondsLeft)}
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mb-4">
                <div
                  className={`h-2 rounded-full transition-all duration-1000 ${isTimerCritical ? 'bg-red-500' : 'bg-sky-500'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>

              {roundAdvanced && (
                <div className="mb-4 p-3 bg-green-900/40 border border-green-700 rounded-lg text-green-300 text-sm text-center">
                  Time is up! Round {activeRound} complete.
                  {localRound < totalRounds ? ' Advance to the next round when ready.' : ' All rounds complete - great networking!'}
                </div>
              )}

              {/* Timer controls */}
              <div className="flex flex-wrap gap-2">
                {!timerRunning ? (
                  <button onClick={startTimer}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold rounded-lg transition-colors">
                    {secondsLeft === 0 || roundAdvanced ? 'Restart Timer' : 'Start Timer'}
                  </button>
                ) : (
                  <button onClick={pauseTimer}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-lg transition-colors">
                    Pause
                  </button>
                )}
                <button onClick={resetTimer}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-semibold rounded-lg transition-colors">
                  Reset
                </button>
                {localRound < totalRounds && (
                  <button onClick={nextRound}
                    className="px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white text-sm font-semibold rounded-lg transition-colors">
                    Next Round
                  </button>
                )}
              </div>

              {/* Organizer settings */}
              <details className="mt-4">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300 transition-colors select-none">
                  Organizer settings
                </summary>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs text-gray-400 block mb-1">Rounds</span>
                    <input
                      type="number" min={1} max={20} value={totalRounds}
                      onChange={e => setTotalRounds(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-sky-500"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-400 block mb-1">Minutes per round</span>
                    <input
                      type="number" min={1} max={60}
                      value={Math.round(roundDuration / 60)}
                      onChange={e => {
                        const secs = Math.max(1, Number(e.target.value)) * 60;
                        setRoundDuration(secs);
                        setSecondsLeft(secs);
                        setTimerRunning(false);
                      }}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-sky-500"
                    />
                  </label>
                </div>
              </details>
            </div>

            {/* Icebreaker prompt */}
            <div className="bg-indigo-950 border border-indigo-800 rounded-2xl p-5 mb-6">
              <p className="text-xs text-indigo-400 uppercase tracking-wider font-semibold mb-2">Icebreaker - Round {activeRound}</p>
              <p className="text-white text-lg font-medium leading-snug">{icebreaker}</p>
            </div>

            {/* Tabs: My Pair / Topic Tables */}
            <div className="flex gap-0 mb-6 bg-gray-900 border border-gray-800 rounded-xl p-1">
              {(['pair', 'tables'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                    tab === t
                      ? 'bg-sky-600 text-white'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}>
                  {t === 'pair' ? 'My Pair' : 'Topic Tables'}
                </button>
              ))}
            </div>

            {/* My Pair tab */}
            {tab === 'pair' && (
              <div>
                {!currentPair ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 text-base">No pair assigned yet.</p>
                    <p className="text-gray-600 text-sm mt-1">Check back once the organizer assigns pairs.</p>
                  </div>
                ) : (
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">Your partner this round</p>

                    <div className="flex items-start gap-4">
                      {/* Avatar placeholder */}
                      <div className="flex-shrink-0 w-14 h-14 rounded-full bg-sky-900 flex items-center justify-center text-sky-300 text-xl font-bold select-none">
                        {currentPair.partner_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-xl font-bold leading-tight">{currentPair.partner_name}</p>
                        {currentPair.partner_title && (
                          <p className="text-sky-400 text-sm mt-0.5">{currentPair.partner_title}</p>
                        )}
                        {currentPair.partner_company && (
                          <p className="text-gray-400 text-sm">{currentPair.partner_company}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-gray-800 flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="text-gray-300 text-sm">
                        Meet at <span className="font-semibold text-white">Table {currentPair.table_number}</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Topic Tables tab */}
            {tab === 'tables' && (
              <div>
                {joinError && (
                  <div className="mb-4 p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">
                    {joinError}{' '}
                    <button onClick={() => setJoinError(null)} className="underline">dismiss</button>
                  </div>
                )}

                {(!data?.topic_tables || data.topic_tables.length === 0) ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No topic tables set up yet.</p>
                    <p className="text-gray-600 text-sm mt-1">The organizer can add topic tables from the admin panel.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {data.topic_tables.map(table => {
                      const joined = joinedTables.has(table.id);
                      const isJoining = joiningTable === table.id;
                      return (
                        <div key={table.id}
                          className={`bg-gray-900 border rounded-2xl p-5 transition-colors ${joined ? 'border-sky-700' : 'border-gray-800'}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="text-white font-semibold text-base leading-snug">{table.topic}</h3>
                              {table.signups.length > 0 ? (
                                <p className="text-gray-500 text-xs mt-1">
                                  {table.signups.length} signed up
                                  {table.signups.length <= 4
                                    ? ': ' + table.signups.map(s => s.name).join(', ')
                                    : ': ' + table.signups.slice(0, 3).map(s => s.name).join(', ') + ` + ${table.signups.length - 3} more`}
                                </p>
                              ) : (
                                <p className="text-gray-600 text-xs mt-1">No one signed up yet - be first!</p>
                              )}
                            </div>
                            <button
                              onClick={() => !joined && joinTable(table.id)}
                              disabled={joined || isJoining}
                              className={`flex-shrink-0 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                                joined
                                  ? 'bg-sky-900 text-sky-300 cursor-default'
                                  : isJoining
                                    ? 'bg-gray-700 text-gray-400 cursor-wait'
                                    : 'bg-sky-600 hover:bg-sky-500 text-white'
                              }`}>
                              {joined ? 'Joined' : isJoining ? 'Joining...' : 'Join this table'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
