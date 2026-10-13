-- Admin RLS policies: admins (stored in a simple role table) can manage all rows.
-- Uses a service-role check so the admin panel backend can bypass RLS via service key.

CREATE TABLE public.admins (
  member_id  uuid PRIMARY KEY REFERENCES public.members(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Only existing admins can see the admins table
CREATE POLICY "admins_select_self"
  ON public.admins FOR SELECT
  USING (auth.uid() = member_id);

-- Helper: returns true when the calling user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins WHERE member_id = auth.uid()
  )
$$;

-- Admins can read all member profiles (for moderation)
CREATE POLICY "members_admin_select"
  ON public.members FOR SELECT
  USING (public.is_admin());

-- Admins can publish/unpublish events
CREATE POLICY "events_admin_all"
  ON public.events FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admins can manage event speakers
CREATE POLICY "event_speakers_admin_all"
  ON public.event_speakers FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admins can manage RSVPs
CREATE POLICY "rsvps_admin_select"
  ON public.rsvps FOR SELECT
  USING (public.is_admin());

-- Admins can manage board members
CREATE POLICY "board_members_admin_all"
  ON public.board_members FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admins can manage partners
CREATE POLICY "partners_admin_all"
  ON public.partners FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admins can manage event series
CREATE POLICY "event_series_admin_all"
  ON public.event_series FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
