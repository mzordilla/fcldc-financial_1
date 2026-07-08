import { useState, forwardRef, useImperativeHandle } from "react";
import { ChevronDown } from "lucide-react";

const SupplierGroupedRequests = forwardRef(function SupplierGroupedRequests({ requests, renderPRRow, isAdmin, emptyLabel = "No requests found" }, ref) {
  const [expandedSuppliers, setExpandedSuppliers] = useState(new Set());

  const bySupplier = {};
  requests.forEach((pr) => {
    const supplier = pr.payee || "Unknown Supplier";
    if (!bySupplier[supplier]) bySupplier[supplier] = [];
    bySupplier[supplier].push(pr);
  });
  const supplierEntries = Object.entries(bySupplier).sort((a, b) => a[0].localeCompare(b[0]));

  useImperativeHandle(ref, () => ({
    expandAll: () => setExpandedSuppliers(new Set(supplierEntries.map(([supplier]) => supplier))),
    collapseAll: () => setExpandedSuppliers(new Set()),
  }));

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

  return (
    <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
      {supplierEntries.map(([supplier, supplierPRs]) => {
        const supplierTotal = supplierPRs.reduce((sum, pr) => sum + (pr.amount || 0), 0);
        const isExpanded = expandedSuppliers.has(supplier);
        return (
          <div key={supplier} className="bg-card">
            <button
              onClick={() => toggleSupplier(supplier)}
              className="w-full bg-muted/50 hover:bg-muted/70 px-4 py-2 flex items-center gap-2 transition-colors"
            >
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0 ${isExpanded ? "" : "-rotate-90"}`} />
              <span className="text-sm font-semibold text-foreground">{supplier}</span>
              <span className="text-[11px] text-muted-foreground">{supplierPRs.length} invoice{supplierPRs.length !== 1 ? "s" : ""}</span>
              <span className="ml-auto text-xs font-bold text-foreground">₱{supplierTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </button>
            {isExpanded && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/30 border-y border-border">
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
});

export default SupplierGroupedRequests;