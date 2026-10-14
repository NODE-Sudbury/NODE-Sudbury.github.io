export type Row = Record<string, unknown>;

/**
 * The rows of a public table in Supabase, read with the public key as any visitor could. Undefined
 * when this build has no Supabase project or cannot reach it, so the site builds with its own data
 * instead. `what` names the content in the warning that says so.
 */
export const fetchPublicRows = async (
  table: string,
  order: string,
  what: string,
  url: string | undefined,
  anonKey: string | undefined,
): Promise<Row[] | undefined> => {
  if (!url || !anonKey) return undefined;
  try {
    const response = await fetch(`${url}/rest/v1/${table}?select=*&order=${order}`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const rows = (await response.json()) as unknown;
    return Array.isArray(rows) ? (rows as Row[]) : undefined;
  } catch (error) {
    console.warn(
      `Could not read ${what} from Supabase, so the site uses its own: ${error instanceof Error ? error.message : String(error)}`,
    );
    return undefined;
  }
};
