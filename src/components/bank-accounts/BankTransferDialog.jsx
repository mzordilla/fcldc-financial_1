import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function BankTransferDialog({ open, onOpenChange, accounts, onSubmit }) {
  const [form, setForm] = useState({ fromId: "", toId: "", amount: "", date: "", reference: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const active = accounts.filter((account) => account.status !== "closed");

  useEffect(() => {
    if (open) setForm({ fromId: "", toId: "", amount: "", date: format(new Date(), "yyyy-MM-dd"), reference: "" });
    setError("");
  }, [open]);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    const amount = Number(form.amount);
    const source = accounts.find((account) => account.id === form.fromId);
    if (form.fromId === form.toId) return setError("Choose two different bank accounts.");
    if (!amount || amount <= 0) return setError("Enter a valid transfer amount.");
    if (amount > (source?.current_balance || 0)) return setError("The source account has insufficient funds.");
    setSaving(true);
    setError("");
    try {
      await onSubmit({ ...form, amount });
      onOpenChange(false);
    } catch {
      setError("The transfer could not be completed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const accountOptions = (excludedId) => active.filter((account) => account.id !== excludedId).map((account) => (
    <SelectItem key={account.id} value={account.id}>{account.account_name} — {account.bank_name}</SelectItem>
  ));

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader><DialogTitle>Transfer Between Banks</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>From Bank *</Label><Select value={form.fromId} onValueChange={(value) => set("fromId", value)}><SelectTrigger><SelectValue placeholder="Source account" /></SelectTrigger><SelectContent>{accountOptions(form.toId)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label>To Bank *</Label><Select value={form.toId} onValueChange={(value) => set("toId", value)}><SelectTrigger><SelectValue placeholder="Destination account" /></SelectTrigger><SelectContent>{accountOptions(form.fromId)}</SelectContent></Select></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Amount (₱) *</Label><Input type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => set("amount", event.target.value)} required /></div>
          <div className="space-y-1.5"><Label>Transfer Date *</Label><Input type="date" value={form.date} onChange={(event) => set("date", event.target.value)} required /></div>
        </div>
        <div className="space-y-1.5"><Label>Reference / Notes</Label><Input value={form.reference} onChange={(event) => set("reference", event.target.value)} placeholder="Transfer reference" /></div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={saving || !form.fromId || !form.toId}>{saving ? "Transferring..." : "Confirm Transfer"}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}