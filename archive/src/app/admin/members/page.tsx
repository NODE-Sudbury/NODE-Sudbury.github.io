'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

type Role = 'member' | 'checkin' | 'board'
type MemberType = 'all' | 'professional' | 'student'

const ROLES: Role[] = ['member', 'checkin', 'board']

const ROLE_COLORS: Record<Role, string> = {
  member: 'text-muted-foreground border-border',
  checkin: 'text-blue-400 border-blue-400/40',
  board: 'text-[#f0e6d3] border-[#f0e6d3]/40',
}

export default function AdminMembers() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<MemberType>('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('members')
      .select('id, full_name, email, avatar_url, member_type, role, is_public, created_at, job_title, company, school, program')
      .order('created_at', { ascending: false })

    if (typeFilter !== 'all') q = q.eq('member_type', typeFilter)

    const { data } = await q
    setMembers(data ?? [])
    setLoading(false)
  }, [typeFilter])

  useEffect(() => { load() }, [load])

  async function setRole(memberId: string, role: Role) {
    setUpdatingId(memberId)
    await supabase.from('members').update({ role }).eq('id', memberId)
    setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role } : m))
    setUpdatingId(null)
  }

  const filtered = members.filter((m) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      m.full_name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.company?.toLowerCase().includes(q) ||
      m.school?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Members</h1>
          <p className="text-sm text-muted-foreground mt-1">{members.length} total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search name, email, company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex items-center gap-1">
          {(['all', 'professional', 'student'] as MemberType[]).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded text-xs font-medium capitalize transition-colors ${
                typeFilter === t
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Member</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Type</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Role</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Public</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Joined</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No members found.</td></tr>
            ) : filtered.map((m, i) => {
              const initials = m.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() ?? '?'
              const workLine = m.member_type === 'professional'
                ? [m.job_title, m.company].filter(Boolean).join(' at ')
                : [m.program, m.school].filter(Boolean).join(', ')
              return (
                <tr
                  key={m.id}
                  className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${
                    i % 2 === 0 ? '' : 'bg-muted/10'
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={m.avatar_url} />
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{m.full_name ?? m.email}</p>
                        <p className="text-xs text-muted-foreground truncate">{workLine || m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="capitalize text-xs">{m.member_type}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={m.role}
                      disabled={updatingId === m.id}
                      onChange={(e) => setRole(m.id, e.target.value as Role)}
                      className={`text-xs border rounded px-2 py-1 bg-transparent capitalize cursor-pointer disabled:opacity-50 ${ROLE_COLORS[m.role as Role]}`}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r} className="bg-background text-foreground">{r}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs ${m.is_public ? 'text-[#f0e6d3]' : 'text-muted-foreground'}`}>
                      {m.is_public ? 'Public' : 'Private'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(m.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
