import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, ArrowLeftRight, FileText, Landmark, Building2, CreditCard, Banknote } from "lucide-react";

const navItems = [
  { label: "Home", icon: LayoutDashboard, path: "/" },
  { label: "Payables", icon: CreditCard, path: "/payables" },
  { label: "Suppliers", icon: Building2, path: "/suppliers" },
  { label: "Loans", icon: Banknote, path: "/bank-loans" },
  { label: "WC Loans", icon: Landmark, path: "/working-capital-loans" },
];

export default function MobileNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 md:hidden">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}