import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function SupplierGroupedRequests({ requests, renderPRRow, isAdmin, emptyLabel = "No requests found" }) {
  const [expandedSuppliers, setExpandedSuppliers] = useState(new Set());

  const toggleSupplier = (supplier) => {
    setExpandedSuppliers((prev) => {
      const next = new Set(prev);
      next.has(supplier) ? next.delete(supplier) : next.add(supplier);
      return next;
    });
  };

  if (requests.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">{emptyLabel}</div>;
  }

  const bySupplier = {};
  requests.forEach((pr) => {
    const supplier = pr.payee || "Unknown Supplier";
    if (!bySupplier[supplier]) bySupplier[supplier] = [];
    bySupplier[supplier].push(pr);
  });
  const supplierEntries = Object.entries(bySupplier).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="space-y-2">
      {supplierEntries.map(([supplier, supplierPRs]) => {
        const supplierTotal = supplierPRs.reduce((sum, pr) => sum + (pr.amount || 0), 0);
        const isExpanded = expandedSuppliers.has(supplier);
        return (
          <div key={supplier} className="border border-border rounded-xl overflow-hidden bg-card">
            <button
              onClick={() => toggleSupplier(supplier)}
              className="w-full bg-muted/20 hover:bg-muted/40 px-3 py-1.5 border-b border-border flex items-center gap-2 transition-colors"
            >
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
              <span className="text-xs font-bold uppercase tracking-wide text-foreground">{supplier}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{supplierPRs.length} invoice{supplierPRs.length !== 1 ? "s" : ""}</span>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-muted text-foreground font-mono font-semibold">₱{supplierTotal.toLocaleString()}</span>
            </button>
            {isExpanded && (
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
  );
}