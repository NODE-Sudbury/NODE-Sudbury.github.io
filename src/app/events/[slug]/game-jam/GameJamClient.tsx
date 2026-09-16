'use client';

import { useState, useEffect, useCallback } from 'react';

const CATEGORIES = [
  'Best Art',
  'Best Gameplay',
  'Best Audio',
  'Most Creative',
  'Best Solo',
];

interface Theme {
  id: string;
  theme: string;
  revealed_at: string;
}

interface Entry {
  id: string;
  title: string;
  description: string | null;
  play_url: string | null;
  repo_url: string | null;
  screenshot_url: string | null;
  categories: string[];
  member_id: string;
  voteCounts: Record<string, number>;
}

interface Props {
  event: { id: string; title: string; slug: string; starts_at: string; ends_at: string | null };
  activeTheme: Theme | null;
  entries: Entry[];
  myEntry: Omit<Entry, 'voteCounts' | 'member_id'> | null;
  userVotes: { entry_id: string; category: string }[];
  isAuthenticated: boolean;
  userId: string | null;
}

function Countdown({ target }: { target: string }) {
  const [diff, setDiff] = useState(new Date(target).getTime() - Date.now());

  useEffect(() => {
    const id = setInterval(() => setDiff(new Date(target).getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (diff <= 0) return <span className="text-[#4ade80]">Starting now!</span>;

  const totalSec = Math.floor(diff / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="flex gap-4 justify-center text-center mt-4">
      {[['Days', d], ['Hours', h], ['Minutes', m], ['Seconds', s]].map(([label, val]) => (
        <div key={label as string} className="flex flex-col items-center">
          <span className="text-4xl font-mono font-bold text-[#38bdf8]">{pad(val as number)}</span>
          <span className="text-xs text-[#8892a4] mt-1 uppercase tracking-wider">{label}</span>
        </div>
      ))}
    </div>
  );
}

function CategoryBadge({ cat, color }: { cat: string; color?: string }) {
  const colors: Record<string, string> = {
    'Best Art': 'bg-purple-500/20 text-[#a78bfa] border-purple-500/30',
    'Best Gameplay': 'bg-blue-500/20 text-[#38bdf8] border-blue-500/30',
    'Best Audio': 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    'Most Creative': 'bg-green-500/20 text-[#4ade80] border-green-500/30',
    'Best Solo': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  };
  const cls = color ?? colors[cat] ?? 'bg-gray-700 text-gray-300 border-gray-600';
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded border font-medium ${cls}`}>{cat}</span>
  );
}

export function GameJamClient({
  event,
  activeTheme,
  entries: initialEntries,
  myEntry: initialMyEntry,
  userVotes: initialVotes,
  isAuthenticated,
  userId,
}: Props) {
  const [tab, setTab] = useState<'theme' | 'submit' | 'gallery'>('theme');

  // Submit form state
  const [myEntry, setMyEntry] = useState(initialMyEntry);
  const [form, setForm] = useState({
    title: initialMyEntry?.title ?? '',
    description: initialMyEntry?.description ?? '',
    play_url: initialMyEntry?.play_url ?? '',
    repo_url: initialMyEntry?.repo_url ?? '',
    screenshot_url: initialMyEntry?.screenshot_url ?? '',
    categories: initialMyEntry?.categories ?? [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');

  // Gallery state
  const [entries, setEntries] = useState(initialEntries);
  const [userVotes, setUserVotes] = useState(initialVotes);
  const [votingId, setVotingId] = useState<string | null>(null);

  const toggleCategory = (cat: string) => {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter((c) => c !== cat)
        : [...f.categories, cat],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    setSubmitMsg('');
    try {
      const res = await fetch(`/api/events/${event.slug}/game-jam/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitMsg(data.error ?? 'Something went wrong.');
      } else {
        setMyEntry(data.entry);
        setSubmitMsg('Entry saved!');
      }
    } catch {
      setSubmitMsg('Network error - please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleVote = useCallback(async (entryId: string, category: string) => {
    if (!isAuthenticated) return;
    setVotingId(`${entryId}-${category}`);
    try {
      const res = await fetch(`/api/events/${event.slug}/game-jam/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry_id: entryId, category }),
      });
      const data = await res.json();
      if (res.ok) {
        // Toggle local vote state
        setUserVotes((prev) => {
          const exists = prev.some((v) => v.entry_id === entryId && v.category === category);
          if (exists) return prev.filter((v) => !(v.entry_id === entryId && v.category === category));
          return [...prev, { entry_id: entryId, category }];
        });
        // Update vote count
        setEntries((prev) =>
          prev.map((en) => {
            if (en.id !== entryId) return en;
            return {
              ...en,
              voteCounts: {
                ...en.voteCounts,
                [category]: data.count,
              },
            };
          })
        );
      }
    } catch {
      // silent fail
    } finally {
      setVotingId(null);
    }
  }, [event.slug, isAuthenticated]);

  const hasVoted = (entryId: string, cat: string) =>
    userVotes.some((v) => v.entry_id === entryId && v.category === cat);

  const tabClass = (t: typeof tab) =>
    `px-5 py-2 text-sm font-semibold rounded-md transition-colors ${
      tab === t
        ? 'bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/30'
        : 'text-[#8892a4] hover:text-[#e2e8f0]'
    }`;

  return (
    <div className="min-h-screen" style={{ background: '#0b0e14', color: '#e2e8f0' }}>
      {/* Header */}
      <div className="border-b border-[#252b3a] px-4 py-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="text-2xl">🎮</span>
          <h1 className="text-2xl font-bold tracking-tight">{event.title}</h1>
        </div>
        <p className="text-sm text-[#8892a4]">Game Jam</p>
      </div>

      {/* Tab bar */}
      <div className="flex justify-center gap-2 px-4 py-4 border-b border-[#252b3a]">
        <button className={tabClass('theme')} onClick={() => setTab('theme')}>Theme</button>
        <button className={tabClass('submit')} onClick={() => setTab('submit')}>Submit Entry</button>
        <button className={tabClass('gallery')} onClick={() => setTab('gallery')}>
          Gallery {entries.length > 0 && <span className="ml-1 text-[#8892a4]">({entries.length})</span>}
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* === THEME TAB === */}
        {tab === 'theme' && (
          <div className="text-center py-8">
            {activeTheme ? (
              <>
                <p className="text-sm uppercase tracking-widest text-[#38bdf8] mb-4 font-semibold">This Year&apos;s Theme</p>
                <div
                  className="text-5xl md:text-7xl font-extrabold leading-tight mb-6"
                  style={{
                    background: 'linear-gradient(135deg, #38bdf8 0%, #a78bfa 50%, #4ade80 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {activeTheme.theme}
                </div>
                <p className="text-sm text-[#8892a4]">
                  Revealed{' '}
                  {new Date(activeTheme.revealed_at).toLocaleString('en-CA', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">🔒</div>
                <p className="text-xl font-semibold mb-2">Theme not revealed yet</p>
                <p className="text-[#8892a4] mb-6">Check back at kickoff!</p>
                <Countdown target={event.starts_at} />
              </>
            )}
          </div>
        )}

        {/* === SUBMIT ENTRY TAB === */}
        {tab === 'submit' && (
          <div className="max-w-xl mx-auto">
            {!isAuthenticated ? (
              <div className="text-center py-12">
                <p className="text-[#8892a4] mb-4">Sign in to submit your entry.</p>
                <a
                  href="/login"
                  className="inline-block px-6 py-2 rounded-lg bg-[#38bdf8] text-[#0b0e14] font-semibold text-sm hover:bg-[#38bdf8]/90 transition-colors"
                >
                  Sign In
                </a>
              </div>
            ) : (
              <>
                {myEntry && (
                  <div className="mb-6 px-4 py-3 rounded-lg border border-[#4ade80]/30 bg-[#4ade80]/5 text-sm text-[#4ade80]">
                    You have an existing submission. Updating it will replace your previous entry.
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-[#e2e8f0]">
                      Game Title <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="My Awesome Game"
                      className="w-full px-3 py-2 rounded-lg border border-[#252b3a] bg-[#13161f] text-[#e2e8f0] placeholder-[#8892a4] text-sm focus:outline-none focus:border-[#38bdf8] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-[#e2e8f0]">
                      Description
                      <span className="text-[#8892a4] font-normal ml-1">({form.description.length}/500)</span>
                    </label>
                    <textarea
                      rows={4}
                      maxLength={500}
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Tell us about your game - what inspired you, how it works, any challenges you overcame..."
                      className="w-full px-3 py-2 rounded-lg border border-[#252b3a] bg-[#13161f] text-[#e2e8f0] placeholder-[#8892a4] text-sm focus:outline-none focus:border-[#38bdf8] transition-colors resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-[#e2e8f0]">Play URL</label>
                    <input
                      type="url"
                      value={form.play_url}
                      onChange={(e) => setForm((f) => ({ ...f, play_url: e.target.value }))}
                      placeholder="https://itch.io/..."
                      className="w-full px-3 py-2 rounded-lg border border-[#252b3a] bg-[#13161f] text-[#e2e8f0] placeholder-[#8892a4] text-sm focus:outline-none focus:border-[#38bdf8] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-[#e2e8f0]">Repository URL</label>
                    <input
                      type="url"
                      value={form.repo_url}
                      onChange={(e) => setForm((f) => ({ ...f, repo_url: e.target.value }))}
                      placeholder="https://github.com/..."
                      className="w-full px-3 py-2 rounded-lg border border-[#252b3a] bg-[#13161f] text-[#e2e8f0] placeholder-[#8892a4] text-sm focus:outline-none focus:border-[#38bdf8] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-[#e2e8f0]">Screenshot URL</label>
                    <input
                      type="url"
                      value={form.screenshot_url}
                      onChange={(e) => setForm((f) => ({ ...f, screenshot_url: e.target.value }))}
                      placeholder="https://i.imgur.com/..."
                      className="w-full px-3 py-2 rounded-lg border border-[#252b3a] bg-[#13161f] text-[#e2e8f0] placeholder-[#8892a4] text-sm focus:outline-none focus:border-[#38bdf8] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-[#e2e8f0]">Categories (select all that apply)</label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleCategory(cat)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                            form.categories.includes(cat)
                              ? 'border-[#38bdf8] bg-[#38bdf8]/15 text-[#38bdf8]'
                              : 'border-[#252b3a] bg-[#13161f] text-[#8892a4] hover:border-[#38bdf8]/50 hover:text-[#e2e8f0]'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {submitMsg && (
                    <p className={`text-sm ${submitMsg.includes('saved') ? 'text-[#4ade80]' : 'text-red-400'}`}>
                      {submitMsg}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={saving || !form.title.trim()}
                    className="w-full py-2.5 rounded-lg bg-[#38bdf8] text-[#0b0e14] font-semibold text-sm hover:bg-[#38bdf8]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : myEntry ? 'Update Entry' : 'Submit Entry'}
                  </button>
                </form>
              </>
            )}
          </div>
        )}

        {/* === GALLERY TAB === */}
        {tab === 'gallery' && (
          <div>
            {entries.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🕹️</div>
                <p className="text-lg font-semibold mb-1">No entries yet</p>
                <p className="text-sm text-[#8892a4]">Submissions will appear here once teams start uploading.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {entries.map((entry) => {
                  const isOwn = entry.member_id === userId;
                  return (
                    <div
                      key={entry.id}
                      className="rounded-xl border border-[#252b3a] bg-[#13161f] overflow-hidden flex flex-col"
                    >
                      {/* Screenshot */}
                      {entry.screenshot_url && (
                        <div className="relative w-full aspect-video bg-[#0d1117]">
                          <img
                            src={entry.screenshot_url}
                            alt={entry.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      <div className="p-4 flex flex-col gap-3 flex-1">
                        {/* Title + own badge */}
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-base text-[#e2e8f0] leading-tight">{entry.title}</h3>
                          {isOwn && (
                            <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded border border-[#38bdf8]/30 bg-[#38bdf8]/10 text-[#38bdf8]">
                              Your entry
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        {entry.description && (
                          <p className="text-sm text-[#8892a4] leading-relaxed line-clamp-3">
                            {entry.description}
                          </p>
                        )}

                        {/* Categories */}
                        {entry.categories.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {entry.categories.map((cat) => (
                              <CategoryBadge key={cat} cat={cat} />
                            ))}
                          </div>
                        )}

                        {/* Links */}
                        <div className="flex gap-3">
                          {entry.play_url && (
                            <a
                              href={entry.play_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium text-[#38bdf8] hover:underline"
                            >
                              Play Game
                            </a>
                          )}
                          {entry.repo_url && (
                            <a
                              href={entry.repo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium text-[#8892a4] hover:text-[#e2e8f0] hover:underline"
                            >
                              Source Code
                            </a>
                          )}
                        </div>

                        {/* Voting */}
                        {!isOwn && isAuthenticated && entry.categories.length > 0 && (
                          <div className="pt-2 border-t border-[#252b3a]">
                            <p className="text-xs text-[#8892a4] mb-2 font-medium uppercase tracking-wide">Vote</p>
                            <div className="flex flex-wrap gap-2">
                              {entry.categories.map((cat) => {
                                const voted = hasVoted(entry.id, cat);
                                const isLoading = votingId === `${entry.id}-${cat}`;
                                return (
                                  <button
                                    key={cat}
                                    onClick={() => handleVote(entry.id, cat)}
                                    disabled={isLoading}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-all disabled:opacity-60 ${
                                      voted
                                        ? 'border-[#4ade80]/40 bg-[#4ade80]/10 text-[#4ade80]'
                                        : 'border-[#252b3a] bg-[#0d1117] text-[#8892a4] hover:border-[#38bdf8]/40 hover:text-[#38bdf8]'
                                    }`}
                                  >
                                    <span>{voted ? '✓' : '+'}</span>
                                    <span>{cat}</span>
                                    <span className="ml-1 opacity-70">{entry.voteCounts[cat] ?? 0}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Vote counts for own entry or unauthenticated */}
                        {(isOwn || !isAuthenticated) && entry.categories.length > 0 && (
                          <div className="pt-2 border-t border-[#252b3a]">
                            <div className="flex flex-wrap gap-2">
                              {entry.categories.map((cat) => (
                                <span
                                  key={cat}
                                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs border border-[#252b3a] bg-[#0d1117] text-[#8892a4]"
                                >
                                  {cat}
                                  <span className="text-[#e2e8f0] font-semibold">{entry.voteCounts[cat] ?? 0}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {!isAuthenticated && (
                          <p className="text-xs text-[#8892a4]">
                            <a href="/login" className="text-[#38bdf8] hover:underline">Sign in</a> to vote
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
