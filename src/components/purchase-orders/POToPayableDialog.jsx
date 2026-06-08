import { useState, useEffect } from "react";
import { format, addDays } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    account_classification: "expense",
    chart_of_account: "General Expense",
  });
  const [saving, setSaving] = useState(false);

  const { data: chartOfAccounts = [] } = useQuery({
    queryKey: ["chartofaccounts"],
    queryFn: () => base44.entities.ChartOfAccount.list("account_code", 200),
  });

  // Filter accounts by selected classification type
  const filteredAccounts = chartOfAccounts.filter(a =>
    form.account_classification === "asset"
      ? a.account_type === "asset"
      : a.account_type === "expense"
  );

  // Reset form with CoA defaults whenever a new PO is loaded
  useEffect(() => {
    if (po) {
      const coa = CATEGORY_COA_MAP[po.category] || CATEGORY_COA_MAP.other;
      setForm({
        invoice_number: "",
        due_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
        account_classification: coa.type,
        chart_of_account: coa.account,
      });
    }
  }, [po?.id]);

  const handleSubmit = async () => {
    setSaving(true);
    const coaEntry = CATEGORY_COA_MAP[po.category] || CATEGORY_COA_MAP.other;
    const isAsset = form.account_classification === "asset";
    const txCategory = isAsset ? (po.category === "equipment" ? "equipment" : "material_cost") : coaEntry.txCategory;
    const today = format(new Date(), "yyyy-MM-dd");

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

    // 2. Dr. Expense/Asset Account (recognize cost upon delivery)
    await base44.entities.Transaction.create({
      description: `${isAsset ? "Asset Capitalization" : "Expense Recognition"} – ${po.supplier_name}${po.po_number ? ` (${po.po_number})` : ""}${po.description ? `: ${po.description}` : ""}`,
      amount: po.amount,
      type: "expense",
      category: txCategory,
      chart_of_account: form.chart_of_account,
      project_name: po.project_name || "",
      date: today,
      status: "completed",
    });

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

          <div className="space-y-1.5">
            <Label>Account Classification</Label>
            <Select
              value={form.account_classification}
              onValueChange={v => {
                const defaults = v === "asset"
                  ? (po?.category === "equipment" ? "Property, Plant & Equipment" : "Raw Materials Inventory")
                  : (CATEGORY_COA_MAP[po?.category] || CATEGORY_COA_MAP.other).account;
                setForm(f => ({ ...f, account_classification: v, chart_of_account: defaults }));
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense (Income Statement)</SelectItem>
                <SelectItem value="asset">Asset (Balance Sheet)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Debit Account (Chart of Accounts)</Label>
            <Select
              value={form.chart_of_account}
              onValueChange={v => setForm(f => ({ ...f, chart_of_account: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select debit account..." />
              </SelectTrigger>
              <SelectContent>
                {filteredAccounts.map(a => (
                  <SelectItem key={a.id} value={a.account_name}>
                    {a.account_code ? `${a.account_code} · ${a.account_name}` : a.account_name}
                  </SelectItem>
                ))}
                {filteredAccounts.length === 0 && (
                  <SelectItem value={form.chart_of_account} disabled>
                    No accounts found
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Credit entry will be posted to: <strong>Accounts Payable</strong></p>
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