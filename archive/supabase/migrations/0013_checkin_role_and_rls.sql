-- Rename 'staff' role value to 'checkin' for clarity
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_role_check;
UPDATE public.members SET role = 'checkin' WHERE role = 'staff';
ALTER TABLE public.members
  ADD CONSTRAINT members_role_check CHECK (role IN ('member', 'checkin', 'board'));

-- Allow board members to read and update all RSVPs (for admin view)
CREATE POLICY "board_rsvps_select_all"
  ON public.rsvps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = auth.uid() AND m.role = 'board'
    )
  );

CREATE POLICY "board_rsvps_update_all"
  ON public.rsvps FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = auth.uid() AND m.role = 'board'
    )
  );

-- Allow checkin role to read RSVPs for any event and update checked_in_at only
CREATE POLICY "checkin_rsvps_select_all"
  ON public.rsvps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = auth.uid() AND m.role = 'checkin'
    )
  );

CREATE POLICY "checkin_rsvps_update_checkin"
  ON public.rsvps FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = auth.uid() AND m.role = 'checkin'
    )
  )
  WITH CHECK (true);
