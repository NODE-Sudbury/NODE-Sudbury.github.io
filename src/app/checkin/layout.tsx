export default function CheckinLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Minimal top bar - no admin nav */}
      <div className="border-b border-border px-6 py-3 flex items-center justify-between">
        <div>
          <span className="text-sm font-bold tracking-widest text-[#f0e6d3]">NODE</span>
          <span className="text-sm font-light tracking-wider text-muted-foreground"> Check-in</span>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {children}
      </div>
    </div>
  )
}
