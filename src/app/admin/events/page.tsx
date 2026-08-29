'use client'

export default function AdminEvents() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Events</h1>
        <p className="text-sm text-muted-foreground mt-1">Create and manage NODE events.</p>
      </div>
      <ComingSoon label="Event management" detail="Create events, manage RSVPs, and view attendance - coming soon." />
    </div>
  )
}

function ComingSoon({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="border border-border rounded-lg px-6 py-10 flex flex-col items-center text-center gap-2">
      <span className="text-xs border border-border rounded px-2 py-0.5 text-muted-foreground mb-1">Coming soon</span>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground max-w-xs">{detail}</p>
    </div>
  )
}
