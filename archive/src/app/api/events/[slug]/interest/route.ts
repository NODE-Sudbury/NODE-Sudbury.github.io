import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function createClient() {
  const cookieStore = cookies();
  return createServerClient(
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
}

async function resolveEvent(supabase: ReturnType<typeof createClient>, slug: string) {
  const { data: event, error } = await supabase
    .from("events")
    .select("id")
    .eq("slug", slug)
    .is("is_deleted", null)
    .single();

  if (error || !event) {
    return null;
  }
  return event;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const supabase = createClient();
  const { slug } = params;

  const event = await resolveEvent(supabase, slug);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const { count: interested_count } = await supabase
    .from("event_interests")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id);

  let is_interested = false;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: member } = await supabase
      .from("members")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (member) {
      const { data: existingRow } = await supabase
        .from("event_interests")
        .select("id")
        .eq("event_id", event.id)
        .eq("member_id", member.id)
        .maybeSingle();

      is_interested = !!existingRow;
    }
  }

  return NextResponse.json({
    interested_count: interested_count ?? 0,
    is_interested,
  });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const supabase = createClient();
  const { slug } = params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const event = await resolveEvent(supabase, slug);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (memberError || !member) {
    return NextResponse.json({ error: "Member record not found" }, { status: 404 });
  }

  const { data: existingRow } = await supabase
    .from("event_interests")
    .select("id")
    .eq("event_id", event.id)
    .eq("member_id", member.id)
    .maybeSingle();

  let interested: boolean;

  if (existingRow) {
    const { error: deleteError } = await supabase
      .from("event_interests")
      .delete()
      .eq("id", existingRow.id);

    if (deleteError) {
      return NextResponse.json({ error: "Failed to remove interest" }, { status: 500 });
    }
    interested = false;
  } else {
    const { error: insertError } = await supabase
      .from("event_interests")
      .insert({ event_id: event.id, member_id: member.id });

    if (insertError) {
      return NextResponse.json({ error: "Failed to register interest" }, { status: 500 });
    }
    interested = true;
  }

  const { count: interested_count } = await supabase
    .from("event_interests")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id);

  return NextResponse.json({
    interested,
    interested_count: interested_count ?? 0,
  });
}
