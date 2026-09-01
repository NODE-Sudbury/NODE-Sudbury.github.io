import { Resend } from 'resend'

const FROM = process.env.RESEND_FROM_EMAIL ?? 'NODE Sudbury <events@nodesudbury.com>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not set - skipping email to', to)
    return
  }
  const resend = new Resend(process.env.RESEND_API_KEY)
  try {
    await resend.emails.send({ from: FROM, to, subject, html })
  } catch (err) {
    console.error('[Email] Failed to send to', to, err)
  }
}

function layout(title: string, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
body{margin:0;padding:0;background:#f4f7fb;font-family:system-ui,sans-serif;color:#1a1a2e}
.wrap{max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}
.header{background:#0f172a;padding:28px 32px;text-align:center}
.header h1{color:#38bdf8;margin:0;font-size:22px;letter-spacing:.08em;font-weight:800}
.body{padding:32px}
.body h2{font-size:20px;margin:0 0 12px;color:#0f172a}
.body p{margin:0 0 16px;line-height:1.6;color:#374151}
.detail-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin:0 0 20px}
.detail-box p{margin:0 0 6px;font-size:14px;color:#475569}
.detail-box p:last-child{margin:0}
.detail-box strong{color:#0f172a}
.btn{display:inline-block;padding:12px 28px;background:#38bdf8;color:#0f172a;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;margin:0 0 20px}
.btn-outline{display:inline-block;padding:10px 24px;background:transparent;color:#38bdf8;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;border:2px solid #38bdf8;margin:0 0 20px}
.footer{padding:20px 32px;text-align:center;font-size:12px;color:#9ca3af;border-top:1px solid #f3f4f6}
.footer a{color:#38bdf8;text-decoration:none}
</style>
</head><body><div class="wrap">
<div class="header"><h1>NODE Sudbury</h1></div>
<div class="body">${body}</div>
<div class="footer">Northern Ontario Developer Exchange &bull; <a href="${APP_URL}">nodesudbury.com</a></div>
</div></body></html>`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    timeZone: 'America/Toronto',
  })
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-CA', {
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    timeZone: 'America/Toronto',
  })
}

function googleCalendarUrl(event: { title: string; starts_at: string; ends_at: string; description?: string | null }, location?: string): string {
  function toGCal(iso: string) {
    return new Date(iso).toISOString().replace(/[-:]/g, '').replace('.000Z', 'Z')
  }
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${toGCal(event.starts_at)}/${toGCal(event.ends_at)}`,
    details: event.description?.slice(0, 500) ?? '',
    location: location ?? '',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

type EventInfo = {
  id: string
  title: string
  slug: string
  starts_at: string
  ends_at: string
  description?: string | null
  location?: string | null
}

type TicketInfo = { name: string; pricing_model: string; price_cents: number }

export async function sendRsvpConfirmation(
  to: string,
  name: string,
  event: EventInfo,
  ticket: TicketInfo,
  isWaitlist: boolean,
): Promise<void> {
  const eventUrl = `${APP_URL}/events/${event.slug}`
  const calUrl = googleCalendarUrl(event, event.location ?? undefined)
  const subject = isWaitlist
    ? `You're on the waitlist for ${event.title}`
    : `You're registered for ${event.title}`

  const body = isWaitlist ? `
<h2>You're on the waitlist!</h2>
<p>Hi ${name}, you've been added to the waitlist for <strong>${event.title}</strong>. We'll notify you right away if a spot opens up.</p>
<div class="detail-box">
  <p><strong>Event:</strong> ${event.title}</p>
  <p><strong>Date:</strong> ${fmtDate(event.starts_at)}</p>
  <p><strong>Time:</strong> ${fmtTime(event.starts_at)}</p>
  ${event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ''}
  <p><strong>Ticket:</strong> ${ticket.name}</p>
</div>
<a href="${eventUrl}" class="btn">View Event</a>
` : `
<h2>You're registered!</h2>
<p>Hi ${name}, your spot is confirmed for <strong>${event.title}</strong>.</p>
<div class="detail-box">
  <p><strong>Event:</strong> ${event.title}</p>
  <p><strong>Date:</strong> ${fmtDate(event.starts_at)}</p>
  <p><strong>Time:</strong> ${fmtTime(event.starts_at)}</p>
  ${event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ''}
  <p><strong>Ticket:</strong> ${ticket.name}</p>
</div>
<a href="${eventUrl}" class="btn">View Event</a>
<a href="${calUrl}" class="btn-outline">Add to Google Calendar</a>
<p style="font-size:13px;color:#9ca3af">Need to cancel? Visit the event page to manage your registration.</p>
`

  await sendEmail(to, subject, layout(subject, body))
}

export async function sendWaitlistPromotion(
  to: string,
  name: string,
  event: EventInfo,
): Promise<void> {
  const eventUrl = `${APP_URL}/events/${event.slug}`
  const calUrl = googleCalendarUrl(event, event.location ?? undefined)
  const subject = `A spot opened up at ${event.title}!`
  const body = `
<h2>Good news - you're in!</h2>
<p>Hi ${name}, a spot opened up and your registration for <strong>${event.title}</strong> is now confirmed.</p>
<div class="detail-box">
  <p><strong>Date:</strong> ${fmtDate(event.starts_at)}</p>
  <p><strong>Time:</strong> ${fmtTime(event.starts_at)}</p>
  ${event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ''}
</div>
<a href="${eventUrl}" class="btn">View Event</a>
<a href="${calUrl}" class="btn-outline">Add to Google Calendar</a>
`
  await sendEmail(to, subject, layout(subject, body))
}

export async function sendStripePaymentConfirmed(
  to: string,
  name: string,
  event: EventInfo,
  ticket: TicketInfo,
  amountPaid: string,
): Promise<void> {
  const eventUrl = `${APP_URL}/events/${event.slug}`
  const calUrl = googleCalendarUrl(event, event.location ?? undefined)
  const subject = `Payment confirmed - ${event.title}`
  const body = `
<h2>Payment confirmed!</h2>
<p>Hi ${name}, your payment has been processed and you're registered for <strong>${event.title}</strong>.</p>
<div class="detail-box">
  <p><strong>Event:</strong> ${event.title}</p>
  <p><strong>Ticket:</strong> ${ticket.name}</p>
  <p><strong>Amount paid:</strong> ${amountPaid}</p>
  <p><strong>Date:</strong> ${fmtDate(event.starts_at)}</p>
  <p><strong>Time:</strong> ${fmtTime(event.starts_at)}</p>
  ${event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ''}
</div>
<a href="${eventUrl}" class="btn">View Event</a>
<a href="${calUrl}" class="btn-outline">Add to Google Calendar</a>
`
  await sendEmail(to, subject, layout(subject, body))
}

export async function sendEventCancelled(
  to: string,
  name: string,
  event: EventInfo,
): Promise<void> {
  const subject = `${event.title} has been cancelled`
  const body = `
<h2>Event cancelled</h2>
<p>Hi ${name}, we're sorry to let you know that <strong>${event.title}</strong> scheduled for ${fmtDate(event.starts_at)} has been cancelled.</p>
<p>If you paid for your ticket, you will receive a full refund within 5-10 business days.</p>
<p>We hope to see you at a future NODE event!</p>
<a href="${APP_URL}/events" class="btn">Browse Upcoming Events</a>
`
  await sendEmail(to, subject, layout(subject, body))
}

export async function sendEventPostponed(
  to: string,
  name: string,
  event: EventInfo,
  newDate: string,
): Promise<void> {
  const eventUrl = `${APP_URL}/events/${event.slug}`
  const subject = `${event.title} has been postponed`
  const body = `
<h2>Event postponed</h2>
<p>Hi ${name}, <strong>${event.title}</strong> has been postponed to a new date.</p>
<div class="detail-box">
  <p><strong>New date:</strong> ${newDate}</p>
</div>
<p>Your registration remains valid for the new date. Visit the event page for the latest details.</p>
<a href="${eventUrl}" class="btn">View Updated Event</a>
`
  await sendEmail(to, subject, layout(subject, body))
}

export async function sendEventReminder(
  to: string,
  name: string,
  event: EventInfo,
  hoursUntil: number,
): Promise<void> {
  const eventUrl = `${APP_URL}/events/${event.slug}`
  const calUrl = googleCalendarUrl(event, event.location ?? undefined)
  const timeLabel = hoursUntil <= 2 ? 'starts soon!' : hoursUntil <= 25 ? 'is tomorrow' : 'is coming up next week'
  const subject = `Reminder: ${event.title} ${timeLabel}`
  const body = `
<h2>${event.title} ${timeLabel}</h2>
<p>Hi ${name}, just a reminder that you're registered for <strong>${event.title}</strong>.</p>
<div class="detail-box">
  <p><strong>Date:</strong> ${fmtDate(event.starts_at)}</p>
  <p><strong>Time:</strong> ${fmtTime(event.starts_at)}</p>
  ${event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ''}
</div>
<a href="${eventUrl}" class="btn">View Event Details</a>
<a href="${calUrl}" class="btn-outline">Add to Google Calendar</a>
`
  await sendEmail(to, subject, layout(subject, body))
}

export async function sendAnnouncement(
  to: string,
  name: string,
  event: EventInfo,
  customSubject: string,
  message: string,
): Promise<void> {
  const eventUrl = `${APP_URL}/events/${event.slug}`
  const body = `
<h2>${customSubject}</h2>
<p>Hi ${name},</p>
<p>${message.replace(/\n/g, '<br>')}</p>
<br>
<a href="${eventUrl}" class="btn">View Event</a>
`
  await sendEmail(to, customSubject, layout(customSubject, body))
}

export async function sendPostEventEmail(
  to: string,
  name: string,
  event: EventInfo,
  surveyUrl?: string,
  recordingUrl?: string,
): Promise<void> {
  const subject = `Thanks for attending ${event.title}!`
  const body = `
<h2>Thanks for coming!</h2>
<p>Hi ${name}, thanks for attending <strong>${event.title}</strong>. It was great to see you there.</p>
${recordingUrl ? `<p>The recording is now available:</p><p><a href="${recordingUrl}" class="btn-outline">Watch Recording</a></p>` : ''}
${surveyUrl ? `<p>We'd love your feedback - it takes less than 2 minutes:</p><p><a href="${surveyUrl}" class="btn">Share Feedback</a></p>` : ''}
<p>Stay tuned for upcoming NODE events - we'll see you at the next one!</p>
<a href="${APP_URL}/events" class="btn-outline">Browse Upcoming Events</a>
`
  await sendEmail(to, subject, layout(subject, body))
}
