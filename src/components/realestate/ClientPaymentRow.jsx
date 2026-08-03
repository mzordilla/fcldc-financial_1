import { useState } from "react";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AddClientPaymentDialog from "./AddClientPaymentDialog";
import CondoSaleBreakdown from "./CondoSaleBreakdown";
import AssignCondoBuyerDialog from "./AssignCondoBuyerDialog";

const fmt = (n) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

export default function ClientPaymentRow({ listing, client, clients = [], onAddPayment, onAssignBuyer }) {
  const [expanded, setExpanded] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showAssignBuyer, setShowAssignBuyer] = useState(false);

  const history = listing.payment_history || [];
  const totalPaid = history.reduce((s, p) => s + (p.amount || 0), 0);
  const totalDue = listing.final_price || listing.asking_price || 0;
  const balance = totalDue - totalPaid;
  const isSale = listing.listing_type === "for_sale";
  const unitLabel = (listing.units || []).map((u) => u.unit_number).filter(Boolean).join(", ") || "—";

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 cursor-pointer hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-semibold text-foreground">{listing.buyer_tenant_name || "—"}</h3>
            <Badge variant="outline" className={`text-xs ${isSale ? "bg-primary/10 text-primary border-primary/20" : "bg-chart-2/10 text-chart-2 border-chart-2/20"}`}>
              {listing.status === "sold" ? "Sold" : "Leased"}
            </Badge>
            {balance <= 0 ? (
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">Fully Paid</Badge>
            ) : (
              <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-700 border-amber-200">Balance {fmt(balance)}</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Unit: {unitLabel}{listing.date_closed ? ` · Closed ${format(new Date(listing.date_closed), "MMM d, yyyy")}` : ""}
            {client?.client_code ? ` · Client Code: ${client.client_code}` : ""}
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
        <div className="border-t border-border p-4 space-y-3">
          {isSale && <CondoSaleBreakdown totalPrice={totalDue} breakdown={listing.price_breakdown} />}
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Payment History</p>
            {listing.can_record_payment === false ? <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setShowAssignBuyer(true); }}>
              Assign Buyer
            </Button> : <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setShowAddPayment(true); }}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Payment
            </Button>}
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No payments recorded yet.</p>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="px-3 py-2 text-left font-semibold">Date</th>
                    <th className="px-3 py-2 text-left font-semibold">Method</th>
                    <th className="px-3 py-2 text-left font-semibold">Reference</th>
                    <th className="px-3 py-2 text-left font-semibold">Notes</th>
                    <th className="px-3 py-2 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((p, idx) => (
                    <tr key={idx} className="border-b border-border/50 last:border-0">
                      <td className="px-3 py-2">{p.payment_date ? format(new Date(p.payment_date), "MMM d, yyyy") : "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.payment_method || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.reference || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.notes || "—"}</td>
                      <td className="px-3 py-2 text-right font-semibold">{fmt(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30 border-t border-border">
                    <td className="px-3 py-2 font-semibold text-foreground" colSpan={4}>Total Collected</td>
                    <td className="px-3 py-2 text-right font-bold text-primary">{fmt(totalPaid)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      <AssignCondoBuyerDialog
        open={showAssignBuyer}
        onOpenChange={setShowAssignBuyer}
        clients={clients}
        onAssign={(buyer) => onAssignBuyer(listing, buyer)}
      />

      <AddClientPaymentDialog
        open={showAddPayment}
        onOpenChange={setShowAddPayment}
        onSubmit={(payment) => {
          onAddPayment(listing, payment);
          setShowAddPayment(false);
        }}
      />
    </div>
  );
}