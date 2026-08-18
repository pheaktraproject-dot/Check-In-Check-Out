import { useEffect, useState } from "react";
import { api } from "../../lib/api";

interface Summary {
  totalStaff: number;
  checkedInNow: number;
  checkedOutNow: number;
  todaysAttendanceCount: number;
  lateToday: number;
  date: string;
}

export default function AdminDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    api.get<Summary>("/attendance-summary").then(setSummary);
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl text-forest-700">Dashboard</h1>
      <p className="mt-1 text-sm text-forest-400">Attendance summary for {summary?.date ?? "today"}</p>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Staff" value={summary?.totalStaff} />
        <StatCard label="Currently Checked In" value={summary?.checkedInNow} accent="forest" />
        <StatCard label="Currently Checked Out" value={summary?.checkedOutNow} accent="clay" />
        <StatCard label="Today's Attendance" value={summary?.todaysAttendanceCount} />
        <StatCard label="Late Today" value={summary?.lateToday} accent="clay" />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent
}: {
  label: string;
  value: number | undefined;
  accent?: "forest" | "clay";
}) {
  return (
    <div className="rounded-xl2 bg-white p-5 shadow-sm">
      <p className="text-sm text-forest-400">{label}</p>
      <p
        className={`mt-1 font-display text-3xl ${
          accent === "forest" ? "text-forest-600" : accent === "clay" ? "text-clay-500" : "text-ink"
        }`}
      >
        {value ?? "—"}
      </p>
    </div>
  );
}
