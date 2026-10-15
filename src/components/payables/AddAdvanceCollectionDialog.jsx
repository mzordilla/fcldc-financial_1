import { useEffect, useState } from "react";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const blank = () => ({ collection_date: format(new Date(), "yyyy-MM-dd"), amount: "", bank_account_id: "", reference: "", notes: "", receipt_url: "", check_image_url: "" });

export default function AddAdvanceCollectionDialog({ open, onOpenChange, advance, bankAccounts, onSubmit }) {
  const [form, setForm] = useState(blank()); const [saving, setSaving] = useState(false); const [uploading, setUploading] = useState("");
  useEffect(() => { if (open) setForm(blank()); }, [open]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const upload = async (key, file) => { if (!file) return; setUploading(key); const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file }); set(key, file_uri); setUploading(""); };
  const save = async () => { const amount = Number(form.amount); if (amount <= 0 || !form.collection_date) return; setSaving(true); await onSubmit({ ...form, amount }); setSaving(false); onOpenChange(false); };
  const fileField = (key, label) => <div className="space-y-1.5"><Label>{label}</Label><Input type="file" accept="image/*,application/pdf" onChange={e => upload(key, e.target.files[0])} />{uploading === key ? <p className="text-xs text-muted-foreground">Uploading...</p> : form[key] && <p className="text-xs text-primary">Attached</p>}</div>;
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Add Collection — {advance?.client_name}</DialogTitle></DialogHeader><div className="space-y-4">
    <div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><Label>Amount</Label><Input type="number" min="0" value={form.amount} onChange={e => set("amount", e.target.value)} /></div><div className="space-y-1.5"><Label>Collection Date</Label><Input type="date" value={form.collection_date} onChange={e => set("collection_date", e.target.value)} /></div></div>
    <div className="space-y-1.5"><Label>Deposit To</Label><Select value={form.bank_account_id} onValueChange={v => set("bank_account_id", v)}><SelectTrigger><SelectValue placeholder="Select bank account" /></SelectTrigger><SelectContent><SelectItem value="undeposited">📥 Undeposited Collections</SelectItem>{bankAccounts.filter(a => a.status !== "closed").map(a => <SelectItem key={a.id} value={a.id}>{a.bank_name} — {a.account_name}</SelectItem>)}</SelectContent></Select></div>
    <div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><Label>Reference / OR No.</Label><Input value={form.reference} onChange={e => set("reference", e.target.value)} /></div><div className="space-y-1.5"><Label>Notes</Label><Input value={form.notes} onChange={e => set("notes", e.target.value)} /></div></div>
    <div className="grid grid-cols-2 gap-4">{fileField("receipt_url", "Receipt Photo")}{fileField("check_image_url", "Check Photo")}</div>
  </div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save} disabled={saving || !!uploading || Number(form.amount) <= 0}>{saving ? "Saving..." : "Save Collection"}</Button></DialogFooter></DialogContent></Dialog>;
}