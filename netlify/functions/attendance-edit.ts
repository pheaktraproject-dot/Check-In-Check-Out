import type { Handler } from "@netlify/functions";
import { supabase } from "./_lib/supabase";
import { ok, fail, parseBody } from "./_lib/http";
import { requireAdmin } from "./_lib/auth";
import { logAction } from "./_lib/settings";

interface Body {
  attendanceId: string;
  checkIn?: string | null;
  checkOut?: string | null;
  note: string;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return fail(405, "Method not allowed");

  let admin;
  try {
    admin = await requireAdmin(event as any);
  } catch {
    return fail(403, "Admin access required.");
  }

  let body: Body;
  try {
    body = parseBody<Body>(event);
  } catch {
    return fail(400, "Invalid request body");
  }

  if (!body.attendanceId || !body.note?.trim()) {
    return fail(400, "attendanceId and a short note explaining the correction are both required.");
  }

  const update: Record<string, unknown> = {
    edited_by_admin: admin.id,
    edited_at: new Date().toISOString(),
    edit_note: body.note.trim()
  };
  if (body.checkIn !== undefined) update.check_in = body.checkIn;
  if (body.checkOut !== undefined) update.check_out = body.checkOut;
  if (body.checkOut) update.status = "checked_out";
  else if (body.checkIn && !body.checkOut) update.status = "checked_in";

  const { error } = await supabase.from("attendance").update(update).eq("id", body.attendanceId);
  if (error) return fail(500, "Could not save this correction.");

  await logAction(admin.id, "attendance_manual_edit", { attendanceId: body.attendanceId, note: body.note });

  return ok({ success: true });
};
