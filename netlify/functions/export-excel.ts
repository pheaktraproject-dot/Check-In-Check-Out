import type { Handler } from "@netlify/functions";
import * as XLSX from "xlsx";
import { supabase } from "./_lib/supabase";
import { ok, fail } from "./_lib/http";
import { requireAdmin } from "./_lib/auth";
import { getSettings, logAction } from "./_lib/settings";
import { computeRow } from "./_lib/attendance-shape";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return fail(405, "Method not allowed");

  let admin;
  try {
    admin = await requireAdmin(event as any);
  } catch {
    return fail(403, "Admin access required.");
  }

  const params = event.queryStringParameters ?? {};
  const startDate = params.startDate; // YYYY-MM-DD
  const endDate = params.endDate; // YYYY-MM-DD

  if (!startDate || !endDate) {
    return fail(400, "startDate and endDate query parameters are required.");
  }

  const { data, error } = await supabase
    .from("attendance")
    .select("id, user_id, work_date, check_in, check_out, status, edited_by_admin, edited_at, edit_note, users!attendance_user_id_fkey(name, email)")
    .gte("work_date", startDate)
    .lte("work_date", endDate)
    .order("work_date", { ascending: true });

  if (error) return fail(500, "Could not load attendance records for export.");

  const settings = await getSettings();
  const rows = (data ?? []).map((r: any) => computeRow(r, settings));

  const sheetData = rows.map((r) => ({
    Date: r.date,
    "Staff Name": r.staffName,
    Email: r.email,
    "Check-In Time": r.checkIn ? formatDateTime(r.checkIn, settings.timezone) : "",
    "Check-Out Time": r.checkOut ? formatDateTime(r.checkOut, settings.timezone) : "",
    "Total Hours": r.totalHours ?? "",
    Status: r.status === "checked_in" ? "Checked In" : "Checked Out",
    Late: r.isLate ? "Yes" : "No",
    "Manually Edited": r.wasEdited ? "Yes" : "No"
  }));

  const worksheet = XLSX.utils.json_to_sheet(sheetData);
  worksheet["!cols"] = [
    { wch: 12 },
    { wch: 22 },
    { wch: 28 },
    { wch: 18 },
    { wch: 18 },
    { wch: 12 },
    { wch: 14 },
    { wch: 8 },
    { wch: 14 }
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const base64 = Buffer.from(buffer).toString("base64");

  const filename = `Attendance_${startDate}_to_${endDate}.xlsx`;

  await logAction(admin.id, "excel_export", { startDate, endDate, rowCount: rows.length });

  return ok({ filename, base64 });
};

function formatDateTime(iso: string, timezone: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
}
