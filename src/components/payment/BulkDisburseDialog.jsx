import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Banknote, Loader2 } from "lucide-react";

const today = new Date().toISOString().split("T")[0];

export default function BulkDisburseDialog({ open, onOpenChange, requests = [], onConfirm }) {
  const [bankAccountId, setBankAccountId] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentDate, setPaymentDate] = useState(today);
  const [saving, setSaving] = useState(false);

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bankaccounts"],
    queryFn: () => base44.entities.BankAccount.list("-created_date", 100),
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setBankAccountId("");
      setPaymentReference("");
      setPaymentDate(today);
    }
  }, [open]);

  const total = requests.reduce((s, r) => s + ((r.amount || 0) - (r.withholding_tax_amount || 0) + (r.vat_amount || 0)), 0);

  const handleConfirm = async () => {
    setSaving(true);
    await onConfirm({ bankAccountId, paymentReference, paymentDate });
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-chart-2" /> Disburse {requests.length} Requests as One Check
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-xl p-4 space-y-1">
            <p className="font-semibold">{requests[0]?.payee}</p>
            {requests.map(r => (
              <div key={r.id} className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{r.request_number || r.invoice_number || r.id.slice(-6)}</span>
                <span>₱{((r.amount || 0) - (r.withholding_tax_amount || 0) + (r.vat_amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
            <p className="text-xl font-bold text-foreground mt-1 pt-1 border-t border-border">Total: ₱{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>

          <div className="space-y-1.5">
            <Label>Payment Date</Label>
            <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Bank Account</Label>
            <Select value={bankAccountId} onValueChange={setBankAccountId}>
              <SelectTrigger><SelectValue placeholder="Select bank account..." /></SelectTrigger>
              <SelectContent>
                {bankAccounts.filter(a => a.status !== "closed").map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.account_name} – {a.bank_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Check / Reference Number</Label>
            <Input placeholder="e.g. CHK-0012345" value={paymentReference} onChange={e => setPaymentReference(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={saving} className="bg-chart-2 hover:bg-chart-2/90 text-white">
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Banknote className="w-4 h-4 mr-1" />}
            {saving ? "Disbursing..." : "Confirm Disbursement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}