import { useEffect, useState } from "react";
import { api } from "../../lib/api";

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
        <table className="w-full min-w-[640px] text-left text-sm">
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
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => toggleRole(m)} className="mr-3 text-sm text-forest-600 underline">
                      {m.role === "admin" ? "Make Staff" : "Make Admin"}
                    </button>
                    <button onClick={() => toggleActive(m)} className="text-sm text-clay-500 underline">
                      {m.is_active ? "Disable" : "Enable"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
