import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function SupplierGroupedPOs({ pos, onConvert }) {
  const [expandedSuppliers, setExpandedSuppliers] = useState(new Set());

  const toggleSupplier = (supplier) => {
    setExpandedSuppliers((prev) => {
      const next = new Set(prev);
      next.has(supplier) ? next.delete(supplier) : next.add(supplier);
      return next;
    });
  };

  if (pos.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">No approved purchase orders ready to pay</div>;
  }

  const bySupplier = {};
  pos.forEach((po) => {
    const supplier = po.supplier_name || "Unknown Supplier";
    if (!bySupplier[supplier]) bySupplier[supplier] = [];
    bySupplier[supplier].push(po);
  });
  const supplierEntries = Object.entries(bySupplier).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="space-y-2">
      {supplierEntries.map(([supplier, supplierPOs]) => {
        const supplierTotal = supplierPOs.reduce((sum, po) => sum + (po.amount || 0), 0);
        const isExpanded = expandedSuppliers.has(supplier);
        return (
          <div key={supplier} className="border border-border rounded-xl overflow-hidden bg-card">
            <button
              onClick={() => toggleSupplier(supplier)}
              className="w-full bg-muted/20 hover:bg-muted/40 px-3 py-1 border-b border-border flex items-center gap-2 transition-colors"
            >
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
              <span className="text-xs font-bold uppercase tracking-wide text-foreground">{supplier}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{supplierPOs.length} PO{supplierPOs.length !== 1 ? "s" : ""}</span>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-muted text-foreground font-mono font-semibold">₱{supplierTotal.toLocaleString()}</span>
            </button>
            {isExpanded && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/20 border-b border-border">
                    <tr>
                      <th className="px-2 py-0.5 text-left font-semibold text-muted-foreground uppercase">PO #</th>
                      <th className="px-2 py-0.5 text-left font-semibold text-muted-foreground uppercase">Project</th>
                      <th className="px-2 py-0.5 text-left font-semibold text-muted-foreground uppercase">Description</th>
                      <th className="px-2 py-0.5 text-left font-semibold text-muted-foreground uppercase">Needed By</th>
                      <th className="px-2 py-0.5 text-right font-semibold text-muted-foreground uppercase">Amount</th>
                      <th className="px-2 py-0.5 text-right font-semibold text-muted-foreground uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {supplierPOs.map((po) => (
                      <tr key={po.id} className="hover:bg-muted/20 transition-colors">
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
                          <Button size="sm" variant="outline" onClick={() => onConvert(po)} className="h-6 px-2 text-xs">
                            <Plus className="w-3 h-3 mr-1" /> Create PR
                          </Button>
                        </td>
                      </tr>
                    ))}
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