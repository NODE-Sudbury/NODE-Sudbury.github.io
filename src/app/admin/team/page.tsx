'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type TeamRole = 'checkin' | 'board'

interface TeamMember {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
  role: string
  is_super_admin: boolean
  created_at: string
}

interface SearchResult {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
}

const ROLE_LABELS: Record<string, string> = {
  board: 'Board',
  checkin: 'Check-in',
}

const ROLE_COLORS: Record<string, string> = {
  board: 'text-[#f0e6d3] border-[#f0e6d3]/40',
  checkin: 'text-blue-400 border-blue-400/40',
}

export default function AdminTeam() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [currentMember, setCurrentMember] = useState<TeamMember | null>(null)
  const [team, setTeam] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Add member state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [selected, setSelected] = useState<SearchResult | null>(null)
  const [addRole, setAddRole] = useState<TeamRole>('checkin')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const searchRef = useRef<HTMLDivElement>(null)

  const isBoard = currentMember?.role === 'board'

  const loadTeam = useCallback(async () => {
    const { data } = await supabase
      .from('members')
      .select('id, full_name, email, avatar_url, role, is_super_admin, created_at')
      .in('role', ['board', 'checkin'])
      .order('created_at')
    setTeam(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return
      supabase
        .from('members')
        .select('id, full_name, email, avatar_url, role, is_super_admin, created_at')
        .eq('id', data.session.user.id)
        .single()
        .then(({ data: m }) => setCurrentMember(m))
    })
    loadTeam()
  }, [loadTeam])

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleSearch(q: string) {
    setSearchQuery(q)
    setSelected(null)
    if (q.trim().length < 2) { setSearchResults([]); setSearchOpen(false); return }

    const { data } = await supabase
      .from('members')
      .select('id, full_name, email, avatar_url')
      .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
      .not('role', 'in', '("board","checkin")')
      .limit(8)

    setSearchResults(data ?? [])
    setSearchOpen(true)
  }

  function selectResult(r: SearchResult) {
    setSelected(r)
    setSearchQuery(r.full_name ?? r.email)
    setSearchOpen(false)
    setSearchResults([])
  }

  async function handleAdd() {
    if (!selected) return
    setAdding(true)
    setAddError('')
    const { error } = await supabase
      .from('members')
      .update({ role: addRole })
      .eq('id', selected.id)
    if (error) { setAddError(error.message); setAdding(false); return }
    setSelected(null)
    setSearchQuery('')
    setAddRole('checkin')
    setAdding(false)
    loadTeam()
  }

  async function handleRoleChange(memberId: string, role: TeamRole) {
    setUpdatingId(memberId)
    await supabase.from('members').update({ role }).eq('id', memberId)
    setTeam((prev) => prev.map((m) => m.id === memberId ? { ...m, role } : m))
    setUpdatingId(null)
  }

  async function handleRemove(memberId: string) {
    setUpdatingId(memberId)
    await supabase.from('members').update({ role: 'member' }).eq('id', memberId)
    setTeam((prev) => prev.filter((m) => m.id !== memberId))
    setUpdatingId(null)
  }

  function initials(m: { full_name: string | null; email: string }) {
    return m.full_name?.split(' ').map((n) => n[0]).join('').toUpperCase() ?? m.email[0].toUpperCase()
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold">Team</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage who has admin and check-in access.
        </p>
      </div>

      {/* Add member - board only */}
      {isBoard && (
        <div className="border border-border rounded-lg p-5 space-y-4">
          <p className="text-sm font-medium">Add team member</p>

          <div className="flex gap-3 items-start flex-wrap">
            {/* Member search */}
            <div className="relative flex-1 min-w-48" ref={searchRef}>
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => { if (searchResults.length > 0) setSearchOpen(true) }}
                className="w-full"
              />
              {searchOpen && searchResults.length > 0 && (
                <div className="absolute z-10 top-full mt-1 w-full bg-background border border-border rounded-md shadow-lg overflow-hidden">
                  {searchResults.map((r) => (
                    <button
                      key={r.id}
                      onMouseDown={() => selectResult(r)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
                    >
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarImage src={r.avatar_url ?? undefined} />
                        <AvatarFallback className="text-xs">{initials(r)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{r.full_name ?? r.email}</p>
                        {r.full_name && <p className="text-xs text-muted-foreground truncate">{r.email}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {searchOpen && searchResults.length === 0 && searchQuery.length >= 2 && (
                <div className="absolute z-10 top-full mt-1 w-full bg-background border border-border rounded-md shadow-lg px-3 py-3">
                  <p className="text-xs text-muted-foreground">No members found.</p>
                </div>
              )}
            </div>

            {/* Role selector */}
            <select
              value={addRole}
              onChange={(e) => setAddRole(e.target.value as TeamRole)}
              className="border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground"
            >
              <option value="checkin">Check-in</option>
              <option value="board">Board</option>
            </select>

            <Button
              onClick={handleAdd}
              disabled={!selected || adding}
              className="bg-[#f0e6d3] text-[#0a0a0a] hover:bg-[#e8d9c0] font-semibold"
            >
              {adding ? 'Adding...' : 'Add'}
            </Button>
          </div>

          {selected && (
            <p className="text-xs text-muted-foreground">
              Selected: <span className="text-foreground font-medium">{selected.full_name ?? selected.email}</span> as <span className="capitalize">{addRole}</span>
            </p>
          )}
          {addError && <p className="text-xs text-destructive">{addError}</p>}
        </div>
      )}

      {/* Team table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Member</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Role</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Joined</th>
              {isBoard && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isBoard ? 4 : 3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Loading...
                </td>
              </tr>
            ) : team.length === 0 ? (
              <tr>
                <td colSpan={isBoard ? 4 : 3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No team members yet.
                </td>
              </tr>
            ) : team.map((m) => {
              const isSelf = m.id === currentMember?.id
              const canEdit = isBoard && !m.is_super_admin
              return (
                <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={m.avatar_url ?? undefined} />
                        <AvatarFallback className="text-xs">{initials(m)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{m.full_name ?? m.email}</p>
                          {m.is_super_admin && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-[#f0e6d3] border-[#f0e6d3]/40">
                              owner
                            </Badge>
                          )}
                          {isSelf && !m.is_super_admin && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                              you
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {canEdit ? (
                      <select
                        value={m.role}
                        disabled={updatingId === m.id}
                        onChange={(e) => handleRoleChange(m.id, e.target.value as TeamRole)}
                        className={`text-xs border rounded px-2 py-1 bg-transparent capitalize cursor-pointer disabled:opacity-50 ${ROLE_COLORS[m.role] ?? ''}`}
                      >
                        <option value="checkin" className="bg-background text-foreground">Check-in</option>
                        <option value="board" className="bg-background text-foreground">Board</option>
                      </select>
                    ) : (
                      <span className={`text-xs capitalize ${ROLE_COLORS[m.role] ?? 'text-muted-foreground'}`}>
                        {ROLE_LABELS[m.role] ?? m.role}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(m.created_at).toLocaleDateString('en-CA', {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}
                  </td>
                  {isBoard && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRemove(m.id)}
                        disabled={!canEdit || updatingId === m.id}
                        className="text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title={m.is_super_admin ? 'Owner cannot be removed' : 'Remove from team'}
                      >
                        {updatingId === m.id ? '...' : 'Remove'}
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
