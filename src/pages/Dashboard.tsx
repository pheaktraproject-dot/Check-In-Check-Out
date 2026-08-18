import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import { registerPasskey, browserSupportsWebAuthn } from "../lib/webauthn";
import { useAuth } from "../lib/auth-context";
import QrScanner from "../components/QrScanner";
import InstallPrompt from "../components/InstallPrompt";

interface TodayStatus {
  date: string;
  status: "checked_in" | "checked_out";
  checkIn: string | null;
  checkOut: string | null;
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [today, setToday] = useState<TodayStatus | null>(null);
  const [passkeyCount, setPasskeyCount] = useState(0);
  const [pendingAction, setPendingAction] = useState<"in" | "out" | null>(null);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingUpPasskey, setSettingUpPasskey] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const data = await api.get<{ today: TodayStatus; passkeys: unknown[] }>("/me");
      setToday(data.today);
      setPasskeyCount(data.passkeys.length);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  function startAction(action: "in" | "out") {
    setError(null);
    setMessage(null);
    setPendingAction(action);
    setScanning(true);
  }

  async function handleScan(qrValue: string) {
    setScanning(false);
    if (!pendingAction) return;
    try {
      const endpoint = pendingAction === "in" ? "/checkin" : "/checkout";
      const data = await api.post<{ message: string }>(endpoint, { qrValue });
      setMessage(data.message);
      await loadStatus();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleAddPasskey() {
    setSettingUpPasskey(true);
    setError(null);
    try {
      await registerPasskey("Added from dashboard");
      await loadStatus();
      setMessage("Passkey added. You can now sign in with your fingerprint or Face ID.");
    } catch {
      setError("We couldn't set up your passkey. Please try again.");
    } finally {
      setSettingUpPasskey(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-cream">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-forest-100 border-t-forest-600" />
      </div>
    );
  }

  const isCheckedIn = today?.status === "checked_in";
  const firstName = user?.name.split(" ")[0] ?? "";

  return (
    <div className="min-h-screen bg-cream pb-10">
      <header className="flex items-center justify-between px-5 pt-6">
        <div>
          <p className="font-display text-2xl text-forest-700">Good {timeOfDayGreeting()}, {firstName}</p>
          <p className="text-sm text-forest-400">{user?.email}</p>
        </div>
        <button onClick={logout} className="text-sm text-forest-400 underline">
          Log out
        </button>
      </header>

      <InstallPrompt />

      <main className="mx-4 mt-4 space-y-4">
        <section className="rounded-xl2 bg-white p-5 shadow-sm">
          <p className="text-sm text-forest-400">Today's status</p>
          <p className={`font-display text-xl ${isCheckedIn ? "text-forest-600" : "text-clay-500"}`}>
            {isCheckedIn ? "Checked In" : "Checked Out"}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <TimeBox label="Check-in" value={today?.checkIn} />
            <TimeBox label="Check-out" value={today?.checkOut} />
          </div>
        </section>

        {message && <p className="rounded-xl2 bg-forest-100 px-4 py-3 text-sm text-forest-700">{message}</p>}
        {error && <p className="rounded-xl2 bg-clay-400/10 px-4 py-3 text-sm text-clay-500">{error}</p>}

        <div className="grid grid-cols-1 gap-4">
          <button
            onClick={() => startAction("in")}
            disabled={isCheckedIn}
            className="flex items-center justify-center gap-3 rounded-xl2 bg-forest-600 py-6 text-xl font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            🟢 CHECK IN
          </button>
          <button
            onClick={() => startAction("out")}
            disabled={!isCheckedIn}
            className="flex items-center justify-center gap-3 rounded-xl2 bg-clay-500 py-6 text-xl font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            🔴 CHECK OUT
          </button>
        </div>

        {passkeyCount === 0 && browserSupportsWebAuthn() && (
          <section className="rounded-xl2 border border-clay-400/40 bg-white p-4">
            <p className="text-sm text-ink">
              You haven't set up a passkey yet. Add one for faster, more secure sign-in with your fingerprint or
              Face ID.
            </p>
            <button
              onClick={handleAddPasskey}
              disabled={settingUpPasskey}
              className="mt-3 rounded-full bg-forest-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {settingUpPasskey ? "Setting up…" : "Set Up Passkey"}
            </button>
          </section>
        )}
      </main>

      {scanning && (
        <QrScanner
          onScan={handleScan}
          onClose={() => {
            setScanning(false);
            setPendingAction(null);
          }}
        />
      )}
    </div>
  );
}

function TimeBox({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-xl border border-forest-50 bg-forest-50/50 px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-forest-400">{label}</p>
      <p className="font-medium text-ink">
        {value
          ? new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
          : "—"}
      </p>
    </div>
  );
}

function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
