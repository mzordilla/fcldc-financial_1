import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Search, Briefcase, ShoppingCart, Users, FileSignature, GitPullRequest,
  Receipt, Banknote, Building2, FileStack,
} from "lucide-react";

const MODULES = [
  { key: "projects", label: "Projects", icon: Briefcase, entity: "Project", nameField: "project_name", subField: "project_code" },
  { key: "purchase_orders", label: "Purchase Orders", icon: ShoppingCart, entity: "PurchaseOrder", nameField: "po_number", subField: "supplier_name" },
  { key: "vendors", label: "Vendors", icon: Users, entity: "Payee", nameField: "name", subField: "category" },
  { key: "clients", label: "Clients", icon: Building2, entity: "Client", nameField: "client_name", subField: "contact_person" },
  { key: "contracts", label: "Contracts", icon: FileSignature, entity: "Contract", nameField: "contract_number", subField: "project_name" },
  { key: "change_orders", label: "Change Orders", icon: GitPullRequest, entity: "ChangeOrder", nameField: "co_number", subField: "project_name" },
  { key: "invoices", label: "Invoices", icon: Receipt, entity: "Receivable", nameField: "invoice_number", subField: "client_name" },
  { key: "payments", label: "Payments", icon: Banknote, entity: "PaymentRequest", nameField: "request_number", subField: "payee" },
  { key: "documents", label: "Documents", icon: FileStack, entity: "CorporateDocument", nameField: "name", subField: "category" },
];

const destinationFor = (module, record) => {
  switch (module.key) {
    case "projects": return `/projects/${record.id}`;
    case "contracts":
    case "change_orders": return record.project_id ? `/projects/${record.project_id}` : "/projects";
    case "purchase_orders": return "/purchase-orders";
    case "vendors": return "/payees";
    case "clients": return "/clients";
    case "invoices": return "/receivables";
    case "payments": return "/payment-approvals";
    case "documents": return "/reports";
    default: return "/";
  }
};

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const queries = useQuery({
    queryKey: ["global-search-data"],
    queryFn: async () => {
      const results = await Promise.all(
        MODULES.map((m) => base44.entities[m.entity].list("-created_date", 500))
      );
      return Object.fromEntries(MODULES.map((m, i) => [m.key, results[i]]));
    },
    enabled: open,
    staleTime: 60000,
  });

  const data = queries.data || {};

  const groupedResults = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return MODULES.map((module) => {
      const records = data[module.key] || [];
      const matches = records.filter((r) => {
        const name = String(r[module.nameField] || "").toLowerCase();
        const sub = String(r[module.subField] || "").toLowerCase();
        return name.includes(term) || sub.includes(term);
      }).slice(0, 8);
      return { module, matches };
    }).filter((g) => g.matches.length > 0);
  }, [query, data]);

  const handleSelect = (module, record) => {
    setOpen(false);
    setQuery("");
    navigate(destinationFor(module, record));
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 bg-sidebar-accent/40 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
      >
        <Search className="w-4 h-4" />
        <span>Global Search...</span>
      </button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setQuery(""); }}>
        <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Input
              autoFocus
              placeholder="Search projects, POs, vendors, clients, contracts, invoices, payments, documents..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0 px-0 h-8"
            />
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {query.trim() === "" && (
              <p className="text-center text-sm text-muted-foreground py-8">Start typing to search across all modules</p>
            )}
            {query.trim() !== "" && queries.isLoading && (
              <p className="text-center text-sm text-muted-foreground py-8">Loading...</p>
            )}
            {query.trim() !== "" && !queries.isLoading && groupedResults.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">No results found</p>
            )}
            {groupedResults.map(({ module, matches }) => (
              <div key={module.key} className="mb-2">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{module.label}</p>
                {matches.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleSelect(module, r)}
                    className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left hover:bg-muted transition-colors"
                  >
                    <module.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{r[module.nameField] || "Untitled"}</p>
                      {r[module.subField] && <p className="text-xs text-muted-foreground truncate">{r[module.subField]}</p>}
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}