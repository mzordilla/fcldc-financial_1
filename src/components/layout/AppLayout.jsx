import { Outlet, useLocation, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import AccessDenied from "./AccessDenied";
import { useAuth } from "@/lib/AuthContext";
import { canAccess, roleAccess } from "@/lib/access-control";

export default function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();

  const role = user?.role?.toLowerCase();
  const allowed = canAccess(role, location.pathname);

  // Redirect non-admin users away from disallowed routes to their first allowed route
  if (!allowed) {
    const allowedRoutes = Array.isArray(roleAccess[role]) ? roleAccess[role] : [];
    if (allowedRoutes.length > 0) {
      return <Navigate to={allowedRoutes[0]} replace />;
    }
  }

  return (
    <div className="h-screen overflow-hidden flex bg-background">
      <div className="hidden md:block flex-shrink-0">
        <Sidebar />
      </div>
      <main className="flex-1 overflow-y-auto overflow-x-auto pb-20 md:pb-0 min-w-0">
        {allowed ? <Outlet /> : <AccessDenied />}
      </main>
      <MobileNav />
    </div>);

}