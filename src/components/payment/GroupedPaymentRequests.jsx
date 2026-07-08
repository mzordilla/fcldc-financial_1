import { useState } from "react";
import { ChevronDown, ChevronUp, Clock, CheckCircle, XCircle, Banknote, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

const statusConfig = {
  pending: { label: "Pending", icon: Clock, color: "bg-chart-3/10 text-chart-3 border-chart-3/20" },
  approved: { label: "Approved", icon: CheckCircle, color: "bg-primary/10 text-primary border-primary/20" },
  rejected: { label: "Rejected", icon: XCircle, color: "bg-destructive/10 text-destructive border-destructive/20" },
  paid: { label: "Paid", icon: Banknote, color: "bg-chart-2/10 text-chart-2 border-chart-2/20" },
};

export default function GroupedPaymentRequests({ requests, expandedGroups, toggleGroup, renderPRRow, isAdmin, selectedIds, toggleSelect }) {
  const [search, setSearch] = useState("");
  const [expandedSuppliers, setExpandedSuppliers] = useState(new Set());

  const toggleSupplier = (key) => {
    setExpandedSuppliers(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // Group by status first
  const grouped = requests.reduce((acc, pr) => {
    const status = pr.approval_status || "pending";
    if (!acc[status]) acc[status] = [];
    acc[status].push(pr);
    return acc;
  }, {});

  const statusOrder = ["pending", "approved", "rejected", "paid"];

  const filteredGrouped = {};
  statusOrder.forEach(status => {
    const pos = grouped[status] || [];
    if (pos.length === 0) return;
    filteredGrouped[status] = pos.filter(pr => {
      const q = search.toLowerCase();
      if (!q) return true;
      return (
        (pr.payee || "").toLowerCase().includes(q) ||
        (pr.description || "").toLowerCase().includes(q) ||
        (pr.invoice_number || "").toLowerCase().includes(q) ||
        (pr.request_number || "").toLowerCase().includes(q)
      );
    });
  });

  // Group each status's requests by supplier
  const bySupplierPerStatus = {};
  statusOrder.forEach(status => {
    const prs = filteredGrouped[status] || [];
    const bySupplier = {};
    prs.forEach(pr => {
      const supplier = pr.payee || "Unknown Supplier";
      if (!bySupplier[supplier]) bySupplier[supplier] = [];
      bySupplier[supplier].push(pr);
    });
    bySupplierPerStatus[status] = bySupplier;
  });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by payee, invoice #, description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      {statusOrder.map((status) => {
        const prs = filteredGrouped[status] || [];
        if (prs.length === 0) return null;
        const config = statusConfig[status];
        const isExpanded = expandedGroups[status];
        const StatusIcon = config.icon;
        const totalAmount = prs.reduce((sum, pr) => sum + (pr.amount || 0), 0);

        const bySupplier = bySupplierPerStatus[status] || {};
        const supplierEntries = Object.entries(bySupplier).sort((a, b) => a[0].localeCompare(b[0]));

        return (
          <div key={status} className="border border-border rounded-2xl overflow-hidden bg-card">
            <button
              onClick={() => toggleGroup(status)}
              className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted/70 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${config.color}`}>
                  <StatusIcon className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-foreground">{config.label}</p>
                  <p className="text-xs text-muted-foreground">{prs.length} request{prs.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  ₱{totalAmount.toLocaleString()}
                </Badge>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </button>
            {isExpanded && (
              <div className="p-3 space-y-2">
                {supplierEntries.map(([supplier, supplierPRs]) => {
                  const supplierTotal = supplierPRs.reduce((sum, pr) => sum + (pr.amount || 0), 0);
                  const supplierKey = `${status}::${supplier}`;
                  const supplierExpanded = expandedSuppliers.has(supplierKey);
                  return (
                    <div key={supplier} className="border border-border rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleSupplier(supplierKey)}
                        className="w-full bg-muted/20 hover:bg-muted/40 px-3 py-1.5 border-b border-border flex items-center gap-2 transition-colors"
                      >
                        {supplierExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                        <span className="text-xs font-bold uppercase tracking-wide text-foreground">{supplier}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{supplierPRs.length} invoice{supplierPRs.length !== 1 ? "s" : ""}</span>
                        <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-muted text-foreground font-mono font-semibold">₱{supplierTotal.toLocaleString()}</span>
                      </button>
                      {supplierExpanded && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-muted/20 border-b border-border">
                              <tr>
                                {isAdmin && <th className="px-1 py-0.5 w-8"></th>}
                                <th className="px-1 py-0.5 text-left font-semibold text-muted-foreground uppercase text-xs">PR #</th>
                                <th className="px-1 py-0.5 text-left font-semibold text-muted-foreground uppercase text-xs">Invoice #</th>
                                <th className="px-1 py-0.5 text-left font-semibold text-muted-foreground uppercase text-xs">Due Date</th>
                                <th className="px-1 py-0.5 text-right font-semibold text-muted-foreground uppercase text-xs">Amount</th>
                                <th className="px-1 py-0.5 text-right font-semibold text-muted-foreground uppercase text-xs">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {supplierPRs.map((pr) => renderPRRow(pr))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}