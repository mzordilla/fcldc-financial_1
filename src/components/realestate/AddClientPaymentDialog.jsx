import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

export default function AddClientPaymentDialog({ open, onOpenChange, onSubmit }) {
  const [form, setForm] = useState({
    payment_date: format(new Date(), "yyyy-MM-dd"),
    amount: "",
    payment_method: "",
    reference: "",
    notes: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.amount) return;
    onSubmit({ ...form, amount: Number(form.amount) });
    setForm({ payment_date: format(new Date(), "yyyy-MM-dd"), amount: "", payment_method: "", reference: "", notes: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Payment Date</label>
            <Input type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Amount</label>
            <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Payment Method</label>
            <Input placeholder="e.g. Bank Transfer, Cash, Check" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Reference</label>
            <Input placeholder="Check no., transfer reference..." value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Notes</label>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <Button type="submit" className="w-full">Save Payment</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}