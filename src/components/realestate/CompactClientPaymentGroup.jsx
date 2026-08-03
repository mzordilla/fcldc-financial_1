import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ClientPaymentRow from "./ClientPaymentRow";

const fmt = (n) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

export default function CompactClientPaymentGroup({ clientName, listings, clients, onAddPayment, onAssignBuyer }) {
  const [expanded, setExpanded] = useState(false);
  const totalDue = listings.reduce((sum, item) => sum + (item.final_price || item.asking_price || 0), 0);
  const totalPaid = listings.reduce((sum, item) => sum + (item.payment_history || []).reduce((paid, payment) => paid + (payment.amount || 0), 0), 0);
  const balance = totalDue - totalPaid;
  const units = listings.flatMap((item) => item.units || []).map((unit) => unit.unit_number).filter(Boolean).join(", ") || "—";

  return (
    <div className="bg-card">
      <button className="w-full px-5 py-3 hover:bg-muted/50 transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="grid grid-cols-[1.5fr_1.25fr_1fr_1fr_1fr_7rem_2.5rem] gap-3 items-center text-sm">
          <span className="font-semibold text-left truncate">{clientName}</span>
          <span className="text-left text-muted-foreground truncate" title={units}>{units}</span>
          <span className="text-right font-semibold">{fmt(totalDue)}</span>
          <span className="text-right text-primary font-semibold">{fmt(totalPaid)}</span>
          <span className="text-right font-semibold">{fmt(balance)}</span>
          <Badge variant={balance <= 0 ? "default" : "secondary"} className="justify-center">{balance <= 0 ? "Paid" : "Outstanding"}</Badge>
          <ChevronDown className={`w-4 h-4 mx-auto text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </button>
      {expanded && <div className="border-t border-border bg-muted/20 p-2 space-y-2">
        {listings.map((listing) => <ClientPaymentRow key={listing.id} listing={listing} client={null} clients={clients} onAddPayment={onAddPayment} onAssignBuyer={onAssignBuyer} />)}
      </div>}
    </div>
  );
}