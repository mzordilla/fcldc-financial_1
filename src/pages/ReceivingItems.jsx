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

      <div className="space-y-4">
        {isLoading && <p className="text-center py-12 text-muted-foreground">Loading...</p>}
        {!isLoading && groups.length === 0 && (
          <p className="text-center py-12 text-muted-foreground">No receiving records yet. Deliveries confirmed from Purchase Orders will appear here.</p>
        )}
        {groups.map((group) => {
          const key = group.po_id || group.po_number || "unknown";
          const expanded = expandedPO === key;
          const complete = isComplete(group.receipts);
          return (
            <div key={key} className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-md transition-shadow">
              {/* PO Master Header */}
              <div
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 cursor-pointer"
                onClick={() => setExpandedPO(expanded ? null : key)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    <Package className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-foreground">{group.supplier_name}</h3>
                    {group.po_number && (
                      <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">
                        PO: {group.po_number}
                      </span>
                    )}
                    <Badge
                      variant="outline"
                      className={`text-xs ${complete ? "bg-primary/10 text-primary border-primary/20" : "bg-amber-500/10 text-amber-700 border-amber-200"}`}
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {complete ? "Fully Received" : "Partially Received"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {group.project_name && (
                      <span>Project: <span className="text-foreground font-medium">{group.project_name}</span></span>
                    )}
                    <span>{group.receipts.length} receipt transaction{group.receipts.length !== 1 ? "s" : ""}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="sm:text-right">
                    <p className="text-xl font-bold text-foreground">₱{group.total_received.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Total Received Value</p>
                  </div>
                  {expanded
                    ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                </div>
              </div>

              {/* Expanded: individual receipt transactions */}
              {expanded && (
                <div className="border-t border-border divide-y divide-border">
                  {group.receipts.map((receipt) => (
                    <div key={receipt.id} className="px-5 py-4 bg-muted/20">
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}