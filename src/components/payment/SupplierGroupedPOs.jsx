import { useState, forwardRef, useImperativeHandle } from "react";
import { ChevronDown, Plus, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const SupplierGroupedPOs = forwardRef(function SupplierGroupedPOs({ pos, onConvert, onCancel, poIdsWithRequest, isAdmin, selectedIds, onToggleSelect, readOnly = false }, ref) {
  const [expandedSuppliers, setExpandedSuppliers] = useState(new Set());

  const bySupplier = {};
  pos.forEach((po) => {
    const supplier = po.supplier_name || "Unknown Supplier";
    if (!bySupplier[supplier]) bySupplier[supplier] = [];
    bySupplier[supplier].push(po);
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

  if (pos.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">{readOnly ? "No cancelled purchase orders" : "No approved purchase orders ready to pay"}</div>;
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
      {supplierEntries.map(([supplier, supplierPOs]) => {
        const supplierTotal = supplierPOs.reduce((sum, po) => sum + (po.amount || 0), 0);
        const isExpanded = expandedSuppliers.has(supplier);
        return (
          <div key={supplier} className="bg-card">
            <button
              onClick={() => toggleSupplier(supplier)}
              className="w-full bg-muted/50 hover:bg-muted/70 px-4 py-2 flex items-center gap-2 transition-colors"
            >
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0 ${isExpanded ? "" : "-rotate-90"}`} />
              <span className="text-sm font-semibold text-foreground">{supplier}</span>
              <span className="text-[11px] text-muted-foreground">{supplierPOs.length} PO{supplierPOs.length !== 1 ? "s" : ""}</span>
              <span className="ml-auto text-xs font-bold text-foreground">₱{supplierTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </button>
            {isExpanded && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/30 border-y border-border">
                    <tr>
                      <th className="px-2 py-0.5 w-6"></th>
                      <th className="px-2 py-0.5 text-left font-semibold text-muted-foreground uppercase">PO #</th>
                      <th className="px-2 py-0.5 text-left font-semibold text-muted-foreground uppercase">Project</th>
                      <th className="px-2 py-0.5 text-left font-semibold text-muted-foreground uppercase">Description</th>
                      <th className="px-2 py-0.5 text-left font-semibold text-muted-foreground uppercase">Needed By</th>
                      <th className="px-2 py-0.5 text-right font-semibold text-muted-foreground uppercase">Amount</th>
                      <th className="px-2 py-0.5 text-right font-semibold text-muted-foreground uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {supplierPOs.map((po) => {
                      const hasRequest = poIdsWithRequest && (poIdsWithRequest.has(po.po_number) || poIdsWithRequest.has(po.id));
                      return (
                      <tr key={po.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-2 py-0.5" onClick={(e) => e.stopPropagation()}>
                          {!readOnly && !hasRequest && (
                            <Checkbox
                              checked={selectedIds?.has(po.id) || false}
                              onCheckedChange={() => onToggleSelect?.(po.id)}
                            />
                          )}
                        </td>
                        <td className="px-2 py-0.5 font-mono text-muted-foreground whitespace-nowrap">
                          {po.po_number || "—"}
                          {po.priority && po.priority !== "normal" && (
                            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full border font-medium ${po.priority === "urgent" ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-chart-3/10 text-chart-3 border-chart-3/20"}`}>{po.priority}</span>
                          )}
                        </td>
                        <td className="px-2 py-0.5 text-muted-foreground whitespace-nowrap">{po.project_name || "—"}</td>
                        <td className="px-2 py-0.5 text-muted-foreground max-w-xs"><span className="line-clamp-1">{po.description || "—"}</span></td>
                        <td className="px-2 py-0.5 text-muted-foreground whitespace-nowrap">{po.required_date ? format(new Date(po.required_date), "MMM d, yyyy") : "—"}</td>
                        <td className="px-2 py-0.5 text-right font-bold text-foreground whitespace-nowrap">₱{(po.amount || 0).toLocaleString()}</td>
                        <td className="px-2 py-0.5 text-right">
                          {readOnly ? (
                            <span className="inline-flex items-center gap-1 text-xs text-destructive font-medium"><XCircle className="w-3.5 h-3.5" /> Cancelled</span>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              {hasRequest ? (
                                <span className="inline-flex items-center gap-1 text-xs text-primary font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> PR Created</span>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => onConvert(po)} className="h-6 px-2 text-xs"><Plus className="w-3 h-3 mr-1" /> Create PR</Button>
                              )}
                              {isAdmin && (
                                <Button size="sm" variant="ghost" onClick={() => onCancel?.(po)} className="h-6 px-2 text-xs text-destructive hover:text-destructive"><XCircle className="w-3 h-3 mr-1" /> Cancel</Button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                      );
                    })}
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

export default SupplierGroupedPOs;