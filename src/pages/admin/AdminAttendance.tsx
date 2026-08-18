import { useEffect, useState } from "react";
import { api } from "../../lib/api";

interface Record {
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

interface StaffOption {
  id: string;
  name: string;
}

export default function AdminAttendance() {
  const [records, setRecords] = useState<Record[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ date: "", userId: "", month: "", year: "", status: "" });
  const [editing, setEditing] = useState<Record | null>(null);
  const [exportRange, setExportRange] = useState({ startDate: "", endDate: "" });
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api.get<{ staff: StaffOption[] }>("/admin-list-staff").then((d) => setStaff(d.staff));
  }, []);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });
      const data = await api.get<{ records: Record[] }>(`/attendance-list?${params.toString()}`);
      setRecords(data.records);
    } catch (err) {
      setLoadError("Could not load attendance records. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleExport() {
    if (!exportRange.startDate || !exportRange.endDate) return;
    setExporting(true);
    try {
      const params = new URLSearchParams(exportRange);
      const data = await api.get<{ filename: string; base64: string }>(`/export-excel?${params.toString()}`);
      const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-forest-700">Attendance Records</h1>

      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl2 bg-white p-4 shadow-sm">
        <FilterField label="Date">
          <input
            type="date"
            value={filters.date}
            onChange={(e) => setFilters({ ...filters, date: e.target.value })}
            className="rounded-lg border border-forest-100 px-3 py-2 text-sm"
          />
        </FilterField>
        <FilterField label="Staff">
          <select
            value={filters.userId}
            onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
            className="rounded-lg border border-forest-100 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Month">
          <input
            type="number"
            min={1}
            max={12}
            placeholder="MM"
            value={filters.month}
            onChange={(e) => setFilters({ ...filters, month: e.target.value })}
            className="w-20 rounded-lg border border-forest-100 px-3 py-2 text-sm"
          />
        </FilterField>
        <FilterField label="Year">
          <input
            type="number"
            placeholder="YYYY"
            value={filters.year}
            onChange={(e) => setFilters({ ...filters, year: e.target.value })}
            className="w-24 rounded-lg border border-forest-100 px-3 py-2 text-sm"
          />
        </FilterField>
        <FilterField label="Status">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="rounded-lg border border-forest-100 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="checked_in">Checked In</option>
            <option value="checked_out">Checked Out</option>
          </select>
        </FilterField>
        <button onClick={load} className="rounded-full bg-forest-600 px-4 py-2 text-sm font-medium text-white">
          Apply Filters
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl2 bg-white p-4 shadow-sm">
        <FilterField label="Export from">
          <input
            type="date"
            value={exportRange.startDate}
            onChange={(e) => setExportRange({ ...exportRange, startDate: e.target.value })}
            className="rounded-lg border border-forest-100 px-3 py-2 text-sm"
          />
        </FilterField>
        <FilterField label="Export to">
          <input
            type="date"
            value={exportRange.endDate}
            onChange={(e) => setExportRange({ ...exportRange, endDate: e.target.value })}
            className="rounded-lg border border-forest-100 px-3 py-2 text-sm"
          />
        </FilterField>
        <button
          onClick={handleExport}
          disabled={exporting || !exportRange.startDate || !exportRange.endDate}
          className="rounded-full bg-clay-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {exporting ? "Preparing…" : "Download Excel"}
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl2 bg-white shadow-sm">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-forest-50 text-forest-400">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Staff</th>
              <th className="px-4 py-3">Check-In</th>
              <th className="px-4 py-3">Check-Out</th>
              <th className="px-4 py-3">Hours</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-forest-400" colSpan={7}>
                  Loading…
                </td>
              </tr>
            ) : loadError ? (
              <tr>
                <td className="px-4 py-6 text-clay-500" colSpan={7}>
                  {loadError}
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-forest-400" colSpan={7}>
                  No records match these filters.
                </td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.id} className="border-b border-forest-50 last:border-0">
                  <td className="px-4 py-3">{r.date}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{r.staffName}</p>
                    <p className="text-xs text-forest-400">{r.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    {r.checkIn ? formatTime(r.checkIn) : "—"}
                    {r.isLate && <span className="ml-1 text-xs text-clay-500">(late)</span>}
                  </td>
                  <td className="px-4 py-3">{r.checkOut ? formatTime(r.checkOut) : "—"}</td>
                  <td className="px-4 py-3">{r.totalHours ?? "—"}</td>
                  <td className="px-4 py-3">
                    {r.status === "checked_in" ? "Checked In" : "Checked Out"}
                    {r.wasEdited && <span className="ml-1 text-xs text-forest-400">(edited)</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setEditing(r)} className="text-sm text-forest-600 underline">
                      Correct
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditModal
          record={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-forest-400">{label}</label>
      {children}
    </div>
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EditModal({
  record,
  onClose,
  onSaved
}: {
  record: Record;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [checkIn, setCheckIn] = useState(toLocalInputValue(record.checkIn));
  const [checkOut, setCheckOut] = useState(toLocalInputValue(record.checkOut));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!note.trim()) {
      setError("Please add a short note explaining this correction.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/attendance-edit", {
        attendanceId: record.id,
        checkIn: checkIn ? new Date(checkIn).toISOString() : null,
        checkOut: checkOut ? new Date(checkOut).toISOString() : null,
        note
      });
      onSaved();
    } catch {
      setError("Could not save this correction. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl2 bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg text-forest-700">
          Correct record — {record.staffName} ({record.date})
        </h2>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs text-forest-400">Check-in time</label>
            <input
              type="datetime-local"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full rounded-lg border border-forest-100 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-forest-400">Check-out time</label>
            <input
              type="datetime-local"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full rounded-lg border border-forest-100 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-forest-400">Reason for correction</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Staff forgot to check out"
              className="w-full rounded-lg border border-forest-100 px-3 py-2 text-sm"
              rows={2}
            />
          </div>
          {error && <p className="text-sm text-clay-500">{error}</p>}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-forest-100 px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-full bg-forest-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Correction"}
          </button>
        </div>
      </div>
    </div>
  );
}
