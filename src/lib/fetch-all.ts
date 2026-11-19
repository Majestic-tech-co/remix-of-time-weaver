import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Table = keyof Database["public"]["Tables"];
type Order = [column: string, ascending?: boolean];
type PagedQuery = {
  order(column: string, opts?: { ascending?: boolean }): PagedQuery;
  range(from: number, to: number): PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;
};

const PAGE_SIZE = 1000;

// Supabase returns at most 1000 rows per request, so read every page. The
// trailing sort on the primary key keeps page boundaries stable when other columns tie.
export async function fetchAll<T>(
  table: Table,
  order: Order[] = [],
  primaryKey = "id",
): Promise<{ data: T[]; error: { message: string } | null }> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase.from(table).select("*") as unknown as PagedQuery;
    for (const [column, ascending = true] of [...order, [primaryKey, true] as Order]) query = query.order(column, { ascending });
    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
    if (error) return { data: rows, error };
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE_SIZE) return { data: rows, error: null };
  }
}
