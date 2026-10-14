/** What was done to a row: the log's three actions. */
export type ActivityAction = 'insert' | 'update' | 'delete';

/** One line of the activity log: who did what to which row, and when. */
export interface ActivityEntry {
  id: number;
  at: string;
  actorEmail: string;
  actorRole: string;
  action: ActivityAction;
  /** The table the row is in, such as `partners` or `board_members`. */
  table: string;
  summary: string;
  /** For a change, `{ field: { from, to } }`. For an addition or deletion, the whole row. */
  changes: Record<string, unknown>;
}
