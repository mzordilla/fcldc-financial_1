import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const fmt = (n) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const defaultForm = {
  collected_date: format(new Date(), "yyyy-MM-dd"),
  payment_method: "bank_transfer",
  reference: "",
  notes: "",
};

export default function LeaseCollectionDetailsDialog({ open, onOpenChange, tenant, month, monthLabel, record, onMarkCollected, onUndo }) {
  const [form, setForm] = useState(defaultForm);
  const isCollected = !!record?.collected;

  useEffect(() => {
    if (open) setForm(defaultForm);
  }, [open, record]);

  const amount = record?.amount ?? tenant?.monthly_rent ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isCollected ? "Collection Summary" : "Mark as Collected"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-border pb-2">
            <span className="text-muted-foreground">Client</span>
            <span className="font-medium text-foreground">{tenant?.full_name}</span>
          </div>
          <div className="flex justify-between border-b border-border pb-2">
            <span className="text-muted-foreground">Unit</span>
            <span className="font-medium text-foreground">{tenant?.unit_number}{tenant?.building ? ` · ${tenant.building}` : ""}</span>
          </div>
          <div className="flex justify-between border-b border-border pb-2">
            <span className="text-muted-foreground">Month</span>
            <span className="font-medium text-foreground">{monthLabel}</span>
          </div>
          <div className="flex justify-between border-b border-border pb-2">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-semibold text-primary">{fmt(amount)}</span>
          </div>

          {isCollected ? (
            <>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Collected Date</span>
                <span className="font-medium text-foreground">{record.collected_date ? format(new Date(record.collected_date), "MMM d, yyyy") : "—"}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Payment Method</span>
                <span className="font-medium text-foreground capitalize">{(record.payment_method || "—").replace("_", " ")}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Reference</span>
                <span className="font-medium text-foreground">{record.reference || "—"}</span>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Notes</p>
                <p className="text-foreground">{record.notes || "—"}</p>
              </div>
            </>
          ) : (
            <div className="space-y-3 pt-1">
              <div>
                <Label className="text-xs">Collected Date</Label>
                <Input type="date" value={form.collected_date} onChange={(e) => setForm({ ...form, collected_date: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Payment Method</Label>
                <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Reference</Label>
                <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Check no., transfer ref., etc." />
              </div>
              <div>
                <Label className="text-xs">Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {isCollected ? (
            <Button variant="outline" onClick={() => onUndo(tenant, month, record)}>Undo Collection</Button>
          ) : (
            <Button onClick={() => onMarkCollected(tenant, month, record, form)}>Mark as Collected</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}