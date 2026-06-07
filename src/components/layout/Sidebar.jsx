import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, ArrowLeftRight, FileText, Landmark, LogOut, Building2, CreditCard, Banknote, FolderKanban, ShoppingCart, CircleDollarSign, Briefcase, BarChart2, BookOpen, ScanLine, Users, RefreshCw, Receipt, PackageCheck, ClipboardList, Boxes, Package, Home, List, PieChart } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { navItemsByRole } from "@/lib/access-control";

// Groups define sidebar sections. Items without a group go ungrouped at the top.
const allNavItems = [
{ label: "Dashboard", icon: LayoutDashboard, path: "/" },
{ label: "Condo Units", icon: Home, path: "/re/units", group: "Real Estate Portfolio" },
{ label: "Tenants", icon: Users, path: "/re/tenants", group: "Real Estate Portfolio" },
{ label: "Listings", icon: List, path: "/re/listings", group: "Real Estate Portfolio" },
{ label: "Portfolio Reports", icon: PieChart, path: "/re/reports", group: "Real Estate Portfolio" },
{ label: "Projects", icon: Briefcase, path: "/projects" },
{ label: "Project P&L", icon: FolderKanban, path: "/project-pnl" },
{ label: "Billing Cycles", icon: Receipt, path: "/billing-cycles" },
{ label: "Receivables", icon: FileText, path: "/receivables" },
{ label: "Purchase Orders", icon: ShoppingCart, path: "/purchase-orders" },
{ label: "Payment Approvals", icon: CircleDollarSign, path: "/payment-approvals" },
{ label: "Receiving Items", icon: PackageCheck, path: "/receiving-items" },
{ label: "Materials History", icon: Package, path: "/materials-history" },
{ label: "Transactions", icon: ArrowLeftRight, path: "/transactions" },
{ label: "Payables", icon: CreditCard, path: "/payables" },
{ label: "Supplier Masterlist", icon: Users, path: "/payees" },
{ label: "Bank Accounts", icon: Building2, path: "/bank-accounts" },
{ label: "Bank Reconciliation", icon: RefreshCw, path: "/bank-reconciliation" },
{ label: "Working Capital Loans", icon: Landmark, path: "/working-capital-loans" },
{ label: "PPE Assets", icon: Boxes, path: "/ppe-assets" },
{ label: "Reports", icon: BarChart2, path: "/reports" },
{ label: "Chart of Accounts", icon: BookOpen, path: "/chart-of-accounts" },
{ label: "Receipt Scanner", icon: ScanLine, path: "/receipt-scanner" },
{ label: "Audit Trail", icon: ClipboardList, path: "/audit-trail" }];


export default function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();

  const role = user?.role?.toLowerCase();
  const allowed = navItemsByRole[role];
  const navItems = allowed === "all" ? allNavItems : allNavItems.filter((item) => allowed.includes(item.path));

  return (
    <aside className="h-screen w-64 bg-sidebar text-sidebar-foreground flex flex-col z-50 sticky top-0">
      <div className="p-6 border-b border-sidebar-border">
         <div className="flex items-center gap-3">
           <img src="https://media.base44.com/images/public/69f02f8501c3688565579a10/194dcac58_image.png" alt="FCLDC" className="w-10 h-10" />
           <div>
             <h1 className="font-bold text-lg leading-tight">FCLDC</h1>
             <p className="text-xs text-sidebar-foreground/50">FINANCE</p>
           </div>
         </div>
       </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        {(() => {
          const ungrouped = navItems.filter(i => !i.group);
          const groups = [...new Set(navItems.filter(i => i.group).map(i => i.group))];

          const renderLink = (item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive ?
                "bg-primary text-primary-foreground shadow-lg shadow-primary/25" :
                "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"}`}>
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          };

          return (
            <div className="space-y-1">
              {ungrouped.map(renderLink)}
              {groups.map(group => {
                const groupItems = navItems.filter(i => i.group === group);
                return (
                  <div key={group} className="mt-3">
                    <div className="px-3 pt-2 pb-1">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">{group}</p>
                    </div>
                    <div className="space-y-1">
                      {groupItems.map(renderLink)}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="px-3 py-1.5 mb-2 rounded-md bg-sidebar-accent/50">
          <p className="text-xs text-sidebar-foreground/50">Logged in as</p>
          <p className="text-xs font-semibold text-sidebar-foreground capitalize">{user?.role}</p>
        </div>
        <button
          onClick={() => base44.auth.logout()}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all w-full">
          
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>);

}