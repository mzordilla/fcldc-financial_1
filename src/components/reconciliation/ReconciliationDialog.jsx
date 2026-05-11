import { useState, useEffect, useMemo } from "react";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DEFAULT = {
  bank_account_id: "",
  account_name: "",
  period_label: "",
  period_start: "",
  period_end: "",
  opening_balance: 0,
  closing_balance_bank: 0,
  closing_balance_book: 0,
  deposits_in_transit: 0,
  outstanding_checks: 0,
  bank_errors: 0,
  bank_charges: 0,
  interest_earned: 0,
  book_errors: 0,
  status: "in_progress",
  notes: "",
};

function NumField({ label, name, value, onChange, hint }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
      {hint && <p className="text-[10px] text-muted-foreground mb-1">{hint}</p>}
      <input
        type="number"
        step="0.01"
        value={value ?? 0}
        onChange={e => onChange(name, parseFloat(e.target.value) || 0)}
        className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  );
}

function computeAdjustedBank(form) {
  return (form.closing_balance_bank || 0)
    + (form.deposits_in_transit || 0)
    - (form.outstanding_checks || 0)
    + (form.bank_errors || 0);
}

function computeAdjustedBook(form) {
  return (form.closing_balance_book || 0)
    + (form.interest_earned || 0)
    - (form.bank_charges || 0)
    + (form.book_errors || 0);
}

const fmt = (v) => `₱${(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ReconciliationDialog({ open, onOpenChange, bankAccounts, transactions, initialData, onSubmit }) {
  const [form, setForm] = useState(DEFAULT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initialData ? { ...DEFAULT, ...initialData } : DEFAULT);
    }
  }, [open, initialData]);

  function set(key, val) {
    setForm(prev => {
      const next = { ...prev, [key]: val };
      // Auto-fill account name when account selected
      if (key === "bank_account_id") {
        const acc = bankAccounts.find(a => a.id === val);
        next.account_name = acc?.account_name || acc?.bank_name || "";
        // Auto compute book balance from transactions for the period
        if (next.period_start && next.period_end && val) {
          const periodTx = transactions.filter(t =>
            t.bank_account_id === val &&
            t.date >= next.period_start &&
            t.date <= next.period_end
          );
          const inc = periodTx.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
          const exp = periodTx.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
          next.closing_balance_book = (acc?.current_balance || 0);
          // label
          if (next.period_start) {
            next.period_label = format(parseISO(next.period_start), "MMMM yyyy");
          }
        }
      }
      if (key === "period_start" && val) {
        next.period_label = format(parseISO(val), "MMMM yyyy");
        if (!next.period_end) {
          next.period_end = format(endOfMonth(parseISO(val)), "yyyy-MM-dd");
        }
      }
      return next;
    });
  }

  // Auto-determine status
  const adjBank = computeAdjustedBank(form);
  const adjBook = computeAdjustedBook(form);
  const diff = adjBank - adjBook;
  const isBalanced = Math.abs(diff) < 0.01;

  async function handleSubmit() {
    setSaving(true);
    const status = isBalanced ? "reconciled" : form.status === "in_progress" ? "in_progress" : "discrepancy";
    await onSubmit({ ...form, status });
    setSaving(false);
    onOpenChange(false);
  }

  const txSummary = useMemo(() => {
    if (!form.bank_account_id || !form.period_start || !form.period_end) return null;
    const periodTx = transactions.filter(t =>
      t.bank_account_id === form.bank_account_id &&
      t.date >= form.period_start &&
      t.date <= form.period_end
    );
    const inc = periodTx.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
    const exp = periodTx.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
    return { count: periodTx.length, inc, exp };
  }, [form.bank_account_id, form.period_start, form.period_end, transactions]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Reconciliation" : "New Bank Reconciliation"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Account & Period */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="text-xs font-medium text-muted-foreground block mb-1">Bank Account *</label>
              <Select value={form.bank_account_id} onValueChange={v => set("bank_account_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {bankAccounts.filter(a => a.status !== "closed").map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.account_name} — {a.bank_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Period Start *</label>
              <input
                type="date"
                value={form.period_start}
                onChange={e => set("period_start", e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Period End *</label>
              <input
                type="date"
                value={form.period_end}
                onChange={e => set("period_end", e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          {/* Transaction summary hint */}
          {txSummary && (
            <div className="bg-muted/40 rounded-xl px-4 py-2.5 text-xs text-muted-foreground flex gap-4">
              <span>{txSummary.count} transactions found for this period</span>
              <span className="text-primary">+{fmt(txSummary.inc)} in</span>
              <span className="text-destructive">−{fmt(txSummary.exp)} out</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Bank Side */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border pb-1">Bank Statement Side</p>
              <NumField label="Closing Balance (Bank Statement)" name="closing_balance_bank" value={form.closing_balance_bank} onChange={set} />
              <NumField label="+ Deposits in Transit" name="deposits_in_transit" value={form.deposits_in_transit} onChange={set} hint="Recorded in books but not yet cleared" />
              <NumField label="− Outstanding Checks" name="outstanding_checks" value={form.outstanding_checks} onChange={set} hint="Issued but not yet presented to bank" />
              <NumField label="± Bank Errors" name="bank_errors" value={form.bank_errors} onChange={set} hint="Use negative for errors that reduce bank balance" />
              <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5 flex justify-between text-sm font-semibold">
                <span>Adjusted Bank Balance</span>
                <span className="text-primary">{fmt(adjBank)}</span>
              </div>
            </div>

            {/* Book Side */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border pb-1">Books / System Side</p>
              <NumField label="Closing Balance (Books)" name="closing_balance_book" value={form.closing_balance_book} onChange={set} />
              <NumField label="+ Interest Earned" name="interest_earned" value={form.interest_earned} onChange={set} hint="Not yet recorded in books" />
              <NumField label="− Bank Charges / Fees" name="bank_charges" value={form.bank_charges} onChange={set} hint="Deducted by bank, not yet in books" />
              <NumField label="± Book Errors" name="book_errors" value={form.book_errors} onChange={set} hint="Use negative to reduce book balance" />
              <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5 flex justify-between text-sm font-semibold">
                <span>Adjusted Book Balance</span>
                <span className="text-primary">{fmt(adjBook)}</span>
              </div>
            </div>
          </div>

          {/* Difference */}
          <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${isBalanced ? "bg-primary/5 border border-primary/20" : "bg-destructive/5 border border-destructive/20"}`}>
            <span className="font-semibold">Difference (Bank − Book)</span>
            <span className={`text-lg font-bold ${isBalanced ? "text-primary" : "text-destructive"}`}>
              {isBalanced ? "✓ Balanced" : fmt(diff)}
            </span>
          </div>

          {/* Status override + notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Status</label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="reconciled">Reconciled</SelectItem>
                  <SelectItem value="discrepancy">Discrepancy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Notes</label>
              <textarea
                value={form.notes || ""}
                onChange={e => set("notes", e.target.value)}
                rows={2}
                placeholder="Optional notes or explanation..."
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !form.bank_account_id || !form.period_start || !form.period_end}>
            {saving ? "Saving..." : initialData ? "Save Changes" : "Create Reconciliation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}