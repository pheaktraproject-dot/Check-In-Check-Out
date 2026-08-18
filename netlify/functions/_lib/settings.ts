import { supabase } from "./supabase";

export interface AppSettings {
  timezone: string;
  work_start: string; // "HH:MM:SS"
  work_end: string;
  late_threshold_minutes: number;
}

export async function getSettings(): Promise<AppSettings> {
  const { data } = await supabase
    .from("app_settings")
    .select("timezone, work_start, work_end, late_threshold_minutes")
    .eq("id", 1)
    .single();

  return (
    data ?? {
      timezone: process.env.DEFAULT_TIMEZONE ?? "Asia/Phnom_Penh",
      work_start: process.env.DEFAULT_WORK_START ?? "08:00",
      work_end: process.env.DEFAULT_WORK_END ?? "17:00",
      late_threshold_minutes: Number(process.env.DEFAULT_LATE_THRESHOLD_MINUTES ?? 15)
    }
  );
}

/** Returns today's calendar date (YYYY-MM-DD) in the configured timezone. */
export function todayInTimezone(timezone: string): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: timezone }); // en-CA gives YYYY-MM-DD
}

export async function logAction(
  userId: string | null,
  action: string,
  metadata?: Record<string, unknown>
) {
  await supabase.from("audit_logs").insert({
    user_id: userId,
    action,
    metadata: metadata ?? {}
  });
}
