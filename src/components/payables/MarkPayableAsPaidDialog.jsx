import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { CreditCard, CheckCircle2 } from "lucide-react";

const today = format(new Date(), "yyyy-MM-dd");

const methodLabel = (m) => (m || "").replace(/_/g, " ");

export default function MarkPayableAsPaidDialog({ open, onOpenChange, payable, onConfirm }) {
  const [form, setForm] = useState({
    payment_date: today,
    payment_method: "bank_transfer",
    payment_reference: "",
    payment_notes: "",
    amount: "",
    bank_account_id: "",
  });
  const [saving, setSaving] = useState(false);

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bankaccounts"],
    queryFn: () => base44.entities.BankAccount.list("-created_date", 100),
    enabled: open,
  });

  useEffect(() => {
    if (payable) {
      const remaining = (payable.amount || 0) - (payable.amount_paid || 0);
      setForm({
        payment_date: today,
        payment_method: "bank_transfer",
        payment_reference: "",
        payment_notes: "",
        amount: String(remaining > 0 ? remaining : ""),
        bank_account_id: "",
      });
    }
  }, [payable]);

  if (!payable) return null;

  const totalAmount = payable.amount || 0;
  const alreadyPaid = payable.amount_paid || 0;
  const remaining = totalAmount - alreadyPaid;
  const thisPayment = parseFloat(form.amount) || 0;
  const newTotalPaid = alreadyPaid + thisPayment;
  const paidPct = totalAmount ? Math.min((alreadyPaid / totalAmount) * 100, 100) : 0;
  const history = payable.payment_history || [];

  const handleSubmit = async () => {
    setSaving(true);
    const newEntry = {
      payment_date: form.payment_date,
      amount: thisPayment,
      payment_method: form.payment_method,
      bank_account_id: form.bank_account_id,
      reference: form.payment_reference,
      notes: form.payment_notes,
    };

    const updatedHistory = [...history, newEntry];
    const updatedAmountPaid = alreadyPaid + thisPayment;
    const isFullyPaid = updatedAmountPaid >= totalAmount;

    await onConfirm({
      status: isFullyPaid ? "paid" : "partially_paid",
      amount_paid: updatedAmountPaid,
      payment_history: updatedHistory,
      payment_date: form.payment_date,
      payment_method: form.payment_method,
      payment_reference: form.payment_reference,
      payment_notes: form.payment_notes,
    });

    // Auto-create linked expense transaction
    if (form.bank_account_id) {
      await base44.entities.Transaction.create({
        description: `Payable payment – ${payable.supplier_name}${payable.invoice_number ? ` (${payable.invoice_number})` : ""}`,
        amount: thisPayment,
        type: "expense",
        category: payable.category || "other",
        project_name: payable.project_name || "",
        bank_account_id: form.bank_account_id,
        date: form.payment_date,
        status: "completed",
      });
    }

    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>

        {/* Summary */}
        <div className="space-y-2 bg-muted/40 rounded-lg px-4 py-3 text-sm">
          <p className="font-semibold text-foreground">{payable.supplier_name}</p>
          {payable.description && <p className="text-muted-foreground">{payable.description}</p>}
          {payable.invoice_number && <p className="text-muted-foreground">Invoice: {payable.invoice_number}</p>}
          <div className="flex justify-between items-center mt-2">
            <span className="text-muted-foreground">Total</span>
            <span className="font-bold">₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <Progress value={paidPct} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Paid: ₱{alreadyPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            <span>Remaining: ₱{remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Payment History */}
        {history.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payment History</p>
            <div className="rounded-lg border border-border divide-y divide-border">
              {history.map((h, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                    <div>
                      <span className="font-medium capitalize">{methodLabel(h.payment_method)}</span>
                      {h.reference && <span className="text-muted-foreground ml-1.5 text-xs">· {h.reference}</span>}
                      <div className="text-xs text-muted-foreground">
                        {h.payment_date ? format(new Date(h.payment_date), "MMM d, yyyy") : ""}
                        {h.notes ? ` · ${h.notes}` : ""}
                      </div>
                    </div>
                  </div>
                  <span className="font-semibold text-primary">₱{(h.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
              <div className="flex justify-between px-3 py-2 bg-muted/30 text-sm font-semibold">
                <span>Total Paid</span>
                <span>₱{alreadyPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        )}

        {/* Already fully paid */}
        {remaining <= 0 ? (
          <div className="flex items-center gap-2 text-primary bg-primary/10 rounded-lg px-4 py-3 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            This payable is fully paid.
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">New Payment</p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Amount Paying Now</Label>
                  <Input
                    type="number"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00"
                    max={remaining}
                  />
                  <p className="text-xs text-muted-foreground">Max: ₱{remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
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
                <Label>Bank Account <span className="text-muted-foreground font-normal">(for expense transaction)</span></Label>
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

              {/* Preview */}
              {thisPayment > 0 && (
                <div className="bg-muted/40 rounded-lg px-4 py-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">After this payment</span>
                    <span className="font-semibold">₱{newTotalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })} / ₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span className={`font-semibold ${newTotalPaid >= totalAmount ? "text-primary" : "text-chart-3"}`}>
                      {newTotalPaid >= totalAmount ? "Fully Paid" : "Partially Paid"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={saving || thisPayment <= 0}>
                {saving ? "Saving..." : "Confirm Payment"}
              </Button>
            </DialogFooter>
          </>
        )}

        {remaining <= 0 && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}