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
    <div style={{ display: "flex", height: "100dvh", overflow: "hidden" }} className="bg-background">
      {/* Sidebar — flex child with min-height:0 so it can shrink and scroll */}
      <div
        className="hidden md:flex flex-shrink-0"
        style={{ minHeight: 0, overflowY: "auto" }}
      >
        <Sidebar />
      </div>
      {/* Main content — flex:1 with min-height:0 and min-width:0 enables independent scroll */}
      <main
        style={{ flex: 1, minHeight: 0, minWidth: 0, overflowY: "auto", overflowX: "auto" }}
        className="pb-20 md:pb-0"
      >
        {allowed ? <Outlet /> : <AccessDenied />}
      </main>
      <MobileNav />
    </div>);

}