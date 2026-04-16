import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import AppLayout from "./layouts/AppLayout";

export function ProtectedRoute() {
  const accessToken = useAuthStore((s) => s.accessToken);
  if (!accessToken) return <Navigate to="/login" replace />;
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
