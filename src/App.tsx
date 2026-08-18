import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute, AdminRoute } from "./components/ProtectedRoute";
import { useAuth } from "./lib/auth-context";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import Dashboard from "./pages/Dashboard";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminStaff from "./pages/admin/AdminStaff";
import AdminAttendance from "./pages/admin/AdminAttendance";
import AdminQR from "./pages/admin/AdminQR";
import AdminSettings from "./pages/admin/AdminSettings";

export default function App() {
  const { user, loading } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="staff" element={<AdminStaff />} />
        <Route path="attendance" element={<AdminAttendance />} />
        <Route path="qr" element={<AdminQR />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      <Route
        path="/"
        element={
          loading ? null : user ? (
            <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
