import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../lib/auth-context";

const links = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/staff", label: "Staff" },
  { to: "/admin/attendance", label: "Attendance" },
  { to: "/admin/qr", label: "QR Code" },
  { to: "/admin/settings", label: "Settings" }
];

export default function AdminLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-cream md:flex">
      <aside className="border-b border-forest-100 bg-forest-700 px-4 py-4 text-cream md:min-h-screen md:w-56 md:border-b-0 md:border-r">
        <p className="font-display text-lg">Alongsiders</p>
        <p className="text-xs text-forest-100">Admin</p>

        <nav className="mt-6 flex gap-2 overflow-x-auto md:mt-8 md:flex-col md:gap-1 md:overflow-visible">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium md:rounded-xl2 ${
                  isActive ? "bg-forest-600 text-white" : "text-forest-100 hover:bg-forest-600/50"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-8 hidden text-xs text-forest-100 md:block">
          <p>{user?.name}</p>
          <p className="text-forest-100/70">{user?.email}</p>
          <button onClick={logout} className="mt-3 underline">
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
