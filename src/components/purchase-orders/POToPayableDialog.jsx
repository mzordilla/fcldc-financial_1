import { useState } from "react";
import { format, addDays } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";

export default function POToPayableDialog({ open, onOpenChange, po, onSuccess }) {
  const [form, setForm] = useState({
    invoice_number: "",
    due_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    const payable = {
      supplier_name: po.supplier_name,
      description: po.description,
      po_id: po.id,
      po_number: po.po_number,
      amount: po.amount,
      due_date: form.due_date,
      invoice_number: form.invoice_number,
      project_name: po.project_name,
      category: po.category,
      status: "unpaid",
    };
    await base44.entities.Payable.create(payable);
    setSaving(false);
    onOpenChange(false);
    onSuccess?.();
  };

  if (!po) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convert to Payable</DialogTitle>
        </DialogHeader>

        <div className="space-y-1 bg-muted/40 rounded-lg px-4 py-3 text-sm">
          <p className="font-semibold text-foreground">{po.supplier_name}</p>
          {po.po_number && <p className="text-muted-foreground">PO: {po.po_number}</p>}
          <p className="text-primary font-bold">₱{(po.amount || 0).toLocaleString()}</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Invoice Number</Label>
            <Input
              value={form.invoice_number}
              onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))}
              placeholder="e.g. INV-2026-0501"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Due Date</Label>
            <Input
              type="date"
              value={form.due_date}
              onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Creating..." : "Create Payable"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}