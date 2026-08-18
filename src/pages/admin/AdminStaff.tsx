import { useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: "staff" | "admin";
  is_active: boolean;
  created_at: string;
}

export default function AdminStaff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);

  async function load() {
    setLoading(true);
    const data = await api.get<{ staff: StaffMember[] }>("/admin-list-staff");
    setStaff(data.staff);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleRole(member: StaffMember) {
    const nextRole = member.role === "admin" ? "staff" : "admin";
    await api.post("/admin-set-role", { userId: member.id, role: nextRole });
    load();
  }

  async function toggleActive(member: StaffMember) {
    await api.post("/admin-set-role", { userId: member.id, isActive: !member.is_active });
    load();
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-forest-700">Staff</h1>
      <p className="mt-1 text-sm text-forest-400">{staff.length} registered accounts</p>

      <div className="mt-6 overflow-x-auto rounded-xl2 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-forest-50 text-forest-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-forest-400" colSpan={6}>
                  Loading…
                </td>
              </tr>
            ) : (
              staff.map((m) => (
                <tr key={m.id} className="border-b border-forest-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{m.name}</td>
                  <td className="px-4 py-3 text-forest-400">{m.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        m.role === "admin" ? "bg-forest-100 text-forest-700" : "bg-cream text-forest-400"
                      }`}
                    >
                      {m.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={m.is_active ? "text-forest-600" : "text-clay-500"}>
                      {m.is_active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-forest-400">{new Date(m.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => toggleRole(m)} className="mr-3 text-sm text-forest-600 underline">
                      {m.role === "admin" ? "Make Staff" : "Make Admin"}
                    </button>
                    <button onClick={() => toggleActive(m)} className="mr-3 text-sm text-clay-500 underline">
                      {m.is_active ? "Disable" : "Enable"}
                    </button>
                    <button onClick={() => setDeleteTarget(m)} className="text-sm text-red-600 underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {deleteTarget && (
        <DeleteConfirmModal
          member={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setDeleteTarget(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function DeleteConfirmModal({
  member,
  onClose,
  onDeleted
}: {
  member: StaffMember;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setError(null);
    setBusy(true);
    try {
      await api.post("/admin-delete-staff", { userId: member.id, confirm: confirmText });
      onDeleted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete this account. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl2 bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg text-red-600">Delete this account?</h2>
        <p className="mt-2 text-sm text-forest-400">
          This will permanently delete <strong>{member.name}</strong> ({member.email}) and their passkeys. This
          cannot be undone.
        </p>
        <p className="mt-2 text-sm text-forest-400">
          Their past attendance records will be kept for your history, but will no longer show their name.
        </p>

        <div className="mt-4">
          <label className="mb-1 block text-xs text-forest-400">
            Type <strong>DELETE</strong> to confirm
          </label>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full rounded-lg border border-forest-100 px-3 py-2 text-sm"
            placeholder="DELETE"
          />
        </div>

        {error && <p className="mt-3 text-sm text-clay-500">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-forest-100 px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={busy || confirmText !== "DELETE"}
            className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {busy ? "Deleting…" : "Delete Permanently"}
          </button>
        </div>
      </div>
    </div>
  );
}
