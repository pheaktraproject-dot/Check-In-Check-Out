import type { Handler } from "@netlify/functions";
import { supabase } from "./_lib/supabase";
import { ok, fail } from "./_lib/http";
import { requireAdmin } from "./_lib/auth";
import { getSettings } from "./_lib/settings";
import { computeRow } from "./_lib/attendance-shape";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return fail(405, "Method not allowed");

  try {
    await requireAdmin(event as any);
  } catch {
    return fail(403, "Admin access required.");
  }

  const params = event.queryStringParameters ?? {};
  const { date, userId, month, year, status } = params as Record<string, string | undefined>;

  let query = supabase
    .from("attendance")
    .select("id, user_id, work_date, check_in, check_out, status, edited_by_admin, edited_at, edit_note, users!attendance_user_id_fkey(name, email)")
    .order("work_date", { ascending: false });

  if (date) query = query.eq("work_date", date);
  if (userId) query = query.eq("user_id", userId);
  if (status) query = query.eq("status", status);
  if (year && month) {
    const y = Number(year);
    const m = Number(month);
    const start = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    query = query.gte("work_date", start).lte("work_date", end);
  } else if (year) {
    query = query.gte("work_date", `${year}-01-01`).lte("work_date", `${year}-12-31`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("attendance-list query error:", JSON.stringify(error));
    return fail(500, "Could not load attendance records.");
  }

  const settings = await getSettings();
  const rows = (data ?? []).map((r: any) => computeRow(r, settings));

  return ok({ records: rows });
};
