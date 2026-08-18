import type { Handler } from "@netlify/functions";
import { supabase } from "./_lib/supabase";
import { ok, fail, parseBody } from "./_lib/http";
import { requireAdmin } from "./_lib/auth";
import { logAction } from "./_lib/settings";

interface Body {
  timezone?: string;
  workStart?: string;
  workEnd?: string;
  lateThresholdMinutes?: number;
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

  const update: Record<string, unknown> = {};
  if (body.timezone) update.timezone = body.timezone;
  if (body.workStart) update.work_start = body.workStart;
  if (body.workEnd) update.work_end = body.workEnd;
  if (typeof body.lateThresholdMinutes === "number") update.late_threshold_minutes = body.lateThresholdMinutes;
  update.updated_at = new Date().toISOString();

  const { error } = await supabase.from("app_settings").update(update).eq("id", 1);
  if (error) return fail(500, "Could not save settings.");

  await logAction(admin.id, "settings_updated", update);

  return ok({ success: true });
};
