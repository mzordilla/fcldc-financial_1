import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Package, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ReceivingItems() {
  const [expandedPO, setExpandedPO] = useState(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["receiving_items"],
    queryFn: () => base44.entities.ReceivingItem.list("-received_date", 500),
  });

  // Group receiving records by PO ID for consolidated view
  const byPO = {};
  for (const item of items) {
    const key = item.po_id || item.po_number || "unknown";
    if (!byPO[key]) {
      byPO[key] = {
        po_id: item.po_id,
        po_number: item.po_number,
        supplier_name: item.supplier_name,
        project_name: item.project_name,
        receipts: [],
        total_received: 0,
      };
    }
    byPO[key].receipts.push(item);
    byPO[key].total_received += item.total_amount || 0;
  }

  // Sort groups by most recent receipt date
  const groups = Object.values(byPO).sort((a, b) => {
    const aDate = a.receipts[0]?.received_date || "";
    const bDate = b.receipts[0]?.received_date || "";
    return bDate.localeCompare(aDate);
  });

  const isComplete = (receipts) => receipts.some(r => r.status === "complete");

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Receiving Items</h1>
        <p className="text-muted-foreground mt-1">
          {groups.length} PO{groups.length !== 1 ? "s" : ""} · {items.length} receipt transaction{items.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {isLoading && <p className="text-center py-12 text-muted-foreground">Loading...</p>}
        {!isLoading && groups.length === 0 && (
          <p className="text-center py-12 text-muted-foreground">No receiving records yet. Deliveries confirmed from Purchase Orders will appear here.</p>
        )}
        {!isLoading && groups.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-3 py-2 text-left font-semibold w-8"></th>
                <th className="px-3 py-2 text-left font-semibold">Supplier</th>
                <th className="px-3 py-2 text-left font-semibold">PO Number</th>
                <th className="px-3 py-2 text-left font-semibold">Project</th>
                <th className="px-3 py-2 text-left font-semibold">Status</th>
                <th className="px-3 py-2 text-right font-semibold">Receipts</th>
                <th className="px-3 py-2 text-right font-semibold">Total Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {groups.map((group) => {
                const key = group.po_id || group.po_number || "unknown";
                const expanded = expandedPO === key;
                const complete = isComplete(group.receipts);
                return (
                  <>
                    <tr
                      key={key}
                      className="cursor-pointer hover:bg-muted/20"
                      onClick={() => setExpandedPO(expanded ? null : key)}
                    >
                      <td className="px-3 py-2.5">
                        {expanded
                          ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <Package className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          <span className="font-medium text-foreground">{group.supplier_name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">
                          {group.po_number || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs">{group.project_name || "—"}</td>
                      <td className="px-3 py-2.5">
                        <Badge
                          variant="outline"
                          className={`text-xs ${complete ? "bg-primary/10 text-primary border-primary/20" : "bg-amber-500/10 text-amber-700 border-amber-200"}`}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {complete ? "Fully Received" : "Partially Received"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs text-muted-foreground">{group.receipts.length}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-foreground">₱{group.total_received.toLocaleString()}</td>
                    </tr>

                    {expanded && (
                      <tr key={`${key}-detail`}>
                        <td colSpan={7} className="p-0 bg-muted/10 border-t border-border">
                          <div className="divide-y divide-border">
                            {group.receipts.map((receipt) => (
                              <div key={receipt.id} className="px-5 py-4">
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                    <span>
                                      Received:{" "}
                                      <span className="text-foreground font-medium">
                                        {receipt.received_date ? format(new Date(receipt.received_date), "MMM d, yyyy") : "—"}
                                      </span>
                                    </span>
                                    {receipt.received_by && <span>By: <span className="text-foreground">{receipt.received_by}</span></span>}
                                    <Badge
                                      variant="outline"
                                      className={`text-xs ${receipt.status === "complete" ? "bg-primary/10 text-primary border-primary/20" : "bg-amber-500/10 text-amber-700 border-amber-200"}`}
                                    >
                                      {receipt.status === "complete" ? "Complete" : "Partial"}
                                    </Badge>
                                  </div>
                                  <span className="text-sm font-bold text-foreground">₱{(receipt.total_amount || 0).toLocaleString()}</span>
                                </div>

                                {receipt.line_items?.length > 0 && (
                                  <div className="border border-border rounded-lg overflow-hidden">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="bg-muted/50 border-b border-border">
                                          <th className="px-3 py-2 text-left font-semibold">Item</th>
                                          <th className="px-3 py-2 text-right font-semibold">Ordered</th>
                                          <th className="px-3 py-2 text-right font-semibold">Received</th>
                                          <th className="px-3 py-2 text-right font-semibold">Total</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {receipt.line_items.map((li, idx) => (
                                          <tr key={idx} className="border-b border-border/50 last:border-0">
                                            <td className="px-3 py-2">{li.description}</td>
                                            <td className="px-3 py-2 text-right">{li.quantity_ordered}</td>
                                            <td className="px-3 py-2 text-right">{li.quantity_received}</td>
                                            <td className="px-3 py-2 text-right font-semibold">₱{(li.total || 0).toLocaleString()}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}

                                {receipt.notes && (
                                  <p className="text-xs text-muted-foreground mt-2 italic border-l-2 border-border pl-2">{receipt.notes}</p>
                                )}
                                {receipt.receipt_url && (
                                  <a href={receipt.receipt_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary underline">
                                    View receipt document
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}