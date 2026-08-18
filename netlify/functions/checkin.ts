import type { Handler } from "@netlify/functions";
import { supabase } from "./_lib/supabase";
import { ok, fail, parseBody } from "./_lib/http";
import { requireUser } from "./_lib/auth";
import { getSettings, todayInTimezone, logAction } from "./_lib/settings";
import { validateQrToken, QrValidationError } from "./_lib/qr";

interface Body {
  qrValue: string;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return fail(405, "Method not allowed");

  let user;
  try {
    user = await requireUser(event as any);
  } catch {
    return fail(401, "Please log in again.");
  }

  let body: Body;
  try {
    body = parseBody<Body>(event);
  } catch {
    return fail(400, "Invalid request body");
  }

  if (!body.qrValue) return fail(400, "Please scan the attendance QR code first.");

  try {
    await validateQrToken(body.qrValue);
  } catch (err) {
    if (err instanceof QrValidationError) return fail(400, err.message);
    return fail(500, "Could not validate the QR code.");
  }

  const settings = await getSettings();
  const today = todayInTimezone(settings.timezone);
  const serverNow = new Date(); // Server-side clock — never trusts the browser.

  const { data: existing } = await supabase
    .from("attendance")
    .select("id, status, check_in")
    .eq("user_id", user.id)
    .eq("work_date", today)
    .maybeSingle();

  if (existing?.status === "checked_in") {
    return fail(409, "You are already checked in.");
  }

  if (existing && existing.check_in && existing.status === "checked_out") {
    // Already completed a full in/out cycle today.
    return fail(409, "You have already completed a check-in and check-out for today.");
  }

  let error;
  if (existing) {
    ({ error } = await supabase
      .from("attendance")
      .update({ check_in: serverNow.toISOString(), status: "checked_in" })
      .eq("id", existing.id));
  } else {
    ({ error } = await supabase.from("attendance").insert({
      user_id: user.id,
      work_date: today,
      check_in: serverNow.toISOString(),
      status: "checked_in"
    }));
  }

  if (error) return fail(500, "Could not record check-in. Please try again.");

  await logAction(user.id, "check_in", { at: serverNow.toISOString() });

  return ok({
    message: `Check-in successful — ${formatTime(serverNow, settings.timezone)}`,
    checkIn: serverNow.toISOString()
  });
};

function formatTime(date: Date, timezone: string): string {
  return date.toLocaleTimeString("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit"
  });
}
