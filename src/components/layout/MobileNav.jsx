import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ArrowLeftRight, FileText, Landmark, LogOut, Building2,
  CreditCard, ShoppingCart, CircleDollarSign, Briefcase, BarChart2, ScanLine,
  ClipboardList, Boxes, Home, GitBranch, Menu, X
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { navItemsByRole, canAccess } from "@/lib/access-control";
import GlobalSearch from "./GlobalSearch";

const allNavItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Real Estate Portfolio", icon: Home, path: "/re/portfolio" },
  { label: "Projects", icon: Briefcase, path: "/projects" },
  { label: "Receivables", icon: FileText, path: "/receivables" },
  { label: "Purchase Orders", icon: ShoppingCart, path: "/purchase-orders" },
  { label: "Payment Approvals", icon: CircleDollarSign, path: "/payment-approvals" },
  { label: "Transactions", icon: ArrowLeftRight, path: "/transactions" },
  { label: "Payables", icon: CreditCard, path: "/payables" },
  { label: "Bank Accounts", icon: Building2, path: "/bank-accounts" },
  { label: "Working Capital Loans", icon: Landmark, path: "/working-capital-loans" },
  { label: "PPE Assets", icon: Boxes, path: "/ppe-assets" },
  { label: "Reports", icon: BarChart2, path: "/reports" },
  { label: "Receipt Scanner", icon: ScanLine, path: "/receipt-scanner" },
  { label: "Audit Trail", icon: ClipboardList, path: "/audit-trail" },
  { label: "Workflow Diagram", icon: GitBranch, path: "/workflow" },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  const role = user?.role?.toLowerCase();
  const allowed = navItemsByRole[role];
  const navItems = allowed === "all" ? allNavItems : allNavItems.filter(item => canAccess(role, item.path));

  return (
    <>
      {/* Top bar for mobile */}
      <div className="fixed top-0 left-0 right-0 z-50 md:hidden bg-sidebar text-sidebar-foreground flex items-center justify-between px-4 py-3 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <img src="https://media.base44.com/images/public/69f02f8501c3688565579a10/194dcac58_image.png" alt="FCLDC" className="w-7 h-7" />
          <span className="font-bold text-base">FCLDC Finance</span>
        </div>
        <button onClick={() => setOpen(true)} className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div className={`fixed top-0 left-0 bottom-0 z-[70] w-72 bg-sidebar text-sidebar-foreground flex flex-col md:hidden transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-5 border-b border-sidebar-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="https://media.base44.com/images/public/69f02f8501c3688565579a10/194dcac58_image.png" alt="FCLDC" className="w-9 h-9" />
            <div>
              <h1 className="font-bold text-base leading-tight">FCLDC</h1>
              <p className="text-xs text-sidebar-foreground/50">FINANCE</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 pb-0">
          <GlobalSearch />
        </div>

        <nav className="flex-1 p-4 overflow-y-auto space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="px-3 py-1.5 mb-2 rounded-md bg-sidebar-accent/50">
            <p className="text-xs text-sidebar-foreground/50">Logged in as</p>
            <p className="text-xs font-semibold text-sidebar-foreground capitalize">{user?.role}</p>
          </div>
          <button
            onClick={() => base44.auth.logout()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all w-full"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
}