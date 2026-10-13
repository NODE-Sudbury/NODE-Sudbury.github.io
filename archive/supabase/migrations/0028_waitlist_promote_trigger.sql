-- NODE Events Platform
-- Migration: waitlist auto-promote trigger
-- Generated: 2026-08-29

CREATE OR REPLACE FUNCTION public.fn_promote_from_waitlist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_capacity     integer;
  v_confirmed    integer;
  v_next_reg_id  uuid;
BEGIN
  -- Only act when status changed TO cancelled
  IF NEW.status <> 'cancelled' OR OLD.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- Get event max_capacity
  SELECT max_capacity INTO v_capacity FROM events WHERE id = NEW.event_id;
  IF v_capacity IS NULL THEN RETURN NEW; END IF;  -- unlimited capacity

  -- Count current confirmed
  SELECT count(*) INTO v_confirmed
  FROM registrations
  WHERE event_id = NEW.event_id AND status = 'confirmed';

  -- If still at or over capacity, don't promote
  IF v_confirmed >= v_capacity THEN RETURN NEW; END IF;

  -- Find the next waitlisted registration (lowest waitlist_position)
  SELECT id INTO v_next_reg_id
  FROM registrations
  WHERE event_id = NEW.event_id AND status = 'waitlisted'
  ORDER BY waitlist_position ASC NULLS LAST, created_at ASC
  LIMIT 1;

  IF v_next_reg_id IS NULL THEN RETURN NEW; END IF;

  -- Promote them
  UPDATE registrations
  SET status = 'confirmed', waitlist_position = NULL
  WHERE id = v_next_reg_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_waitlist_promote ON public.registrations;
CREATE TRIGGER trg_waitlist_promote
  AFTER UPDATE OF status ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.fn_promote_from_waitlist();
