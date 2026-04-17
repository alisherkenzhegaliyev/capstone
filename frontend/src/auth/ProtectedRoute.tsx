import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";


export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fef3c7] flex items-center justify-center text-slate-900">
        <div className="rounded-2xl border border-amber-200 bg-white/80 px-6 py-4 shadow-sm">
          Loading session...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
