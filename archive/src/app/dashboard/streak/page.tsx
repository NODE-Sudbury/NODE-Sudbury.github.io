export const dynamic = 'force-dynamic';

import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'No events yet';
  return new Date(dateStr).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function MotivationalMessage({ current, longest }: { current: number; longest: number }) {
  if (current === 0) {
    return (
      <p className="text-sm" style={{ color: '#8892a4' }}>
        Attend your first event to start building your streak.
      </p>
    );
  }
  if (current >= longest && longest > 0) {
    return (
      <p className="text-sm" style={{ color: '#38bdf8' }}>
        This is your personal best - you are on a record streak!
      </p>
    );
  }
  const diff = longest - current;
  return (
    <p className="text-sm" style={{ color: '#8892a4' }}>
      Keep going! {diff} more {diff === 1 ? 'event' : 'events'} to beat your record of {longest}.
    </p>
  );
}

export default async function StreakPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => cookieStore.get(n)?.value } }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  const userId = session.user.id;

  const [{ data: streakRow }, { data: recentEvents }] = await Promise.all([
    supabase
      .from('attendance_streaks')
      .select('current_streak, longest_streak, last_event_date')
      .eq('member_id', userId)
      .single(),
    supabase
      .from('event_registrations')
      .select('registered_at, events(title, start_date)')
      .eq('member_id', userId)
      .eq('status', 'attended')
      .order('registered_at', { ascending: false })
      .limit(5),
  ]);

  const streak = streakRow ?? { current_streak: 0, longest_streak: 0, last_event_date: null };

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#0d1117',
        padding: '2rem 1rem',
        fontFamily: 'system-ui, sans-serif',
        color: '#e2e8f0',
      }}
    >
      <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
            Attendance Streak
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#8892a4', marginTop: '0.375rem' }}>
            Track your consistency across NODE events.
          </p>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div
            style={{
              backgroundColor: '#13161f',
              border: '1px solid #252b3a',
              borderRadius: '0.75rem',
              padding: '1.25rem',
            }}
          >
            <p style={{ fontSize: '0.75rem', color: '#8892a4', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              Current Streak
            </p>
            <p style={{ fontSize: '2.5rem', fontWeight: 700, color: '#38bdf8', margin: '0.5rem 0 0' }}>
              {streak.current_streak}
            </p>
            <p style={{ fontSize: '0.75rem', color: '#8892a4', margin: '0.25rem 0 0' }}>
              {streak.current_streak === 1 ? 'event' : 'events'} in a row
            </p>
          </div>

          <div
            style={{
              backgroundColor: '#13161f',
              border: '1px solid #252b3a',
              borderRadius: '0.75rem',
              padding: '1.25rem',
            }}
          >
            <p style={{ fontSize: '0.75rem', color: '#8892a4', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              Longest Streak
            </p>
            <p style={{ fontSize: '2.5rem', fontWeight: 700, color: '#e2e8f0', margin: '0.5rem 0 0' }}>
              {streak.longest_streak}
            </p>
            <p style={{ fontSize: '0.75rem', color: '#8892a4', margin: '0.25rem 0 0' }}>
              personal best
            </p>
          </div>
        </div>

        {/* Last attended */}
        <div
          style={{
            backgroundColor: '#13161f',
            border: '1px solid #252b3a',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <p style={{ fontSize: '0.75rem', color: '#8892a4', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
            Last Event Attended
          </p>
          <p style={{ fontSize: '1rem', fontWeight: 600, color: '#e2e8f0', margin: 0 }}>
            {formatDate(streak.last_event_date)}
          </p>
          <MotivationalMessage current={streak.current_streak} longest={streak.longest_streak} />
        </div>

        {/* Recent attended events */}
        <div
          style={{
            backgroundColor: '#13161f',
            border: '1px solid #252b3a',
            borderRadius: '0.75rem',
            padding: '1.25rem',
          }}
        >
          <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 1rem' }}>
            Recent Attendance
          </h2>

          {!recentEvents || recentEvents.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: '#8892a4', margin: 0 }}>
              No attended events yet. Show up to your first event to get started.
            </p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentEvents.map((reg: any, i: number) => {
                const event = Array.isArray(reg.events) ? reg.events[0] : reg.events;
                return (
                  <li
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingBottom: i < recentEvents.length - 1 ? '0.75rem' : 0,
                      borderBottom: i < recentEvents.length - 1 ? '1px solid #252b3a' : 'none',
                    }}
                  >
                    <div>
                      <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#e2e8f0', margin: 0 }}>
                        {event?.title ?? 'Event'}
                      </p>
                      {event?.start_date && (
                        <p style={{ fontSize: '0.75rem', color: '#8892a4', margin: '0.125rem 0 0' }}>
                          {formatDate(event.start_date)}
                        </p>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        backgroundColor: '#052e16',
                        color: '#4ade80',
                        border: '1px solid #166534',
                        borderRadius: '9999px',
                        padding: '0.125rem 0.625rem',
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      attended
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
