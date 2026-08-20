import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const emptyRow = () => ({ description: "", invoice_number: "", amount: "", amount_paid: "", due_date: "" });

export default function MultiOtherPayableDialog({ open, onOpenChange, onSubmit }) {
  const [payee, setPayee] = useState("");
  const [rows, setRows] = useState([emptyRow()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setPayee(""); setRows([emptyRow()]); }
  }, [open]);

  const updateRow = (i, field, value) =>
    setRows(prev => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));

  const valid = payee.trim() && rows.every(r => r.description.trim() && r.amount && r.due_date);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSubmit(rows.map(r => {
        const amount = Number(r.amount) || 0;
        const paid = Number(r.amount_paid) || 0;
        return {
          supplier_name: payee.trim(),
          payable_type: "other",
          description: r.description.trim(),
          invoice_number: r.invoice_number || "",
          amount,
          amount_paid: paid,
          due_date: r.due_date,
          category: "other",
          status: paid > 0 ? (paid >= amount ? "paid" : "partially_paid") : "unpaid",
        };
      }));
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Other Payables</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Payee Name <span className="text-destructive">*</span></Label>
            <Input value={payee} onChange={(e) => setPayee(e.target.value)} placeholder="e.g. BIR, SSS, Landlord" />
          </div>

          <div className="space-y-3">
            {rows.map((row, i) => (
              <div key={i} className="rounded-xl border border-border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Payable {i + 1}</p>
                  {rows.length > 1 && (
                    <button onClick={() => setRows(prev => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Description *</Label>
                    <Input value={row.description} onChange={(e) => updateRow(i, "description", e.target.value)} placeholder="What is owed for" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Reference #</Label>
                    <Input value={row.invoice_number} onChange={(e) => updateRow(i, "invoice_number", e.target.value)} placeholder="REF-001" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Amount (₱) *</Label>
                    <Input type="number" value={row.amount} onChange={(e) => updateRow(i, "amount", e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Amount Paid (₱)</Label>
                    <Input type="number" value={row.amount_paid} onChange={(e) => updateRow(i, "amount_paid", e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Due Date *</Label>
                    <Input type="date" value={row.due_date} onChange={(e) => updateRow(i, "due_date", e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setRows(prev => [...prev, emptyRow()])}>
              <Plus className="w-4 h-4 mr-1" /> Add Another Payable
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!valid || saving}>
            {saving ? "Saving..." : `Save ${rows.length} Payable${rows.length !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}