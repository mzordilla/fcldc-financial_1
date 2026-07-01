import { useState, useMemo } from "react";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

export default function DepositUndepositedDialog({ open, onOpenChange, receivables, bankAccounts, onDone }) {
  const [bankAccountId, setBankAccountId] = useState("");
  const [selected, setSelected] = useState({});
  const [saving, setSaving] = useState(false);

  // Flatten all undeposited payment_history entries across receivables
  const entries = useMemo(() => {
    const list = [];
    receivables.forEach((rec) => {
      (rec.payment_history || []).forEach((payment, idx) => {
        if (!payment.bank_account_id || payment.bank_account_id === "") {
          list.push({
            key: `${rec.id}-${idx}`,
            receivableId: rec.id,
            entryIndex: idx,
            client_name: rec.client_name,
            invoice_number: rec.invoice_number,
            project_code: rec.project_code,
            amount: payment.amount || 0,
            collection_date: payment.collection_date,
            reference: payment.reference,
          });
        }
      });
    });
    return list;
  }, [receivables]);

  const selectedEntries = entries.filter((e) => selected[e.key]);
  const totalSelected = selectedEntries.reduce((s, e) => s + e.amount, 0);

  const toggle = (key) => setSelected((s) => ({ ...s, [key]: !s[key] }));
  const toggleAll = () => {
    if (selectedEntries.length === entries.length) {
      setSelected({});
    } else {
      const all = {};
      entries.forEach((e) => { all[e.key] = true; });
      setSelected(all);
    }
  };

  const handleSubmit = async () => {
    if (!bankAccountId || selectedEntries.length === 0) return;
    setSaving(true);

    // Group selected entries by receivable so we update each receivable once
    const byReceivable = {};
    selectedEntries.forEach((e) => {
      if (!byReceivable[e.receivableId]) byReceivable[e.receivableId] = [];
      byReceivable[e.receivableId].push(e);
    });

    for (const [receivableId, recEntries] of Object.entries(byReceivable)) {
      const rec = receivables.find((r) => r.id === receivableId);
      const updatedHistory = [...(rec.payment_history || [])];
      recEntries.forEach((e) => {
        updatedHistory[e.entryIndex] = {
          ...updatedHistory[e.entryIndex],
          bank_account_id: bankAccountId,
          undeposited: false,
        };
      });
      await base44.entities.Receivable.update(receivableId, { payment_history: updatedHistory });

      for (const e of recEntries) {
        await base44.entities.Transaction.create({
          description: `Deposit — ${e.client_name}${e.invoice_number ? ` (${e.invoice_number})` : ""}${e.reference ? ` · ${e.reference}` : ""}`,
          amount: e.amount,
          type: "income",
          category: "project_payment",
          project_code: e.project_code || "",
          chart_of_account: "Cash and Cash Equivalents",
          bank_account_id: bankAccountId,
          date: format(new Date(), "yyyy-MM-dd"),
          status: "completed",
        });
      }
    }

    setSaving(false);
    setSelected({});
    setBankAccountId("");
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Deposit Undeposited Collections</DialogTitle>
        </DialogHeader>

        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No undeposited collections to deposit.</p>
        ) : (
          <>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Deposit To</p>
              <Select value={bankAccountId} onValueChange={setBankAccountId}>
                <SelectTrigger><SelectValue placeholder="Select bank account" /></SelectTrigger>
                <SelectContent>
                  {bankAccounts.filter((a) => a.status !== "closed").map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.account_name} – {a.bank_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b border-border text-xs font-semibold text-muted-foreground">
                <Checkbox checked={selectedEntries.length === entries.length} onCheckedChange={toggleAll} />
                <span>Select All ({entries.length})</span>
              </div>
              <div className="divide-y divide-border max-h-64 overflow-y-auto">
                {entries.map((e) => (
                  <label key={e.key} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted/20">
                    <Checkbox checked={!!selected[e.key]} onCheckedChange={() => toggle(e.key)} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{e.client_name}{e.invoice_number ? ` · ${e.invoice_number}` : ""}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.collection_date ? format(new Date(e.collection_date), "MMM d, yyyy") : "—"}
                        {e.reference ? ` · ${e.reference}` : ""}
                      </p>
                    </div>
                    <span className="font-semibold text-foreground whitespace-nowrap">₱{e.amount.toLocaleString()}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center text-sm px-1">
              <span className="text-muted-foreground">Total to Deposit</span>
              <span className="font-bold text-foreground">₱{totalSelected.toLocaleString()}</span>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {entries.length > 0 && (
            <Button onClick={handleSubmit} disabled={saving || !bankAccountId || selectedEntries.length === 0}>
              {saving ? "Depositing..." : "Confirm Deposit"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}