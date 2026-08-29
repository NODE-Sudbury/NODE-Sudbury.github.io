'use client'

export default function AdminEmails() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Emails</h1>
        <p className="text-sm text-muted-foreground mt-1">Newsletter and automated email history.</p>
      </div>
      <ComingSoon label="Email centre" detail="Send newsletters, view automated email history, and track open rates via Resend - coming soon." />
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
