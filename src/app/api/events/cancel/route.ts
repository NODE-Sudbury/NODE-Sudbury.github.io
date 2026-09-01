export const dynamic = "force-dynamic";

import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { registrationId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { registrationId } = body;

  if (!registrationId || typeof registrationId !== "string") {
    return NextResponse.json(
      { error: "registrationId is required" },
      { status: 400 }
    );
  }

  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch the registration and verify ownership + status
  const { data: registration, error: fetchError } = await serviceClient
    .from("registrations")
    .select("id, event_id, member_id, status, waitlist_position")
    .eq("id", registrationId)
    .single();

  if (fetchError || !registration) {
    return NextResponse.json(
      { error: "Registration not found" },
      { status: 404 }
    );
  }

  // Verify the registration belongs to the current user via member lookup
  const { data: member, error: memberError } = await serviceClient
    .from("members")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (memberError || !member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (registration.member_id !== member.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (
    registration.status !== "confirmed" &&
    registration.status !== "waitlisted"
  ) {
    return NextResponse.json(
      { error: "Only confirmed or waitlisted registrations can be cancelled" },
      { status: 400 }
    );
  }

  const wasConfirmed = registration.status === "confirmed";

  // Cancel the registration
  const { error: cancelError } = await serviceClient
    .from("registrations")
    .update({ status: "cancelled" })
    .eq("id", registrationId);

  if (cancelError) {
    return NextResponse.json(
      { error: "Failed to cancel registration" },
      { status: 500 }
    );
  }

  let promoted = false;

  if (wasConfirmed) {
    // Check if the event has waitlist_auto_promote enabled
    const { data: event, error: eventError } = await serviceClient
      .from("events")
      .select("id, waitlist_auto_promote")
      .eq("id", registration.event_id)
      .single();

    if (!eventError && event && event.waitlist_auto_promote) {
      // Find the waitlisted registration with the lowest waitlist_position
      const { data: nextWaitlisted, error: waitlistError } = await serviceClient
        .from("registrations")
        .select("id, waitlist_position")
        .eq("event_id", registration.event_id)
        .eq("status", "waitlisted")
        .order("waitlist_position", { ascending: true })
        .limit(1)
        .single();

      if (!waitlistError && nextWaitlisted) {
        const now = new Date();
        const claimExpiresAt = new Date(
          now.getTime() + 24 * 60 * 60 * 1000
        ).toISOString();

        const { error: promoteError } = await serviceClient
          .from("registrations")
          .update({
            status: "confirmed",
            waitlist_position: null,
            waitlisted_promoted_at: now.toISOString(),
            claim_expires_at: claimExpiresAt,
          })
          .eq("id", nextWaitlisted.id);

        if (!promoteError) {
          promoted = true;
        }
      }
    }
  }

  return NextResponse.json({ ok: true, promoted });
}
