import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ClientPaymentRow from "./ClientPaymentRow";

const fmt = (n) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

export default function ClientPaymentGroup({ clientName, clientCode, listings, clients, onAddPayment, onAssignBuyer }) {
  const [expanded, setExpanded] = useState(false);

  const totalDue = listings.reduce((s, l) => s + (l.final_price || l.asking_price || 0), 0);
  const totalPaid = listings.reduce((s, l) => s + (l.payment_history || []).reduce((sum, p) => sum + (p.amount || 0), 0), 0);
  const balance = totalDue - totalPaid;
  const unitCount = listings.reduce((s, l) => s + (l.units || []).length, 0);

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 cursor-pointer hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-semibold text-foreground">{clientName}</h3>
            <Badge variant="outline" className="text-xs">{unitCount} unit{unitCount !== 1 ? "s" : ""}</Badge>
            {balance <= 0 ? (
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">Fully Paid</Badge>
            ) : (
              <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-700 border-amber-200">Balance {fmt(balance)}</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {listings.length} listing{listings.length !== 1 ? "s" : ""}{clientCode ? ` · Client Code: ${clientCode}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="sm:text-right">
            <p className="text-lg font-bold text-foreground">{fmt(totalDue)}</p>
            <p className="text-xs text-muted-foreground">{fmt(totalPaid)} collected</p>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border p-3 space-y-2 bg-muted/10">
          {listings.map((listing) => (
            <ClientPaymentRow key={listing.id} listing={listing} client={null} clients={clients} onAddPayment={onAddPayment} onAssignBuyer={onAssignBuyer} />
          ))}
        </div>
      )}
    </div>
  );
}