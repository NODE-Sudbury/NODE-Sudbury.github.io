-- Add super admin flag - permanently protects a member from role changes
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;

-- Seed super admin by email
UPDATE public.members
  SET is_super_admin = true, role = 'board'
  WHERE email = 'hannanmaxdev@gmail.com';

-- Drop and recreate board update policy to exclude super admins
DROP POLICY IF EXISTS "board_members_update_any" ON public.members;

CREATE POLICY "board_members_update_any"
  ON public.members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = auth.uid() AND m.role = 'board'
    )
    AND is_super_admin = false
  );
