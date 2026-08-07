import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const fmt = (n) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const defaultForm = {
  collected_date: format(new Date(), "yyyy-MM-dd"),
  payment_method: "bank_transfer",
  bank_account_id: "",
  reference: "",
  notes: "",
};

// unit mode: tenant + record. group mode: tenants (array) + records (array, one per tenant, may be undefined)
export default function LeaseCollectionDetailsDialog({
  open, onOpenChange, tenant, tenants, month, monthLabel, record, records,
  onMarkCollected, onUndo, onMarkGroupCollected, onUndoGroup,
}) {
  const [form, setForm] = useState(defaultForm);
  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bankaccounts"],
    queryFn: () => base44.entities.BankAccount.list("-created_date", 100),
    enabled: open,
  });
  const isGroup = !!tenants;
  const isCollected = isGroup ? tenants.length > 0 && tenants.every((t, i) => records[i]?.collected) : !!record?.collected;

  useEffect(() => {
    if (open) setForm(defaultForm);
  }, [open, record, records]);

  const amount = isGroup
    ? tenants.reduce((s, t, i) => s + (records[i]?.amount ?? ((t.monthly_rent || 0) + (t.association_dues || 0))), 0)
    : (record?.amount ?? ((tenant?.monthly_rent || 0) + (tenant?.association_dues || 0)));

  const clientName = isGroup ? tenants[0]?.full_name : tenant?.full_name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isCollected ? "Collection Summary" : "Mark as Collected"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-border pb-2">
            <span className="text-muted-foreground">Client</span>
            <span className="font-medium text-foreground">{clientName}</span>
          </div>
          {isGroup ? (
            <div className="border-b border-border pb-2">
              <span className="text-muted-foreground">Units</span>
              <ul className="mt-1 space-y-1">
                {tenants.map((t, i) => (
                  <li key={t.id} className="flex justify-between text-xs">
                    <span className="text-foreground">{t.contract_attachment_url ? <a href={t.contract_attachment_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{t.unit_number || "View contract"}</a> : t.unit_number}{t.building ? ` · ${t.building}` : ""}</span>
                    <span className="text-muted-foreground">{fmt(records[i]?.amount ?? ((t.monthly_rent || 0) + (t.association_dues || 0)))}{records[i]?.collected ? " ✓" : ""}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Unit</span>
              <span className="font-medium text-foreground">{tenant?.contract_attachment_url ? <a href={tenant.contract_attachment_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{tenant.unit_number || "View contract"}</a> : tenant?.unit_number}{tenant?.building ? ` · ${tenant.building}` : ""}</span>
            </div>
          )}
          <div className="flex justify-between border-b border-border pb-2">
            <span className="text-muted-foreground">Month</span>
            <span className="font-medium text-foreground">{monthLabel}</span>
          </div>
          <div className="flex justify-between border-b border-border pb-2"><span className="text-muted-foreground">Rent</span><span>{fmt(isGroup ? tenants.reduce((sum, t, i) => sum + (records[i]?.rent_amount ?? t.monthly_rent ?? 0), 0) : (record?.rent_amount ?? tenant?.monthly_rent ?? 0))}</span></div>
          <div className="flex justify-between border-b border-border pb-2"><span className="text-muted-foreground">Association Dues</span><span>{fmt(isGroup ? tenants.reduce((sum, t, i) => sum + (records[i]?.association_dues ?? t.association_dues ?? 0), 0) : (record?.association_dues ?? tenant?.association_dues ?? 0))}</span></div>
          <div className="flex justify-between border-b border-border pb-2">
            <span className="text-muted-foreground">{isGroup ? "Total Amount" : "Amount"}</span>
            <span className="font-semibold text-primary">{fmt(amount)}</span>
          </div>

          {isCollected ? (
            !isGroup && (
              <>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Collected Date</span>
                  <span className="font-medium text-foreground">{record.collected_date ? format(new Date(record.collected_date), "MMM d, yyyy") : "—"}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Payment Method</span>
                  <span className="font-medium text-foreground capitalize">{(record.payment_method || "—").replace("_", " ")}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Reference</span>
                  <span className="font-medium text-foreground">{record.reference || "—"}</span>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Notes</p>
                  <p className="text-foreground">{record.notes || "—"}</p>
                </div>
              </>
            )
          ) : (
            <div className="space-y-3 pt-1">
              <div>
                <Label className="text-xs">Collected Date</Label>
                <Input type="date" value={form.collected_date} onChange={(e) => setForm({ ...form, collected_date: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Payment Method</Label>
                <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Deposit To Bank *</Label>
                <Select value={form.bank_account_id} onValueChange={(v) => setForm({ ...form, bank_account_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select bank account" /></SelectTrigger>
                  <SelectContent>
                    {bankAccounts.filter((account) => account.status !== "closed").map((account) => (
                      <SelectItem key={account.id} value={account.id}>{account.account_name} – {account.bank_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Reference</Label>
                <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Check no., transfer ref., etc." />
              </div>
              <div>
                <Label className="text-xs">Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {isCollected ? (
            isGroup ? (
              <Button variant="outline" onClick={() => onUndoGroup(tenants, month, records)}>Undo Collection for All Units</Button>
            ) : (
              <Button variant="outline" onClick={() => onUndo(tenant, month, record)}>Undo Collection</Button>
            )
          ) : isGroup ? (
            <Button disabled={!form.bank_account_id} onClick={() => onMarkGroupCollected(tenants, month, records, form)}>Mark All Units as Collected</Button>
          ) : (
            <Button disabled={!form.bank_account_id} onClick={() => onMarkCollected(tenant, month, record, form)}>Mark as Collected</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}