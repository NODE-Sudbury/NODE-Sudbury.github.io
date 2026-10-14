-- Enforce max_capacity on events. Puts newcomers on waitlist when full.
-- Called from application layer via RPC to keep it transactional.

CREATE OR REPLACE FUNCTION public.rsvp_for_event(p_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_member_id   uuid := auth.uid();
  v_capacity    integer;
  v_confirmed   integer;
  v_waitlist_pos integer;
  v_status      text;
BEGIN
  IF v_member_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT max_capacity INTO v_capacity
  FROM public.events
  WHERE id = p_event_id AND is_published = true AND is_cancelled = false;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'event_not_found');
  END IF;

  -- Count current confirmed attendees
  SELECT COUNT(*) INTO v_confirmed
  FROM public.rsvps
  WHERE event_id = p_event_id AND status = 'confirmed';

  -- Determine status
  IF v_capacity IS NULL OR v_confirmed < v_capacity THEN
    v_status := 'confirmed';
    v_waitlist_pos := NULL;
  ELSE
    v_status := 'waitlisted';
    SELECT COALESCE(MAX(waitlist_position), 0) + 1 INTO v_waitlist_pos
    FROM public.rsvps
    WHERE event_id = p_event_id AND status = 'waitlisted';
  END IF;

  INSERT INTO public.rsvps (event_id, member_id, status, waitlist_position)
  VALUES (p_event_id, v_member_id, v_status, v_waitlist_pos)
  ON CONFLICT (event_id, member_id) DO UPDATE
    SET status = EXCLUDED.status,
        waitlist_position = EXCLUDED.waitlist_position,
        updated_at = now();

  RETURN jsonb_build_object('success', true, 'status', v_status, 'waitlist_position', v_waitlist_pos);
END;
$$;
