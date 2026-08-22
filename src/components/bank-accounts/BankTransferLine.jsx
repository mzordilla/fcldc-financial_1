import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function BankTransferLine({ line, index, accounts, onChange, onRemove, canRemove }) {
  const options = (excludedId) => accounts.filter((account) => account.id !== excludedId).map((account) => <SelectItem key={account.id} value={account.id}>{account.account_name} — {account.bank_name}</SelectItem>);
  return <div className="rounded-lg border border-border bg-muted/30 p-3">
    <div className="mb-3 flex items-center justify-between"><p className="text-xs font-semibold text-foreground">Transfer {index + 1}</p>{canRemove && <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onRemove}><Trash2 className="h-3.5 w-3.5" /></Button>}</div>
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5"><Label>From Bank *</Label><Select value={line.fromId} onValueChange={(value) => onChange("fromId", value)}><SelectTrigger><SelectValue placeholder="Source account" /></SelectTrigger><SelectContent>{options(line.toId)}</SelectContent></Select></div>
      <div className="space-y-1.5"><Label>To Bank *</Label><Select value={line.toId} onValueChange={(value) => onChange("toId", value)}><SelectTrigger><SelectValue placeholder="Destination account" /></SelectTrigger><SelectContent>{options(line.fromId)}</SelectContent></Select></div>
    </div>
    <div className="mt-3 space-y-1.5"><Label>Amount (₱) *</Label><Input type="number" min="0.01" step="0.01" value={line.amount} onChange={(event) => onChange("amount", event.target.value)} required /></div>
  </div>;
}