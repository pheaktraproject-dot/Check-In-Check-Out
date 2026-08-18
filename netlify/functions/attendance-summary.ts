import type { Handler } from "@netlify/functions";
import { supabase } from "./_lib/supabase";
import { ok, fail } from "./_lib/http";
import { requireAdmin } from "./_lib/auth";
import { getSettings, todayInTimezone } from "./_lib/settings";
import { computeRow } from "./_lib/attendance-shape";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return fail(405, "Method not allowed");

  try {
    await requireAdmin(event as any);
  } catch {
    return fail(403, "Admin access required.");
  }

  const settings = await getSettings();
  const today = todayInTimezone(settings.timezone);

  const { count: totalStaff } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("role", "staff")
    .eq("is_active", true);

  const { data: todayRows } = await supabase
    .from("attendance")
    .select("id, user_id, work_date, check_in, check_out, status, edited_by_admin, edited_at, edit_note, users!attendance_user_id_fkey(name, email)")
    .eq("work_date", today);

  const computed = (todayRows ?? []).map((r: any) => computeRow(r, settings));

  const checkedIn = computed.filter((r) => r.status === "checked_in").length;
  const lateToday = computed.filter((r) => r.isLate).length;

  return ok({
    totalStaff: totalStaff ?? 0,
    checkedInNow: checkedIn,
    checkedOutNow: (totalStaff ?? 0) - checkedIn,
    todaysAttendanceCount: computed.length,
    lateToday,
    date: today
  });
};
