'use client';

import { useState } from 'react';

const CATEGORIES = ['Best Art', 'Best Gameplay', 'Best Audio', 'Most Creative', 'Best Solo'];

interface Theme {
  id: string;
  theme: string;
  revealed_at: string;
  is_active: boolean;
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
  created_at: string;
  tallies: Record<string, number>;
}

interface Props {
  event: { id: string; title: string; slug: string; starts_at: string };
  activeTheme: Theme | null;
  allThemes: Theme[];
  entries: Entry[];
}

export function GameJamAdminClient({ event, activeTheme: initialTheme, allThemes: initialAllThemes, entries: initialEntries }: Props) {
  const [activeTheme, setActiveTheme] = useState(initialTheme);
  const [allThemes, setAllThemes] = useState(initialAllThemes);
  const [entries] = useState(initialEntries);
  const [newTheme, setNewTheme] = useState('');
  const [revealing, setRevealing] = useState(false);
  const [themeMsg, setThemeMsg] = useState('');
  const [tab, setTab] = useState<'theme' | 'entries'>('theme');

  const revealTheme = async () => {
    if (!newTheme.trim()) return;
    setRevealing(true);
    setThemeMsg('');
    try {
      const res = await fetch(`/api/admin/game-jam/${event.id}/theme`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setThemeMsg(data.error ?? 'Failed to reveal theme.');
      } else {
        setActiveTheme(data.theme);
        setAllThemes((prev) => [data.theme, ...prev.map((t) => ({ ...t, is_active: false }))]);
        setNewTheme('');
        setThemeMsg('Theme revealed!');
      }
    } catch {
      setThemeMsg('Network error.');
    } finally {
      setRevealing(false);
    }
  };

  const exportResults = () => {
    const rows = [
      ['Entry', 'Member ID', ...CATEGORIES, 'Total'],
      ...entries.map((e) => {
        const cats = CATEGORIES.map((c) => e.tallies[c] ?? 0);
        const total = cats.reduce((a, b) => a + b, 0);
        return [e.title, e.member_id, ...cats, total];
      }),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `game-jam-results-${event.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabClass = (t: typeof tab) =>
    `px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
      tab === t
        ? 'bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/30'
        : 'text-[#8892a4] hover:text-[#e2e8f0]'
    }`;

  // Sort entries by total votes descending for results
  const sorted = [...entries].sort((a, b) => {
    const totalA = Object.values(a.tallies).reduce((s, n) => s + n, 0);
    const totalB = Object.values(b.tallies).reduce((s, n) => s + n, 0);
    return totalB - totalA;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#0b0e14', color: '#e2e8f0' }}>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">{event.title}</h1>
            <p className="text-sm text-[#8892a4]">Game Jam Admin</p>
          </div>
          <button
            onClick={exportResults}
            className="px-4 py-2 rounded-lg border border-[#252b3a] bg-[#13161f] text-sm text-[#8892a4] hover:text-[#e2e8f0] hover:border-[#38bdf8]/40 transition-colors"
          >
            Export Results (CSV)
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-[#252b3a] pb-4">
          <button className={tabClass('theme')} onClick={() => setTab('theme')}>Theme</button>
          <button className={tabClass('entries')} onClick={() => setTab('entries')}>
            Entries ({entries.length})
          </button>
        </div>

        {/* === THEME TAB === */}
        {tab === 'theme' && (
          <div className="space-y-6">
            {/* Current active theme */}
            <div className="rounded-xl border border-[#252b3a] bg-[#13161f] p-6">
              <h2 className="text-sm font-semibold text-[#8892a4] uppercase tracking-wide mb-3">Active Theme</h2>
              {activeTheme ? (
                <div>
                  <p
                    className="text-3xl font-extrabold mb-2"
                    style={{
                      background: 'linear-gradient(135deg, #38bdf8 0%, #a78bfa 50%, #4ade80 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {activeTheme.theme}
                  </p>
                  <p className="text-xs text-[#8892a4]">
                    Revealed{' '}
                    {new Date(activeTheme.revealed_at).toLocaleString('en-CA', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              ) : (
                <p className="text-[#8892a4] italic">No theme revealed yet.</p>
              )}
            </div>

            {/* Reveal new theme */}
            <div className="rounded-xl border border-[#252b3a] bg-[#13161f] p-6">
              <h2 className="text-sm font-semibold text-[#8892a4] uppercase tracking-wide mb-3">
                {activeTheme ? 'Replace Theme' : 'Reveal Theme'}
              </h2>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newTheme}
                  onChange={(e) => setNewTheme(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && revealTheme()}
                  placeholder="Enter the theme..."
                  className="flex-1 px-3 py-2 rounded-lg border border-[#252b3a] bg-[#0b0e14] text-[#e2e8f0] placeholder-[#8892a4] text-sm focus:outline-none focus:border-[#38bdf8] transition-colors"
                />
                <button
                  onClick={revealTheme}
                  disabled={revealing || !newTheme.trim()}
                  className="px-5 py-2 rounded-lg bg-[#38bdf8] text-[#0b0e14] font-semibold text-sm hover:bg-[#38bdf8]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {revealing ? 'Revealing...' : 'Reveal'}
                </button>
              </div>
              {themeMsg && (
                <p className={`text-sm mt-2 ${themeMsg.includes('!') ? 'text-[#4ade80]' : 'text-red-400'}`}>
                  {themeMsg}
                </p>
              )}
            </div>

            {/* Theme history */}
            {allThemes.length > 1 && (
              <div className="rounded-xl border border-[#252b3a] bg-[#13161f] p-6">
                <h2 className="text-sm font-semibold text-[#8892a4] uppercase tracking-wide mb-3">Theme History</h2>
                <div className="space-y-2">
                  {allThemes.map((t) => (
                    <div key={t.id} className="flex items-center justify-between py-2 border-b border-[#252b3a] last:border-0">
                      <span className={`text-sm ${t.is_active ? 'text-[#38bdf8] font-semibold' : 'text-[#8892a4]'}`}>
                        {t.theme}
                      </span>
                      <div className="flex items-center gap-3">
                        {t.is_active && (
                          <span className="text-xs px-2 py-0.5 rounded border border-[#4ade80]/30 bg-[#4ade80]/10 text-[#4ade80]">
                            Active
                          </span>
                        )}
                        <span className="text-xs text-[#8892a4]">
                          {new Date(t.revealed_at).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* === ENTRIES TAB === */}
        {tab === 'entries' && (
          <div>
            {entries.length === 0 ? (
              <div className="text-center py-16 text-[#8892a4]">No entries submitted yet.</div>
            ) : (
              <div className="space-y-4">
                {sorted.map((entry, idx) => {
                  const total = Object.values(entry.tallies).reduce((s, n) => s + n, 0);
                  return (
                    <div key={entry.id} className="rounded-xl border border-[#252b3a] bg-[#13161f] p-5">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-[#38bdf8] w-6">#{idx + 1}</span>
                          <div>
                            <h3 className="font-bold text-base">{entry.title}</h3>
                            <p className="text-xs text-[#8892a4] mt-0.5">
                              Submitted{' '}
                              {new Date(entry.created_at).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-2xl font-extrabold text-[#4ade80]">{total}</span>
                          <p className="text-xs text-[#8892a4]">total votes</p>
                        </div>
                      </div>

                      {entry.description && (
                        <p className="text-sm text-[#8892a4] mb-3 leading-relaxed line-clamp-2">{entry.description}</p>
                      )}

                      {/* Vote tallies per category */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-3">
                        {CATEGORIES.map((cat) => {
                          const count = entry.tallies[cat] ?? 0;
                          const inCat = entry.categories.includes(cat);
                          return (
                            <div
                              key={cat}
                              className={`rounded-lg border p-2 text-center ${
                                inCat && count > 0
                                  ? 'border-[#38bdf8]/30 bg-[#38bdf8]/5'
                                  : 'border-[#252b3a] bg-[#0d1117]'
                              }`}
                            >
                              <p className={`text-xl font-bold ${count > 0 ? 'text-[#38bdf8]' : 'text-[#5a6278]'}`}>{count}</p>
                              <p className="text-xs text-[#8892a4] leading-tight mt-0.5">{cat}</p>
                            </div>
                          );
                        })}
                      </div>

                      {/* Links */}
                      <div className="flex gap-3 flex-wrap">
                        {entry.play_url && (
                          <a href={entry.play_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#38bdf8] hover:underline">
                            Play Game
                          </a>
                        )}
                        {entry.repo_url && (
                          <a href={entry.repo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#8892a4] hover:text-[#e2e8f0] hover:underline">
                            Source Code
                          </a>
                        )}
                        {entry.screenshot_url && (
                          <a href={entry.screenshot_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#8892a4] hover:text-[#e2e8f0] hover:underline">
                            Screenshot
                          </a>
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
