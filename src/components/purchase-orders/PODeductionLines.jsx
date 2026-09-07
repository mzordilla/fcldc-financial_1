import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PODeductionLines({ deductions, onChange, accounts, subtotal }) {
  const balanceSheetAccounts = accounts.filter(account => account.is_active !== false && ["asset", "liability", "equity"].includes(account.account_type));
  const update = (index, values) => onChange(deductions.map((item, i) => i === index ? { ...item, ...values } : item));

  return <div className="space-y-3 rounded-sm border border-slate-300 bg-slate-50 p-3">
    <div className="flex items-center justify-between gap-3">
      <div><Label className="text-xs font-semibold text-slate-700">Deductions from Pre-VAT Subtotal</Label><p className="text-xs text-slate-500">Example: Subcon retention at 5% or 10%</p></div>
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...deductions, { description: "", percentage: "", amount: 0, chart_of_account: "", account_code: "" }])}><Plus className="h-3.5 w-3.5" /> Add</Button>
    </div>
    {deductions.map((item, index) => <div key={index} className="grid grid-cols-1 items-end gap-2 md:grid-cols-[1.2fr_.5fr_1.3fr_.7fr_auto]">
      <div><Label className="text-xs">Description</Label><Input placeholder="Subcon retention" value={item.description || ""} onChange={event => update(index, { description: event.target.value })} /></div>
      <div><Label className="text-xs">Percent</Label><Input type="number" min="0" max="100" step="0.01" value={item.percentage ?? ""} onChange={event => update(index, { percentage: event.target.value })} /></div>
      <div><Label className="text-xs">Balance Sheet Account</Label><Select value={item.chart_of_account || ""} onValueChange={value => { const account = balanceSheetAccounts.find(entry => entry.account_name === value); update(index, { chart_of_account: value, account_code: account?.account_code || "" }); }}><SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger><SelectContent>{balanceSheetAccounts.map(account => <SelectItem key={account.id} value={account.account_name}>{account.account_code ? `${account.account_code} — ` : ""}{account.account_name}</SelectItem>)}</SelectContent></Select></div>
      <div><Label className="text-xs">Amount</Label><Input readOnly value={(subtotal * (Number(item.percentage) || 0) / 100).toFixed(2)} className="bg-white text-right" /></div>
      <Button type="button" variant="ghost" size="icon" onClick={() => onChange(deductions.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
    </div>)}
  </div>;
}