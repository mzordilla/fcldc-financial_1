import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Package, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ReceivingItems() {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["receiving_items"],
    queryFn: () => base44.entities.ReceivingItem.list("-received_date", 200),
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Receiving Items</h1>
        <p className="text-muted-foreground mt-1">{items.length} delivery record{items.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="grid gap-4">
        {isLoading && <p className="text-center py-12 text-muted-foreground">Loading...</p>}
        {!isLoading && items.length === 0 && (
          <p className="text-center py-12 text-muted-foreground">No receiving records yet. Deliveries confirmed from Purchase Orders will appear here.</p>
        )}
        {items.map((item) => (
          <div key={item.id} className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <Package className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-foreground">{item.supplier_name}</h3>
                  {item.po_number && <span className="text-xs font-mono text-muted-foreground">PO: {item.po_number}</span>}
                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                    <CheckCircle className="w-3 h-3 mr-1" /> {item.status === "partial" ? "Partial" : "Complete"}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
                  {item.project_name && <span>Project: <span className="text-foreground font-medium">{item.project_name}</span></span>}
                  <span>Received: <span className="text-foreground font-medium">{item.received_date ? format(new Date(item.received_date), "MMM d, yyyy") : "—"}</span></span>
                  {item.received_by && <span>By: {item.received_by}</span>}
                </div>

                {item.line_items?.length > 0 && (
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
                        {item.line_items.map((li, idx) => (
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

                {item.notes && (
                  <p className="text-xs text-muted-foreground mt-2 italic border-l-2 border-border pl-2">{item.notes}</p>
                )}

                {item.receipt_url && (
                  <a href={item.receipt_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary underline">
                    View receipt document
                  </a>
                )}
              </div>

              <div className="sm:text-right">
                <p className="text-xl font-bold text-foreground">₱{(item.total_amount || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}