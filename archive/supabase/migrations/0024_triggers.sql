-- NODE Events Platform
-- Migration: Trigger functions and triggers
-- Generated: 2026-08-29

-- ============================================================
-- fn_update_total_points: recalculate members.total_points on INSERT
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_update_total_points()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.members
    SET total_points = total_points + NEW.delta
    WHERE id = NEW.member_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_point_events_total ON public.point_events;
CREATE TRIGGER trg_point_events_total
  AFTER INSERT ON public.point_events
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_total_points();

-- ============================================================
-- fn_update_quiz_score: add earned points to quiz_participants
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_update_quiz_score()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.quiz_participants
    SET score = score + NEW.points_earned
    WHERE room_id = NEW.room_id AND member_id = NEW.member_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_quiz_answer_score ON public.quiz_answers;
CREATE TRIGGER trg_quiz_answer_score
  AFTER INSERT ON public.quiz_answers
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_quiz_score();

-- ============================================================
-- fn_sync_qa_upvotes: keep live_qa_questions.upvotes in sync
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_sync_qa_upvotes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.live_qa_questions
    SET upvotes = (SELECT COUNT(*) FROM public.live_qa_upvotes
                   WHERE question_id = COALESCE(NEW.question_id, OLD.question_id))
    WHERE id = COALESCE(NEW.question_id, OLD.question_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_qa_upvotes ON public.live_qa_upvotes;
CREATE TRIGGER trg_qa_upvotes
  AFTER INSERT OR DELETE ON public.live_qa_upvotes
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_qa_upvotes();

-- ============================================================
-- fn_sync_poll_votes: keep live_poll_options.votes in sync
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_sync_poll_votes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.live_poll_options
    SET votes = (SELECT COUNT(*) FROM public.live_poll_votes
                 WHERE option_id = COALESCE(NEW.option_id, OLD.option_id))
    WHERE id = COALESCE(NEW.option_id, OLD.option_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_poll_votes ON public.live_poll_votes;
CREATE TRIGGER trg_poll_votes
  AFTER INSERT OR DELETE ON public.live_poll_votes
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_poll_votes();

-- ============================================================
-- fn_sync_demo_votes: keep demo_day_showcases.vote_count in sync
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_sync_demo_votes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.demo_day_showcases
    SET vote_count = (SELECT COUNT(*) FROM public.demo_day_votes
                      WHERE showcase_id = COALESCE(NEW.showcase_id, OLD.showcase_id))
    WHERE id = COALESCE(NEW.showcase_id, OLD.showcase_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_demo_votes ON public.demo_day_votes;
CREATE TRIGGER trg_demo_votes
  AFTER INSERT OR DELETE ON public.demo_day_votes
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_demo_votes();

-- ============================================================
-- set_retain_until: PIPEDA - set minor consent retain_until via trigger
-- Application code may also set it explicitly; trigger is a fallback.
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_retain_until()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.retain_until IS NULL THEN
    NEW.retain_until := (
      SELECT (ends_at + interval '2 years')::date
      FROM public.events WHERE id = NEW.event_id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_minor_consent_retain_until ON public.minor_consent_records;
CREATE TRIGGER trg_minor_consent_retain_until
  BEFORE INSERT ON public.minor_consent_records
  FOR EACH ROW EXECUTE FUNCTION public.set_retain_until();

-- ============================================================
-- touch_updated_at triggers for new tables
-- ============================================================
DROP TRIGGER IF EXISTS trg_hackathon_teams_updated_at ON public.hackathon_teams;
CREATE TRIGGER trg_hackathon_teams_updated_at
  BEFORE UPDATE ON public.hackathon_teams
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_hackathon_submissions_updated_at ON public.hackathon_submissions;
CREATE TRIGGER trg_hackathon_submissions_updated_at
  BEFORE UPDATE ON public.hackathon_submissions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_cfp_submissions_updated_at ON public.cfp_submissions;
CREATE TRIGGER trg_cfp_submissions_updated_at
  BEFORE UPDATE ON public.cfp_submissions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_quiz_rooms_updated_at ON public.quiz_rooms;
CREATE TRIGGER trg_quiz_rooms_updated_at
  BEFORE UPDATE ON public.quiz_rooms
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_registrations_updated_at ON public.registrations;
CREATE TRIGGER trg_registrations_updated_at
  BEFORE UPDATE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_attendance_streaks_updated_at ON public.attendance_streaks;
CREATE TRIGGER trg_attendance_streaks_updated_at
  BEFORE UPDATE ON public.attendance_streaks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_member_onboarding_updated_at ON public.member_onboarding_state;
CREATE TRIGGER trg_member_onboarding_updated_at
  BEFORE UPDATE ON public.member_onboarding_state
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
