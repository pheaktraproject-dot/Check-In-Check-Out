import type { Handler } from "@netlify/functions";
import { supabase } from "./_lib/supabase";
import { ok, fail } from "./_lib/http";
import { requireUser } from "./_lib/auth";
import { getSettings, todayInTimezone } from "./_lib/settings";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return fail(405, "Method not allowed");

  let user;
  try {
    user = await requireUser(event as any);
  } catch {
    return fail(401, "Please log in again.");
  }

  const settings = await getSettings();
  const today = todayInTimezone(settings.timezone);

  const { data: todayRow } = await supabase
    .from("attendance")
    .select("check_in, check_out, status")
    .eq("user_id", user.id)
    .eq("work_date", today)
    .maybeSingle();

  const { data: credentials } = await supabase
    .from("webauthn_credentials")
    .select("id, nickname, created_at, last_used_at")
    .eq("user_id", user.id);

  return ok({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    today: {
      date: today,
      status: todayRow?.status ?? "checked_out",
      checkIn: todayRow?.check_in ?? null,
      checkOut: todayRow?.check_out ?? null
    },
    passkeys: credentials ?? [],
    timezone: settings.timezone
  });
};
