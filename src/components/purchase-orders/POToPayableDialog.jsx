import { useState, useEffect } from "react";
import { format, addDays } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";

// Maps PO category to CoA classification
const CATEGORY_COA_MAP = {
  materials:      { account: "Raw Materials Inventory",     type: "asset",   txCategory: "material_cost" },
  equipment:      { account: "Property, Plant & Equipment", type: "asset",   txCategory: "equipment" },
  subcontractor:  { account: "Subcontractor Expense",       type: "expense", txCategory: "subcontractor" },
  services:       { account: "Professional Services Expense",type: "expense", txCategory: "other" },
  utilities:      { account: "Utilities Expense",           type: "expense", txCategory: "other" },
  other:          { account: "General Expense",             type: "expense", txCategory: "other" },
};

export default function POToPayableDialog({ open, onOpenChange, po, onSuccess }) {
  const [form, setForm] = useState({
    invoice_number: "",
    due_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
  });
  const [saving, setSaving] = useState(false);

  // The PO was already classified when it was requested — reuse its account, no re-asking here
  const coaEntry = CATEGORY_COA_MAP[po?.category] || CATEGORY_COA_MAP.other;
  const debitAccount = po?.chart_of_account || coaEntry.account;

  useEffect(() => {
    if (po) setForm({ invoice_number: "", due_date: format(addDays(new Date(), 30), "yyyy-MM-dd") });
  }, [po?.id]);

  const handleSubmit = async () => {
    setSaving(true);
    const isAsset = coaEntry.type === "asset";
    const txCategory = isAsset ? (po.category === "equipment" ? "equipment" : "material_cost") : coaEntry.txCategory;
    const today = format(new Date(), "yyyy-MM-dd");

    // Cost already recognized when the delivery was received? Then don't post it a second time.
    const receivingItems = await base44.entities.ReceivingItem.filter({ po_id: po.id });
    const recordedLegs = await Promise.all(receivingItems.map(item => base44.entities.Transaction.filter({ receiving_item_id: item.id })));
    const expenseAlreadyRecorded = recordedLegs.some(list => list.length > 0);

    // 1. Create the Payable (represents Accounts Payable liability)
    await base44.entities.Payable.create({
      supplier_name: po.supplier_name,
      description: po.description,
      po_id: po.id,
      po_number: po.po_number,
      amount: po.amount,
      due_date: form.due_date,
      invoice_number: form.invoice_number,
      project_name: po.project_name,
      category: po.category,
      status: "unpaid",
    });

    // 1b. Create a Payment Request so it appears in Payment Approvals
    const poRef = po.po_number || po.id.slice(-6).toUpperCase();
    await base44.entities.PaymentRequest.create({
      request_number: `PR-PO-${poRef}`,
      payee: po.supplier_name,
      description: `[From PO: ${poRef}] ${po.description || ""}`.trim(),
      amount: po.amount,
      category: "supplier_invoice",
      payment_method: "bank_transfer",
      invoice_number: form.invoice_number || po.po_number || "",
      invoice_date: po.requested_date || today,
      due_date: form.due_date,
      requested_by: po.requested_by || "",
      supporting_docs: `PO: ${po.po_number || po.id}`,
      project_allocations: po.project_name ? [{ project_name: po.project_name, amount: po.amount }] : [],
      approval_status: "pending",
      approval_step: "submitted",
      approval_history: [{
        step: "submitted",
        action: "submitted",
        actor: "System (from PO)",
        notes: `Auto-created from Purchase Order ${poRef}`,
        timestamp: new Date().toISOString(),
      }],
    });

    // 2. Dr. Expense/Asset Account — only when the cost wasn't already recorded at receiving
    if (!expenseAlreadyRecorded) {
      await base44.entities.Transaction.create({
        description: `${isAsset ? "Asset Capitalization" : "Expense Recognition"} – ${po.supplier_name}${po.po_number ? ` (${po.po_number})` : ""}${po.description ? `: ${po.description}` : ""}`,
        amount: po.amount,
        type: "expense",
        category: txCategory,
        chart_of_account: debitAccount,
        project_code: po.project_code || "",
        date: today,
        status: "completed",
      });
    }

    // 3. Cr. Accounts Payable (record liability)
    await base44.entities.Transaction.create({
      description: `Accounts Payable – ${po.supplier_name}${po.po_number ? ` (${po.po_number})` : ""}`,
      amount: po.amount,
      type: "income",
      category: "other",
      chart_of_account: "Accounts Payable",
      project_name: po.project_name || "",
      date: today,
      status: "pending",
    });

    setSaving(false);
    onOpenChange(false);
    onSuccess?.();
  };

  if (!po) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convert to Payable</DialogTitle>
        </DialogHeader>

        <div className="space-y-1 bg-muted/40 rounded-lg px-4 py-3 text-sm">
          <p className="font-semibold text-foreground">{po.supplier_name}</p>
          {po.po_number && <p className="text-muted-foreground">PO: {po.po_number}</p>}
          <p className="text-primary font-bold">₱{(po.amount || 0).toLocaleString()}</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Invoice Number</Label>
            <Input
              value={form.invoice_number}
              onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))}
              placeholder="e.g. INV-2026-0501"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Due Date</Label>
            <Input
              type="date"
              value={form.due_date}
              onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
            />
          </div>

          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground space-y-0.5">
            <p>Expense account (from PO): <strong className="text-foreground">{debitAccount}</strong></p>
            <p>Credit entry will be posted to: <strong className="text-foreground">Accounts Payable</strong></p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Creating..." : "Create Payable"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}