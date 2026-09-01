-- Hackathon multi-event arc: link a kickoff event to its finals event.
-- Teams form and submit at the kickoff; judging and bracket happen at the finals.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS hackathon_finals_event_id uuid
    REFERENCES events(id) ON DELETE SET NULL;

COMMENT ON COLUMN events.hackathon_finals_event_id IS
  'For hackathon kickoff events: the finals event where judging/bracket takes place. Submissions stay on the kickoff event.';
