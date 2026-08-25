import { useMemo, useState } from "react";
import { Save, Printer, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { numberToWords } from "@/lib/checkUtils";
import ApprovedPRSelect from "@/components/check-writer/ApprovedPRSelect";

const initial = { bank_account_id: "", payee: "", amount: "", check_number: "", check_date: new Date().toISOString().split("T")[0], memo: "" };
export default function CheckForm({ bankAccounts, approvedRequests, payees, loadingRequests, onSave, saving }) {
  const [form, setForm] = useState(initial); const [error, setError] = useState("");
  const [selectedRequestIds, setSelectedRequestIds] = useState([]);
  const [checkType, setCheckType] = useState("standard");
  const [destinationId, setDestinationId] = useState("");
  const switchType = type => {
    setCheckType(type); setDestinationId(""); setSelectedRequestIds([]); setError("");
    setForm(current => ({ ...initial, bank_account_id: current.bank_account_id, check_number: current.check_number, check_date: current.check_date }));
  };
  const selectDestination = id => {
    setDestinationId(id);
    const dest = bankAccounts.find(a => a.id === id);
    if (dest) setForm(current => ({ ...current, payee: dest.account_name, memo: `Fund transfer to ${dest.account_name} – ${dest.bank_name}` }));
  };
  const words = useMemo(() => numberToWords(Number(form.amount || 0)), [form.amount]);
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const toggleRequest = (request, checked) => {
    const nextIds = checked ? [...selectedRequestIds, request.id] : selectedRequestIds.filter(id => id !== request.id);
    const selected = approvedRequests.filter(item => nextIds.includes(item.id));
    setSelectedRequestIds(nextIds);
    if (!selected.length) return setForm(current => ({ ...initial, bank_account_id: current.bank_account_id, check_number: current.check_number, check_date: current.check_date }));
    const amount = selected.reduce((sum, item) => sum + (item.amount || 0) - (item.withholding_tax_amount || 0) + (item.vat_amount || 0), 0);
    const numbers = selected.map(item => item.request_number || item.invoice_number || item.id);
    const selectedPayees = new Set(selected.map(item => item.payee));
    const supplier = payees.find(item => item.name?.trim().toLowerCase() === selected[0].payee?.trim().toLowerCase());
    const checkPayee = selectedPayees.size > 1 ? "CASH" : supplier?.bank_account_name || selected[0].payee;
    setForm(current => ({ ...current, payee: checkPayee, amount: String(amount), memo: `Combined payment for ${numbers.join(", ")}`, source: "payment_approval", payment_request_ids: nextIds, payment_request_numbers: numbers }));
  };
  const submit = async print => {
    if (!form.bank_account_id || !form.payee || !Number(form.amount) || !form.check_number || !form.check_date) return setError("Complete all required fields.");
    if (checkType === "fund_transfer" && !destinationId) return setError("Select a destination bank account.");
    if (checkType === "fund_transfer" && destinationId === form.bank_account_id) return setError("Source and destination banks must be different.");
    setError(""); const printWindow = print ? window.open("", "_blank", "width=950,height=650") : null;
    const dest = bankAccounts.find(a => a.id === destinationId);
    const payload = checkType === "fund_transfer"
      ? { ...form, source: "fund_transfer", destination_bank_account_id: destinationId, destination_bank_name: dest ? `${dest.account_name} – ${dest.bank_name}` : "" }
      : form;
    try { await onSave({ ...payload, amount: Number(form.amount), amount_in_words: words }, print, printWindow); setForm(initial); setSelectedRequestIds([]); setDestinationId(""); }
    catch (e) { printWindow?.close(); setError(e.message || "Unable to save check."); }
  };
  return <section className="bg-card border border-border rounded-xl p-3 space-y-2.5">
    <div><p className="text-[10px] font-semibold uppercase tracking-widest text-primary">New instrument</p><h2 className="text-lg font-bold">Write a Check</h2></div>
    <div className="grid grid-cols-2 gap-1 bg-muted/50 border border-border rounded-lg p-1">
      <button type="button" onClick={() => switchType("standard")} className={`text-xs font-semibold rounded-md py-1.5 transition-colors ${checkType === "standard" ? "bg-card border border-border shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Payment / PR</button>
      <button type="button" onClick={() => switchType("fund_transfer")} className={`text-xs font-semibold rounded-md py-1.5 transition-colors ${checkType === "fund_transfer" ? "bg-card border border-border shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Fund Transfer</button>
    </div>
    {checkType === "standard" && <ApprovedPRSelect requests={approvedRequests} selectedIds={selectedRequestIds} onToggle={toggleRequest} loading={loadingRequests} />}
    <div className="space-y-1.5"><Label>Source Bank *</Label><Select value={form.bank_account_id} onValueChange={v => set("bank_account_id", v)}><SelectTrigger><SelectValue placeholder="Select bank account" /></SelectTrigger><SelectContent>{bankAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.account_name} — {a.bank_name}</SelectItem>)}</SelectContent></Select></div>
    {checkType === "fund_transfer" && (
      <div className="space-y-1.5"><Label>Destination Bank *</Label><Select value={destinationId} onValueChange={selectDestination}><SelectTrigger><SelectValue placeholder="Select destination account" /></SelectTrigger><SelectContent>{bankAccounts.filter(a => a.id !== form.bank_account_id).map(a => <SelectItem key={a.id} value={a.id}>{a.account_name} — {a.bank_name}</SelectItem>)}</SelectContent></Select></div>
    )}
    <div className="space-y-1.5"><Label>Pay to the Order of *</Label><Input value={form.payee} onChange={e => set("payee", e.target.value)} disabled={selectedRequestIds.length > 0} /></div>
    <div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label>Amount *</Label><Input type="number" min="0" step="0.01" value={form.amount} onChange={e => set("amount", e.target.value)} disabled={selectedRequestIds.length > 0} /></div><div className="space-y-1.5"><Label>Check Number *</Label><Input value={form.check_number} onChange={e => set("check_number", e.target.value)} /></div></div>
    <div className="space-y-1.5"><Label>Check Date *</Label><Input type="date" value={form.check_date} onChange={e => set("check_date", e.target.value)} /></div>
    <div className="space-y-1.5"><Label>Memo</Label><Input value={form.memo} onChange={e => set("memo", e.target.value)} /></div>
    <div className="rounded-xl bg-muted/50 border border-border p-3"><p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Amount in words</p><p className="text-xs font-mono font-semibold leading-relaxed">{words}</p></div>
    {error && <p className="text-sm text-destructive">{error}</p>}
    <div className="grid grid-cols-2 gap-2"><Button variant="outline" disabled={saving} onClick={() => submit(false)}>{saving ? <Loader2 className="animate-spin" /> : <Save />} Save Check</Button><Button disabled={saving} onClick={() => submit(true)}><Printer /> Save & Print</Button></div>
  </section>;
}