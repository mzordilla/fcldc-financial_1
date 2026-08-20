import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle } from "lucide-react";

const statusStyles = {
  pending: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  approved: "bg-primary/10 text-primary border-primary/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

const fieldLabels = { price: "Price", quantity: "Quantity", supplier: "Supplier" };

export default function ChangeRequestReviewDialog({ open, onOpenChange, po, onDecision }) {
  const [savingIdx, setSavingIdx] = useState(null);
  const requests = po?.change_requests || [];

  const decide = async (idx, status) => {
    setSavingIdx(idx);
    await onDecision(idx, status);
    setSavingIdx(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Change Requests — {po?.po_number || po?.supplier_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {requests.length === 0 && <p className="text-sm text-muted-foreground">No change requests yet.</p>}
          {requests.map((cr, idx) => (
            <div key={idx} className="border border-border rounded-xl p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{fieldLabels[cr.field] || cr.field}{cr.line_item_description ? ` — ${cr.line_item_description}` : ""}</span>
                <Badge variant="outline" className={`text-xs ${statusStyles[cr.status] || ""}`}>{cr.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="line-through">{cr.current_value}</span> → <span className="text-foreground font-medium">{cr.requested_value}</span>
              </p>
              <p className="text-xs text-muted-foreground italic">{cr.reason}</p>
              <p className="text-xs text-muted-foreground">Requested by {cr.requested_by || "—"}{cr.requested_date ? ` on ${new Date(cr.requested_date).toLocaleDateString()}` : ""}</p>
              {cr.status === "pending" && (
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="h-7 text-xs" disabled={savingIdx === idx} onClick={() => decide(idx, "approved")}>
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" disabled={savingIdx === idx} onClick={() => decide(idx, "rejected")}>
                    <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}