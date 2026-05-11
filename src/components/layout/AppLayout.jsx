import { Outlet, useLocation, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import AccessDenied from "./AccessDenied";
import { useAuth } from "@/lib/AuthContext";
import { canAccess, roleAccess } from "@/lib/access-control";

export default function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();

  const role = user?.role;
  const allowed = canAccess(role, location.pathname);

  // Redirect non-admin users away from "/" to their first allowed route
  if (!allowed && role !== "admin") {
    const allowedRoutes = roleAccess[role];
    if (Array.isArray(allowedRoutes) && allowedRoutes.length > 0) {
      return <Navigate to={allowedRoutes[0]} replace />;
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <main className="md:ml-64 pb-20 md:pb-0">
        {allowed ? <Outlet /> : <AccessDenied />}
      </main>
      <MobileNav />
    </div>
  );
}