import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const blank = { client_id: "", amount: "", received_date: format(new Date(), "yyyy-MM-dd"), bank_account_id: "", reference: "", notes: "" };
export default function AddCustomerAdvanceDialog({ open, onOpenChange, clients, bankAccounts, onSubmit }) {
  const [form, setForm] = useState(blank); const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setForm(blank); }, [open]);
  const save = async () => { const client = clients.find(c => c.id === form.client_id); const amount = Number(form.amount); if (!client || amount <= 0) return; setSaving(true); await onSubmit({ ...form, amount, client_name: client.client_name, applied_amount: 0, available_balance: amount, status: "available", application_history: [] }); setSaving(false); onOpenChange(false); };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Record Customer Advance</DialogTitle></DialogHeader><div className="space-y-4">
    <div className="space-y-1.5"><Label>Client</Label><Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v }))}><SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger><SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.client_name}</SelectItem>)}</SelectContent></Select></div>
    <div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><Label>Advance Amount</Label><Input type="number" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div><div className="space-y-1.5"><Label>Date Received</Label><Input type="date" value={form.received_date} onChange={e => setForm(f => ({ ...f, received_date: e.target.value }))} /></div></div>
    <div className="space-y-1.5"><Label>Deposit To</Label><Select value={form.bank_account_id} onValueChange={v => setForm(f => ({ ...f, bank_account_id: v }))}><SelectTrigger><SelectValue placeholder="Select bank account" /></SelectTrigger><SelectContent>{bankAccounts.filter(a => a.status !== "closed").map(a => <SelectItem key={a.id} value={a.id}>{a.account_name} – {a.bank_name}</SelectItem>)}</SelectContent></Select></div>
    <div className="space-y-1.5"><Label>Reference</Label><Input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="Receipt or transfer reference" /></div><div className="space-y-1.5"><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
  </div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save} disabled={saving || !form.client_id || Number(form.amount) <= 0}>{saving ? "Saving..." : "Record Advance"}</Button></DialogFooter></DialogContent></Dialog>;
}