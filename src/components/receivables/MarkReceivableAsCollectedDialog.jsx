import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const today = format(new Date(), "yyyy-MM-dd");

export default function MarkReceivableAsCollectedDialog({ open, onOpenChange, receivable, onConfirm }) {
  const [form, setForm] = useState({
    collection_date: today,
    amount_collected: "",
    bank_account_id: "",
    reference: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bankaccounts"],
    queryFn: () => base44.entities.BankAccount.list("-created_date", 100),
    enabled: open,
  });

  useEffect(() => {
    if (receivable) {
      setForm({
        collection_date: today,
        amount_collected: String(receivable.amount || ""),
        bank_account_id: "",
        reference: "",
        notes: "",
      });
    }
  }, [receivable]);

  const handleSubmit = async () => {
    setSaving(true);
    const amountCollected = parseFloat(form.amount_collected) || receivable.amount;

    // Update receivable status
    await onConfirm({
      status: "paid",
      amount_paid: amountCollected,
    });

    // Only record bank movement — income was already recorded at receivable creation (no P&L double-entry)
    if (form.bank_account_id) {
      // Record as bank_reconciliation so it shows in bank transactions but NOT in P&L income
      await base44.entities.Transaction.create({
        description: `Collection received – ${receivable.client_name}${receivable.invoice_number ? ` (${receivable.invoice_number})` : ""}`,
        amount: amountCollected,
        type: "income",
        category: "bank_reconciliation",
        project_name: receivable.project_name || "",
        bank_account_id: form.bank_account_id,
        date: form.collection_date,
        status: "completed",
      });
    }

    setSaving(false);
    onOpenChange(false);
  };

  if (!receivable) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark as Collected</DialogTitle>
        </DialogHeader>

        <div className="space-y-1 bg-muted/40 rounded-lg px-4 py-3 text-sm">
          <p className="font-semibold text-foreground">{receivable.client_name}</p>
          {receivable.project_name && <p className="text-muted-foreground">{receivable.project_name}</p>}
          {receivable.invoice_number && <p className="text-muted-foreground">Invoice: {receivable.invoice_number}</p>}
          <p className="text-primary font-bold">₱{(receivable.amount || 0).toLocaleString()}</p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Amount Collected</Label>
              <Input
                type="number"
                value={form.amount_collected}
                onChange={e => setForm(f => ({ ...f, amount_collected: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Collection Date</Label>
              <Input
                type="date"
                value={form.collection_date}
                onChange={e => setForm(f => ({ ...f, collection_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Bank Account <span className="text-muted-foreground font-normal">(for income transaction)</span></Label>
            <Select value={form.bank_account_id} onValueChange={v => setForm(f => ({ ...f, bank_account_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select bank account" /></SelectTrigger>
              <SelectContent>
                {bankAccounts.filter(a => a.status !== "closed").map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.account_name} – {a.bank_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Reference # <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              value={form.reference}
              onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
              placeholder="e.g. OR-00123 or TRF-2026-0501"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Any additional notes..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : "Confirm Collection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}