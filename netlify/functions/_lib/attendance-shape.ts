import type { AppSettings } from "./settings";

export interface AttendanceRow {
  id: string;
  user_id: string;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  status: "checked_in" | "checked_out";
  edited_by_admin: string | null;
  edited_at: string | null;
  edit_note: string | null;
  users?: { name: string; email: string } | { name: string; email: string }[] | null;
}

export interface ComputedAttendanceRow {
  id: string;
  date: string;
  staffName: string;
  email: string;
  checkIn: string | null;
  checkOut: string | null;
  totalHours: number | null;
  status: string;
  isLate: boolean;
  wasEdited: boolean;
}

export function computeRow(row: AttendanceRow, settings: AppSettings): ComputedAttendanceRow {
  const person = Array.isArray(row.users) ? row.users[0] : row.users;

  let totalHours: number | null = null;
  if (row.check_in && row.check_out) {
    const ms = new Date(row.check_out).getTime() - new Date(row.check_in).getTime();
    totalHours = Math.round((ms / 3600000) * 100) / 100;
  }

  const isLate = row.check_in ? isAfterLateThreshold(row.check_in, row.work_date, settings) : false;

  return {
    id: row.id,
    date: row.work_date,
    staffName: person?.name ?? "Unknown",
    email: person?.email ?? "",
    checkIn: row.check_in,
    checkOut: row.check_out,
    totalHours,
    status: row.status,
    isLate,
    wasEdited: Boolean(row.edited_by_admin)
  };
}

function isAfterLateThreshold(checkInIso: string, workDate: string, settings: AppSettings): boolean {
  const [startH, startM] = settings.work_start.split(":").map(Number);
  const thresholdMinutes = startH * 60 + startM + settings.late_threshold_minutes;

  const checkInLocal = new Date(checkInIso).toLocaleString("en-US", {
    timeZone: settings.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  const [inH, inM] = checkInLocal.split(":").map(Number);
  const checkInMinutes = inH * 60 + inM;

  return checkInMinutes > thresholdMinutes;
}
