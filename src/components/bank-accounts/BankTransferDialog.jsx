import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BankTransferLine from "@/components/bank-accounts/BankTransferLine";

const emptyLine = () => ({ fromId: "", toId: "", amount: "" });

export default function BankTransferDialog({ open, onOpenChange, accounts, onSubmit }) {
  const [form, setForm] = useState({ transfers: [emptyLine()], date: "", reference: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const active = accounts.filter((account) => account.status !== "closed");

  useEffect(() => {
    if (open) setForm({ transfers: [emptyLine()], date: format(new Date(), "yyyy-MM-dd"), reference: "" });
    setError("");
  }, [open]);

  const updateLine = (index, key, value) => setForm((current) => ({ ...current, transfers: current.transfers.map((line, lineIndex) => lineIndex === index ? { ...line, [key]: value } : line) }));
  const submit = async (event) => {
    event.preventDefault();
    const transfers = form.transfers.map((line) => ({ ...line, amount: Number(line.amount) }));
    if (transfers.some((line) => !line.fromId || !line.toId || !line.amount || line.amount <= 0)) return setError("Complete every transfer line with a valid amount.");
    if (transfers.some((line) => line.fromId === line.toId)) return setError("Each transfer must use two different bank accounts.");
    const outgoing = transfers.reduce((totals, line) => ({ ...totals, [line.fromId]: (totals[line.fromId] || 0) + line.amount }), {});
    const insufficient = Object.entries(outgoing).some(([id, amount]) => amount > (accounts.find((account) => account.id === id)?.current_balance || 0));
    if (insufficient) return setError("One or more source accounts have insufficient funds for the combined transfers.");
    setSaving(true);
    setError("");
    try { await onSubmit({ transfers, date: form.date, reference: form.reference }); onOpenChange(false); }
    catch { setError("The transfer request could not be submitted. Please try again."); }
    finally { setSaving(false); }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader><DialogTitle>Request Bank Transfers</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-3">{form.transfers.map((line, index) => <BankTransferLine key={index} line={line} index={index} accounts={active} canRemove={form.transfers.length > 1} onChange={(key, value) => updateLine(index, key, value)} onRemove={() => setForm((current) => ({ ...current, transfers: current.transfers.filter((_, lineIndex) => lineIndex !== index) }))} />)}</div>
        <Button type="button" size="sm" variant="outline" onClick={() => setForm((current) => ({ ...current, transfers: [...current.transfers, emptyLine()] }))}><Plus className="h-3.5 w-3.5" /> Add Another Transfer</Button>
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label>Transfer Date *</Label><Input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} required /></div><div className="space-y-1.5"><Label>Reference / Notes</Label><Input value={form.reference} onChange={(event) => setForm((current) => ({ ...current, reference: event.target.value }))} placeholder="Batch reference" /></div></div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Submitting..." : `Submit ${form.transfers.length} Transfer${form.transfers.length > 1 ? "s" : ""} for Approval`}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}