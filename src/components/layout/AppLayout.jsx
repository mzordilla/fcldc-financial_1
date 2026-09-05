import { Outlet, useLocation, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import AccessDenied from "./AccessDenied";
import ApprovalSidebar from "./ApprovalSidebar";
import TeamChat from "@/components/chat/TeamChat";
import { useAuth } from "@/lib/AuthContext";
import { canAccess, getAllowedRoutes } from "@/lib/access-control";
import useRoleAccess from "@/hooks/useRoleAccess";

export default function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const { config, isLoading } = useRoleAccess();
  const role = user?.role?.toLowerCase();

  if (role !== "admin" && isLoading) {
    return <div className="fixed inset-0 flex items-center justify-center"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  const allowed = canAccess(role, location.pathname, config);
  const allowedRoutes = getAllowedRoutes(role, config);
  if (!allowed && Array.isArray(allowedRoutes) && allowedRoutes.length > 0) {
    return <Navigate to={allowedRoutes[0]} replace />;
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
        className="pt-14 md:pt-0 pb-4 md:pb-0"
      >
        {allowed ? <Outlet /> : <AccessDenied />}
      </main>
      <ApprovalSidebar />
      <MobileNav />
      <TeamChat />
    </div>);

}