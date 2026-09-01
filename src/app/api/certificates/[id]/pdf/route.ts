import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const QRCode = require('qrcode')

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { data: member } = await supabase
    .from('members')
    .select('id, full_name')
    .eq('user_id', session.user.id)
    .single()

  if (!member) {
    return new NextResponse('Member not found', { status: 404 })
  }

  const { data: cert } = await supabase
    .from('certificates')
    .select('id, cert_type, issued_at, metadata, event:events(title, slug)')
    .eq('id', params.id)
    .eq('member_id', member.id)
    .single()

  if (!cert) {
    return new NextResponse('Certificate not found', { status: 404 })
  }

  const eventRaw = cert.event as unknown
  const event = (Array.isArray(eventRaw) ? eventRaw[0] : eventRaw) as { title: string; slug: string } | null
  const eventTitle = event?.title ?? 'NODE Event'
  const issuedAt = new Date(cert.issued_at)
  const issuedYear = issuedAt.getFullYear()
  const issuedMonth = issuedAt.getMonth() + 1

  const formattedDate = issuedAt.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://nodesudbury.com'
  const certUrl = `${appUrl}/api/certificates/${cert.id}`

  // Generate a QR code for certificate verification
  const verifyUrl = `https://nodesudbury.com/verify/${cert.id}`
  const qrDataUrl: string = await QRCode.toDataURL(verifyUrl, { width: 120, margin: 1 })

  const certTypeLabels: Record<string, string> = {
    attendance: 'Attendance',
    speaker: 'Speaker',
    volunteer: 'Volunteer',
    hackathon_winner: 'Hackathon Winner',
    hackathon_participant: 'Hackathon Participant',
  }
  const certLabel = certTypeLabels[cert.cert_type] ?? cert.cert_type

  const linkedInUrl = new URL('https://www.linkedin.com/profile/add')
  linkedInUrl.searchParams.set('startTask', 'CERTIFICATION_NAME')
  linkedInUrl.searchParams.set('name', eventTitle)
  linkedInUrl.searchParams.set('organizationName', 'NODE Sudbury')
  linkedInUrl.searchParams.set('issueYear', String(issuedYear))
  linkedInUrl.searchParams.set('issueMonth', String(issuedMonth))
  linkedInUrl.searchParams.set('certUrl', certUrl)

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Certificate - ${eventTitle}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      background: #f5f3ee;
      color: #1a1a1a;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }

    .toolbar {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 2rem;
      align-items: center;
    }

    .btn {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 0.875rem;
      font-weight: 600;
      padding: 0.5rem 1.25rem;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      transition: opacity 0.15s;
    }

    .btn:hover { opacity: 0.85; }

    .btn-print {
      background: #1a1a2e;
      color: #fff;
    }

    .btn-linkedin {
      background: #0077b5;
      color: #fff;
    }

    .certificate {
      background: #ffffff;
      width: 100%;
      max-width: 820px;
      border: 1px solid #d4c9b0;
      border-radius: 4px;
      box-shadow: 0 4px 32px rgba(0,0,0,0.10);
      padding: 4rem 5rem;
      position: relative;
      overflow: hidden;
    }

    /* Corner accents */
    .certificate::before,
    .certificate::after {
      content: '';
      position: absolute;
      width: 80px;
      height: 80px;
      border-color: #c9a84c;
      border-style: solid;
    }
    .certificate::before {
      top: 20px;
      left: 20px;
      border-width: 3px 0 0 3px;
    }
    .certificate::after {
      bottom: 20px;
      right: 20px;
      border-width: 0 3px 3px 0;
    }

    /* Additional corner spans via JS-free approach - use outline */
    .corner-tr,
    .corner-bl {
      position: absolute;
      width: 80px;
      height: 80px;
      border-color: #c9a84c;
      border-style: solid;
    }
    .corner-tr {
      top: 20px;
      right: 20px;
      border-width: 3px 3px 0 0;
    }
    .corner-bl {
      bottom: 20px;
      left: 20px;
      border-width: 0 0 3px 3px;
    }

    .node-logo {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 2.5rem;
      font-weight: 800;
      letter-spacing: 0.2em;
      color: #1a1a2e;
      text-align: center;
      margin-bottom: 0.25rem;
    }

    .node-subtitle {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 0.75rem;
      font-weight: 500;
      letter-spacing: 0.3em;
      color: #888;
      text-align: center;
      text-transform: uppercase;
      margin-bottom: 2.5rem;
    }

    .divider {
      width: 80px;
      height: 2px;
      background: linear-gradient(90deg, transparent, #c9a84c, transparent);
      margin: 0 auto 2.5rem;
    }

    .heading {
      font-size: 2rem;
      font-weight: 400;
      letter-spacing: 0.05em;
      text-align: center;
      color: #1a1a2e;
      margin-bottom: 0.5rem;
    }

    .subheading {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 0.7rem;
      letter-spacing: 0.35em;
      text-transform: uppercase;
      color: #888;
      text-align: center;
      margin-bottom: 3rem;
    }

    .presented-to {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 0.75rem;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #888;
      text-align: center;
      margin-bottom: 1rem;
    }

    .recipient-name {
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 2.6rem;
      font-weight: 400;
      font-style: italic;
      color: #1a1a2e;
      text-align: center;
      margin-bottom: 2.5rem;
    }

    .description {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 0.875rem;
      color: #555;
      text-align: center;
      line-height: 1.7;
      margin-bottom: 0.75rem;
    }

    .event-name {
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 1.375rem;
      font-style: italic;
      color: #1a1a2e;
      text-align: center;
      margin-bottom: 0.5rem;
    }

    .cert-type-badge {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 0.65rem;
      letter-spacing: 0.25em;
      text-transform: uppercase;
      color: #c9a84c;
      text-align: center;
      margin-bottom: 3rem;
    }

    .date-line {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 0.8rem;
      color: #888;
      text-align: center;
      margin-bottom: 3.5rem;
    }

    .signature-row {
      display: flex;
      justify-content: center;
    }

    .signature-block {
      text-align: center;
      width: 220px;
    }

    .signature-line {
      border-top: 1px solid #bbb;
      margin-bottom: 0.5rem;
      width: 100%;
    }

    .signature-name {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 0.75rem;
      font-weight: 600;
      color: #1a1a2e;
      letter-spacing: 0.05em;
    }

    .signature-title {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 0.65rem;
      color: #888;
      margin-top: 0.2rem;
    }

    .cert-id {
      font-family: 'Courier New', monospace;
      font-size: 0.55rem;
      color: #ccc;
      text-align: center;
      margin-top: 2.5rem;
      letter-spacing: 0.1em;
    }

    .cert-qr {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-top: 2rem;
      gap: 0.4rem;
    }

    .cert-qr img {
      width: 80px;
      height: 80px;
    }

    .cert-qr-label {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 0.55rem;
      color: #aaa;
      letter-spacing: 0.15em;
      text-transform: uppercase;
    }

    @media print {
      html, body {
        background: #fff;
        padding: 0;
        margin: 0;
      }
      .toolbar { display: none !important; }
      .certificate {
        box-shadow: none;
        border: 1px solid #d4c9b0;
        max-width: 100%;
        margin: 0;
        page-break-inside: avoid;
      }
      @page {
        size: A4 landscape;
        margin: 1cm;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button class="btn btn-print" onclick="window.print()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
      Save as PDF
    </button>
    <a class="btn btn-linkedin" href="${linkedInUrl.toString()}" target="_blank" rel="noreferrer">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
      Share on LinkedIn
    </a>
  </div>

  <div class="certificate">
    <span class="corner-tr"></span>
    <span class="corner-bl"></span>

    <div class="node-logo">NODE</div>
    <div class="node-subtitle">Northern Ontario Dev Exchange</div>

    <div class="divider"></div>

    <h1 class="heading">Certificate of Completion</h1>
    <p class="subheading">${certLabel}</p>

    <p class="presented-to">This certifies that</p>

    <div class="recipient-name">${escapeHtml(member.full_name ?? 'Member')}</div>

    <p class="description">has successfully attended</p>

    <div class="event-name">${escapeHtml(eventTitle)}</div>
    <div class="cert-type-badge">${certLabel} Certificate</div>

    <div class="date-line">Issued on ${formattedDate}</div>

    <div class="signature-row">
      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-name">NODE Organizing Team</div>
        <div class="signature-title">NODE - Northern Ontario Dev Exchange</div>
      </div>
    </div>

    <div class="cert-qr">
      <img src="${qrDataUrl}" alt="Verify certificate at nodesudbury.com/verify/${cert.id}" />
      <span class="cert-qr-label">Scan to verify</span>
    </div>

    <div class="cert-id">Certificate ID: ${cert.id}</div>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  })
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
