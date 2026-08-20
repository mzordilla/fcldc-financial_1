import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getLoanBalance } from "@/lib/loanBalance";
import LoanLedgerHistory from "./LoanLedgerHistory";

const initialForm = () => ({ entry_type: "payment", entry_date: format(new Date(), "yyyy-MM-dd"), amount: "", reference: "", notes: "" });
export default function LoanLedgerDialog({ open, onOpenChange, loan, onConfirm }) {
  const [form, setForm] = useState(initialForm());
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setForm(initialForm()); }, [open]);
  if (!loan) return null;
  const amount = Number(form.amount) || 0;
  const balance = getLoanBalance(loan);
  const nextBalance = form.entry_type === "availment" ? balance + amount : Math.max(0, balance - amount);
  const invalid = amount <= 0 || (form.entry_type === "payment" && amount > balance);
  const submit = async () => { setSaving(true); await onConfirm({ ...form, amount }); setSaving(false); onOpenChange(false); };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>Loan Account Ledger — {loan.creditor}</DialogTitle></DialogHeader>
    <LoanLedgerHistory loan={loan} />
    <div className="border-t border-border pt-4"><p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">New Manual Entry</p><div className="grid grid-cols-2 gap-3">
      <div className="space-y-1"><Label>Entry Type</Label><Select value={form.entry_type} onValueChange={(value) => setForm({ ...form, entry_type: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="availment">Availment</SelectItem><SelectItem value="payment">Payment</SelectItem></SelectContent></Select></div>
      <div className="space-y-1"><Label>Date</Label><Input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} /></div>
      <div className="space-y-1"><Label>Amount</Label><Input type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" /></div>
      <div className="space-y-1"><Label>Reference</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Reference number" /></div>
      <div className="col-span-2 space-y-1"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" /></div>
    </div>{form.entry_type === "payment" && amount > balance && <p className="mt-2 text-xs text-destructive">Payment cannot exceed the outstanding balance.</p>}<div className="mt-3 flex justify-between rounded-md bg-muted px-3 py-2 text-sm"><span>Balance after entry</span><strong>₱{nextBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></div></div>
    <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={saving || invalid} onClick={submit}>{saving ? "Saving..." : "Save Entry"}</Button></DialogFooter>
  </DialogContent></Dialog>;
}