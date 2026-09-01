interface StreamingStats {
  remote_viewer_count: number
  peak_concurrent: number
  total_remote_registered: number
}

interface StreamingStatsCardProps {
  stats: StreamingStats | null
}

export default function StreamingStatsCard({ stats }: StreamingStatsCardProps) {
  if (!stats) return null

  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: '0.5rem',
        padding: '1rem 1.5rem',
        marginBottom: '1.5rem',
        background: '#f8fafc',
      }}
    >
      <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', fontWeight: 600, color: '#1e293b' }}>
        Streaming Stats
      </h3>
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', fontSize: '0.875rem', color: '#475569' }}>
        <span>
          <strong style={{ color: '#0f172a' }}>{stats.remote_viewer_count}</strong> Remote viewers
        </span>
        <span>
          <strong style={{ color: '#0f172a' }}>{stats.peak_concurrent}</strong> Peak concurrent
        </span>
        <span>
          <strong style={{ color: '#0f172a' }}>{stats.total_remote_registered}</strong> Remote registered
        </span>
      </div>
    </div>
  )
}
