-- Fix is_admin() to recognise members.role = 'board'/'admin' in addition to the legacy admins table.
-- Migration 0008 created is_admin() checking only the admins table. Migration 0012 introduced
-- members.role ('member' | 'staff' | 'board') as the primary role system, but the RLS policies
-- on events, hackathons, etc. still call is_admin(). This update makes them consistent.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins WHERE member_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.members WHERE id = auth.uid() AND role IN ('board', 'admin')
  )
$$;
