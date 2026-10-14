'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

interface BadgeDef {
  id: string
  name: string
  description: string
  trigger: string
  points: number
  icon_url: string | null
}

interface PointRow {
  points: number
  reason: string
  created_at: string
}

interface Props {
  allBadges: BadgeDef[]
  earnedSet: string[]
  earnedMap: Record<string, string>
  pointHistory: PointRow[]
  totalPoints: number
  memberName: string
}

export default function BadgesClient({ allBadges, earnedSet, earnedMap, pointHistory, totalPoints, memberName }: Props) {
  const earned = new Set(earnedSet)

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Badges &amp; Points</h1>
        <p className="text-muted-foreground text-sm mt-1">{memberName}</p>
      </div>

      <Card className="mb-8 bg-[#13161f] border-[#252b3a]">
        <CardContent className="pt-6 flex items-center gap-4">
          <div className="text-4xl font-bold text-[#f0e6d3]">{totalPoints}</div>
          <div>
            <p className="text-sm font-semibold">Total Points</p>
            <p className="text-xs text-muted-foreground">{earnedSet.length} badge{earnedSet.length !== 1 ? 's' : ''} earned</p>
          </div>
        </CardContent>
      </Card>

      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Badges</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
        {allBadges.map((b) => {
          const isEarned = earned.has(b.id)
          const earnedAt = earnedMap[b.id]
          return (
            <Card
              key={b.id}
              className={`border transition-colors ${isEarned ? 'bg-[#13161f] border-[#f0e6d3]/30' : 'bg-[#0b0e14] border-[#252b3a] opacity-50'}`}
            >
              <CardContent className="pt-4 pb-4 flex items-start gap-3">
                <div className="text-2xl shrink-0">{b.icon_url ?? '🏅'}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold truncate">{b.name}</p>
                    <Badge variant="outline" className="text-[10px] shrink-0">+{b.points}pts</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{b.description}</p>
                  {isEarned && earnedAt && (
                    <p className="text-[10px] text-[#f0e6d3] mt-1">
                      Earned {new Date(earnedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Separator className="mb-6" />

      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Point History</h2>
      {pointHistory.length === 0 ? (
        <p className="text-sm text-muted-foreground">No points yet. Attend events to start earning!</p>
      ) : (
        <div className="flex flex-col gap-2">
          {pointHistory.map((row, i) => (
            <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-[#252b3a] last:border-0">
              <span className="text-muted-foreground">{row.reason}</span>
              <span className={`font-semibold ${row.points >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {row.points >= 0 ? '+' : ''}{row.points}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
