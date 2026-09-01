-- Add description column to event_templates (not in original 0017 schema)
ALTER TABLE public.event_templates ADD COLUMN IF NOT EXISTS description text;

-- Add insert/delete policies (0017 only added SELECT)
CREATE POLICY IF NOT EXISTS "templates_insert_board" ON public.event_templates
  FOR INSERT WITH CHECK (public.is_board());

CREATE POLICY IF NOT EXISTS "templates_update_board" ON public.event_templates
  FOR UPDATE USING (public.is_board());

CREATE POLICY IF NOT EXISTS "templates_delete_board" ON public.event_templates
  FOR DELETE USING (public.is_board());
