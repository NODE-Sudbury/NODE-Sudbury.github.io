-- Extend demo_day_showcases with missing fields
ALTER TABLE public.demo_day_showcases
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS slides_url text,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS slot_order integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

-- Board management policy (may already exist - guard with DO block)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'demo_day_showcases' AND policyname = 'demo_showcases_member_insert'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "demo_showcases_member_insert" ON public.demo_day_showcases
        FOR INSERT WITH CHECK (
          auth.uid() = (SELECT user_id FROM public.members WHERE id = member_id)
        )
    $pol$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'demo_day_showcases' AND policyname = 'demo_showcases_member_update_own'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "demo_showcases_member_update_own" ON public.demo_day_showcases
        FOR UPDATE USING (
          auth.uid() = (SELECT user_id FROM public.members WHERE id = member_id)
          AND status = 'pending'
        )
    $pol$;
  END IF;
END $$;
