-- Add role column for admin access control
-- board  = full admin (board members / organizers)
-- staff  = check-in only, scoped to assigned events
-- member = default, no admin access

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member'
    CHECK (role IN ('member', 'staff', 'board'));

CREATE INDEX IF NOT EXISTS idx_members_role ON public.members(role);

-- Board members can read ALL member rows (including private profiles)
CREATE POLICY "board_members_read_all"
  ON public.members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = auth.uid() AND m.role = 'board'
    )
  );

-- Board members can update any member row (e.g. assign roles)
CREATE POLICY "board_members_update_any"
  ON public.members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = auth.uid() AND m.role = 'board'
    )
  );

-- Seed: promote initial board member by email (update this to your email)
-- Run separately after migration if preferred:
-- UPDATE public.members SET role = 'board' WHERE email = 'your@email.com';
