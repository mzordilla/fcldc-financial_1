import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import AccessDenied from "./AccessDenied";
import { useAuth } from "@/lib/AuthContext";
import { canAccess } from "@/lib/access-control";

export default function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();

  const role = user?.role || "procurement";
  const allowed = canAccess(role, location.pathname);

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