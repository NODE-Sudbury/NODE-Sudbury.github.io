'use client'

interface Cert {
  id: string
  cert_type: string
  issued_at: string
  metadata: Record<string, unknown> | null
  event: { title: string; slug: string; type: string; starts_at: string } | null
}

interface Props {
  certs: Cert[]
  memberName: string
}

const CERT_TYPE_LABELS: Record<string, string> = {
  completion: 'Completion',
  attendance: 'Attendance',
  speaker: 'Speaker',
  volunteer: 'Volunteer',
  hackathon_winner: 'Hackathon Winner',
  hackathon_participant: 'Hackathon Participant',
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  workshop: 'Workshop',
  hackathon: 'Hackathon',
  meetup: 'Meetup',
  conference: 'Conference',
  speaker: 'Speaker Event',
}

const EVENT_TYPE_STYLES: Record<string, string> = {
  workshop: 'bg-[#0d2a3a] text-[#38bdf8] border-[#1a3a4a]',
  hackathon: 'bg-[#1a2a0e] text-[#9ece6a] border-[#2a4020]',
  speaker: 'bg-[#1a1a2a] text-[#bb9af7] border-[#2a2a4a]',
  meetup: 'bg-[#2a1a0e] text-[#e0af68] border-[#3a2a10]',
  conference: 'bg-[#0d2a20] text-[#73daca] border-[#1a4030]',
}

function isWorkshopCert(cert: Cert): boolean {
  return cert.cert_type === 'completion' || cert.event?.type === 'workshop'
}

function getYear(cert: Cert): string {
  const date = cert.issued_at || cert.event?.starts_at
  if (!date) return 'Unknown'
  return new Date(date).getFullYear().toString()
}

function groupByYear(certs: Cert[]): Map<string, Cert[]> {
  const map = new Map<string, Cert[]>()
  for (const cert of certs) {
    const year = getYear(cert)
    const existing = map.get(year) ?? []
    existing.push(cert)
    map.set(year, existing)
  }
  return map
}

export default function CertificatesClient({ certs, memberName }: Props) {
  const grouped = groupByYear(certs)
  const years = Array.from(grouped.keys()).sort((a, b) => Number(b) - Number(a))

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e2e8f0] px-4 py-10 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Certificates</h1>
        <p className="text-[#8892a4] text-sm mt-1">{memberName}</p>
      </div>

      {certs.length === 0 ? (
        <div className="bg-[#13161f] border border-[#252b3a] rounded-lg p-8 text-center">
          <p className="text-sm text-[#8892a4]">No certificates yet. Attend events to earn your first one.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {years.map((year) => (
            <section key={year}>
              <h2 className="text-xs font-semibold text-[#8892a4] uppercase tracking-widest mb-4">{year}</h2>
              <div className="flex flex-col gap-3">
                {(grouped.get(year) ?? []).map((cert) => {
                  const workshop = isWorkshopCert(cert)
                  const eventType = cert.event?.type ?? ''
                  const typeLabel = EVENT_TYPE_LABELS[eventType] ?? eventType

                  return (
                    <div
                      key={cert.id}
                      className="bg-[#13161f] border border-[#252b3a] rounded-lg overflow-hidden flex"
                    >
                      {/* Gold left strip for workshop/completion certs */}
                      <div
                        className="w-1 flex-shrink-0"
                        style={{ background: workshop ? '#f59e0b' : '#252b3a' }}
                      />
                      <div className="flex-1 px-5 py-4">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#e2e8f0] truncate">
                              {cert.event?.title ?? 'NODE Event'}
                            </p>
                            <p className="text-xs text-[#8892a4] mt-0.5">
                              {new Date(cert.issued_at).toLocaleDateString('en-CA', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                            {eventType && (
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${EVENT_TYPE_STYLES[eventType] ?? 'bg-[#1a2035] text-[#8892a4] border-[#252b3a]'}`}
                              >
                                {typeLabel}
                              </span>
                            )}
                            <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#252b3a] bg-[#1a2035] text-[#8892a4] font-medium capitalize">
                              {CERT_TYPE_LABELS[cert.cert_type] ?? cert.cert_type}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap mt-3">
                          <a
                            href={`/api/certificates/${cert.id}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-1.5 rounded-md border border-[#252b3a] text-xs text-[#8892a4] hover:text-white hover:border-[#38bdf8] transition-colors"
                          >
                            Download PDF
                          </a>
                          <a
                            href={`/api/certificates/${cert.id}?format=badge`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-1.5 rounded-md border border-[#252b3a] text-xs text-[#8892a4] hover:text-white transition-colors"
                          >
                            Open Badge
                          </a>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
