import { useEffect, useState } from "react";
import { api } from "../../lib/api";

interface Settings {
  timezone: string;
  work_start: string;
  work_end: string;
  late_threshold_minutes: number;
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get<{ settings: Settings }>("/settings-get").then((d) => setSettings(d.settings));
  }, []);

  async function save() {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    try {
      await api.post("/settings-update", {
        timezone: settings.timezone,
        workStart: settings.work_start,
        workEnd: settings.work_end,
        lateThresholdMinutes: settings.late_threshold_minutes
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (!settings) return <p className="text-forest-400">Loading…</p>;

  return (
    <div className="max-w-md">
      <h1 className="font-display text-2xl text-forest-700">Attendance Settings</h1>

      <div className="mt-6 space-y-4 rounded-xl2 bg-white p-5 shadow-sm">
        <Field label="Timezone">
          <input
            value={settings.timezone}
            onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
            className="w-full rounded-lg border border-forest-100 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-forest-400">e.g. Asia/Phnom_Penh</p>
        </Field>

        <Field label="Work Start Time">
          <input
            type="time"
            value={settings.work_start.slice(0, 5)}
            onChange={(e) => setSettings({ ...settings, work_start: e.target.value })}
            className="w-full rounded-lg border border-forest-100 px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Work End Time">
          <input
            type="time"
            value={settings.work_end.slice(0, 5)}
            onChange={(e) => setSettings({ ...settings, work_end: e.target.value })}
            className="w-full rounded-lg border border-forest-100 px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Late Threshold (minutes after work start)">
          <input
            type="number"
            min={0}
            value={settings.late_threshold_minutes}
            onChange={(e) => setSettings({ ...settings, late_threshold_minutes: Number(e.target.value) })}
            className="w-full rounded-lg border border-forest-100 px-3 py-2 text-sm"
          />
        </Field>

        {saved && <p className="text-sm text-forest-600">Settings saved.</p>}

        <button
          onClick={save}
          disabled={saving}
          className="rounded-full bg-forest-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-ink">{label}</label>
      {children}
    </div>
  );
}
