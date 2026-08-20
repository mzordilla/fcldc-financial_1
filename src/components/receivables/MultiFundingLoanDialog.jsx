import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const emptyLoan = () => ({ invoice_number: "", amount: "", amount_paid: "", due_date: "", notes: "" });

export default function MultiFundingLoanDialog({ open, onOpenChange, onSubmit }) {
  const [clientName, setClientName] = useState("");
  const [loans, setLoans] = useState([emptyLoan()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setClientName(""); setLoans([emptyLoan()]); }
  }, [open]);

  const updateLoan = (i, field, value) =>
    setLoans(prev => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));

  const valid = clientName.trim() && loans.every(l => l.amount && l.due_date);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSubmit(loans.map(l => ({
        client_name: clientName.trim(),
        invoice_number: l.invoice_number || "",
        amount: Number(l.amount) || 0,
        amount_paid: Number(l.amount_paid) || 0,
        due_date: l.due_date,
        status: Number(l.amount_paid) > 0
          ? (Number(l.amount_paid) >= Number(l.amount) ? "paid" : "partially_paid")
          : "outstanding",
        notes: l.notes || "",
        receivable_type: "funding_loan",
      })));
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Funding / Loans for One Borrower</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Borrower / Party Name <span className="text-destructive">*</span></Label>
            <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g. Juan Dela Cruz" />
          </div>

          <div className="space-y-3">
            {loans.map((loan, i) => (
              <div key={i} className="rounded-xl border border-border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Loan {i + 1}</p>
                  {loans.length > 1 && (
                    <button onClick={() => setLoans(prev => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Reference #</Label>
                    <Input value={loan.invoice_number} onChange={(e) => updateLoan(i, "invoice_number", e.target.value)} placeholder="REF-001" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Amount (₱) *</Label>
                    <Input type="number" value={loan.amount} onChange={(e) => updateLoan(i, "amount", e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Amount Paid (₱)</Label>
                    <Input type="number" value={loan.amount_paid} onChange={(e) => updateLoan(i, "amount_paid", e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Due Date *</Label>
                    <Input type="date" value={loan.due_date} onChange={(e) => updateLoan(i, "due_date", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Notes</Label>
                  <Input value={loan.notes} onChange={(e) => updateLoan(i, "notes", e.target.value)} placeholder="Details of the funding/loan" />
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setLoans(prev => [...prev, emptyLoan()])}>
              <Plus className="w-4 h-4 mr-1" /> Add Another Loan
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!valid || saving}>
            {saving ? "Saving..." : `Save ${loans.length} Loan${loans.length !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}