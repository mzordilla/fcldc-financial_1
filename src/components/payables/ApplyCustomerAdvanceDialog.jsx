import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ApplyCustomerAdvanceDialog({ open, onOpenChange, advance, receivables, onSubmit }) {
  const [receivableId, setReceivableId] = useState(""); const [amount, setAmount] = useState(""); const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setReceivableId(""); setAmount(""); } }, [open]);
  if (!advance) return null;
  const selected = receivables.find(r => r.id === receivableId); const receivableBalance = selected ? (selected.amount || 0) - (selected.amount_paid || 0) : 0; const max = Math.min(advance.available_balance || 0, receivableBalance);
  const save = async () => { const value = Number(amount); if (!selected || value <= 0 || value > max) return; setSaving(true); await onSubmit(selected, value, format(new Date(), "yyyy-MM-dd")); setSaving(false); onOpenChange(false); };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Apply Customer Advance</DialogTitle></DialogHeader><div className="space-y-4">
    <div className="rounded-lg bg-muted/40 p-3 text-sm"><p className="font-semibold">{advance.client_name}</p><p className="text-muted-foreground">Available: ₱{(advance.available_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></div>
    <div className="space-y-1.5"><Label>Receivable</Label><Select value={receivableId} onValueChange={v => { setReceivableId(v); setAmount(""); }}><SelectTrigger><SelectValue placeholder="Select outstanding receivable" /></SelectTrigger><SelectContent>{receivables.map(r => <SelectItem key={r.id} value={r.id}>{r.invoice_number || r.project_name || "Receivable"} — ₱{((r.amount || 0) - (r.amount_paid || 0)).toLocaleString()}</SelectItem>)}</SelectContent></Select></div>
    <div className="space-y-1.5"><Label>Amount to Apply</Label><Input type="number" min="0" max={max} value={amount} onChange={e => setAmount(e.target.value)} /><p className="text-xs text-muted-foreground">Maximum: ₱{max.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></div>
  </div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save} disabled={saving || !selected || Number(amount) <= 0 || Number(amount) > max}>{saving ? "Applying..." : "Apply to Receivable"}</Button></DialogFooter></DialogContent></Dialog>;
}