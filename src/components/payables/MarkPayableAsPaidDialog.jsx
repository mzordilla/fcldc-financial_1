import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const today = format(new Date(), "yyyy-MM-dd");

export default function MarkPayableAsPaidDialog({ open, onOpenChange, payable, onConfirm }) {
  const [form, setForm] = useState({
    payment_date: today,
    payment_method: "bank_transfer",
    payment_reference: "",
    payment_notes: "",
    amount_paid: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (payable) {
      setForm({
        payment_date: today,
        payment_method: "bank_transfer",
        payment_reference: "",
        payment_notes: "",
        amount_paid: String(payable.amount || ""),
      });
    }
  }, [payable]);

  const handleSubmit = async () => {
    setSaving(true);
    await onConfirm({
      status: "paid",
      amount_paid: parseFloat(form.amount_paid) || payable.amount,
      payment_date: form.payment_date,
      payment_method: form.payment_method,
      payment_reference: form.payment_reference,
      payment_notes: form.payment_notes,
    });
    setSaving(false);
    onOpenChange(false);
  };

  if (!payable) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark as Paid</DialogTitle>
        </DialogHeader>

        <div className="space-y-1 bg-muted/40 rounded-lg px-4 py-3 text-sm">
          <p className="font-semibold text-foreground">{payable.supplier_name}</p>
          {payable.description && <p className="text-muted-foreground">{payable.description}</p>}
          {payable.invoice_number && <p className="text-muted-foreground">Invoice: {payable.invoice_number}</p>}
          <p className="text-primary font-bold">₱{(payable.amount || 0).toLocaleString()}</p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Amount Paid</Label>
              <Input
                type="number"
                value={form.amount_paid}
                onChange={e => setForm(f => ({ ...f, amount_paid: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Date</Label>
              <Input
                type="date"
                value={form.payment_date}
                onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="credit_card">Credit Card</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Reference # <span className="text-muted-foreground font-normal">(check no., transfer ref., etc.)</span></Label>
            <Input
              value={form.payment_reference}
              onChange={e => setForm(f => ({ ...f, payment_reference: e.target.value }))}
              placeholder="e.g. CHK-00123 or TRF-2026-0501"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              value={form.payment_notes}
              onChange={e => setForm(f => ({ ...f, payment_notes: e.target.value }))}
              placeholder="Any additional notes..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : "Confirm Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}