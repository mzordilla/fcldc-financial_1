import { useState } from "react";
import { ChevronDown, ChevronUp, Truck } from "lucide-react";

export default function SupplierDeliveryDropdown({ name, records }) {
  const [expanded, setExpanded] = useState(false);
  const uniqueRecords = [...new Map(records.map((record) => [record.po_key || record.po_number || record.id, record])).values()];
  const items = uniqueRecords.flatMap((record) => (record.issued_line_items || []).map((item) => ({ ...item, quantity_ordered: item.quantity_ordered ?? item.quantity, po_number: record.po_number })));
  const total = uniqueRecords.reduce((sum, record) => sum + (record.issued_amount || 0), 0);
  const poCount = uniqueRecords.length;

  return (
    <div className="border-b border-border last:border-0">
      <button type="button" className="w-full flex items-center justify-between gap-4 px-5 py-3 text-left hover:bg-muted/20" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <Truck className="w-4 h-4 text-primary" />
          <div><p className="text-sm font-semibold text-foreground">{name}</p><p className="text-xs text-muted-foreground">{poCount} PO{poCount !== 1 ? "s" : ""} · {items.length} item{items.length !== 1 ? "s" : ""}</p></div>
        </div>
        <div className="flex items-center gap-3"><span className="text-sm font-bold text-foreground">₱{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>{expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}</div>
      </button>
      {expanded && <div className="overflow-x-auto border-t border-border bg-muted/10">
        <table className="w-full text-xs">
          <thead><tr className="bg-muted/40"><th className="px-5 py-2 text-left">Item</th><th className="px-3 py-2 text-left">PO #</th><th className="px-3 py-2 text-right">Ordered</th><th className="px-3 py-2 text-right">Received</th><th className="px-5 py-2 text-right">Total</th></tr></thead>
          <tbody>{items.map((item, index) => <tr key={`${item.po_number}-${index}`} className="border-t border-border/50"><td className="px-5 py-2">{item.description || "—"}</td><td className="px-3 py-2 font-mono text-muted-foreground">{item.po_number || "—"}</td><td className="px-3 py-2 text-right text-muted-foreground">{item.quantity_ordered ?? "—"}</td><td className="px-3 py-2 text-right text-muted-foreground">{item.quantity_received ?? "—"}</td><td className="px-5 py-2 text-right font-semibold">₱{(item.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>)}</tbody>
        </table>
        {items.length === 0 && <p className="px-5 py-4 text-center text-muted-foreground">No item details recorded.</p>}
      </div>}
    </div>
  );
}