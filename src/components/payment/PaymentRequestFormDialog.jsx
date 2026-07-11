import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Printer } from "lucide-react";
import PayeeSelector from "./PayeeSelector";
import PaymentRequestPrintView from "./PaymentRequestPrintView";

const defaultForm = {
  request_number: "",
  payee: "",
  description: "",
  category: "",
  payment_method: "bank_transfer",
  invoice_number: "",
  invoice_date: "",
  due_date: "",
  requested_by: "",
  supporting_docs: "",
  base_amount: "",
  withholding_tax_percentage: 0,
  withholding_tax_amount: 0,
  vat_percentage: 0,
  vat_amount: 0,
};

export default function PaymentRequestFormDialog({ open, onOpenChange, onSubmit, initialData, title }) {
  const [form, setForm] = useState(defaultForm);
  const [allocations, setAllocations] = useState([{ project_name: "", project_code: "", amount: "", category: "" }]);
  const [saving, setSaving] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date", 200),
  });

  const { data: chartOfAccounts = [] } = useQuery({
    queryKey: ["chartofaccounts"],
    queryFn: () => base44.entities.ChartOfAccount.list("account_code", 200),
  });

  useEffect(() => {
    if (!open) return;
    if (initialData && Object.keys(initialData).length > 0) {
      const { project_allocations, amount, ...rest } = initialData;
      setForm({ ...defaultForm, ...rest, category: rest.category || "", base_amount: amount || "" });
      setAllocations(
        project_allocations && project_allocations.length > 0
          ? project_allocations.map(a => ({ project_name: a.project_name || "", project_code: a.project_code || "", amount: a.amount || "", category: a.category || "" }))
          : [{ project_name: "", project_code: "", amount: "", category: "" }]
      );
    } else {
      setForm(defaultForm);
      setAllocations([{ project_name: "", project_code: "", amount: "", category: "" }]);
    }
  }, [open]);

  const allocationsTotal = allocations.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
  // Use allocations total if any allocations have amounts, otherwise fall back to base_amount field
  const totalAmount = allocationsTotal > 0 ? allocationsTotal : (parseFloat(form.base_amount) || 0);
  const withholdingTaxAmount = (totalAmount * (parseFloat(form.withholding_tax_percentage) || 0)) / 100;
  const vatAmount = (totalAmount * (parseFloat(form.vat_percentage) || 0)) / 100;

  const updateAllocation = (index, field, value) => {
    setAllocations(prev => prev.map((a, i) => i === index ? { ...a, [field]: value } : a));
  };

  const addAllocation = () => setAllocations(prev => [...prev, { project_name: "", project_code: "", amount: "", category: "" }]);
  const removeAllocation = (index) => {
    if (allocations.length === 1) return;
    setAllocations(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const validAllocations = allocations.filter(a => a.project_name && a.amount && parseFloat(a.amount) > 0);
    const cleanedForm = {};
    Object.keys(form).forEach(key => {
      if (form[key] !== "" && form[key] !== null && form[key] !== undefined) {
        cleanedForm[key] = form[key];
      }
    });
    const { base_amount, ...formWithoutBase } = cleanedForm;
    await onSubmit({
      ...formWithoutBase,
      category: form.category || "",
      project_allocations: validAllocations.map(a => ({ project_name: a.project_name, project_code: a.project_code || "", amount: parseFloat(a.amount) || 0, category: a.category || "" })),
      amount: totalAmount,
      withholding_tax_percentage: parseFloat(form.withholding_tax_percentage) || 0,
      withholding_tax_amount: withholdingTaxAmount,
      vat_percentage: parseFloat(form.vat_percentage) || 0,
      vat_amount: vatAmount,
    });
    setSaving(false);
    onOpenChange(false);
  };

  const setField = (name, value) => setForm(prev => ({ ...prev, [name]: value }));

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title || "Payment Request"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Request #</Label>
              <Input placeholder="PR-2026-001" value={form.request_number} onChange={e => setField("request_number", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Payee *</Label>
              <PayeeSelector value={form.payee} onChange={(v) => setField("payee", v)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description / Reason *</Label>
            <Input required placeholder="What is this payment for?" value={form.description} onChange={e => setField("description", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Amount *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.base_amount}
                onChange={e => setField("base_amount", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Override if not using project allocations</p>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setField("category", v)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="supplier_invoice">Supplier Invoice</SelectItem>
                  <SelectItem value="material_cost">Material Cost</SelectItem>
                  <SelectItem value="subcontractor">Subcontractor</SelectItem>
                  <SelectItem value="labor">Labor</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="expense_reimbursement">Expense Reimbursement</SelectItem>
                  <SelectItem value="utilities">Utilities</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Project Allocations */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Project Allocations</Label>
              <Button type="button" variant="outline" size="sm" onClick={addAllocation}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Project
              </Button>
            </div>
            <div className="space-y-2">
               {allocations.map((alloc, i) => (
                 <div key={i} className="flex gap-2 items-center">
                   <Select
                     value={alloc.project_name}
                     onValueChange={v => {
                       const proj = projects.find(p => p.project_name === v);
                       setAllocations(prev => prev.map((a, idx) => idx === i
                         ? { ...a, project_name: v, project_code: proj?.project_code || "" }
                         : a
                       ));
                     }}
                   >
                     <SelectTrigger className="flex-1"><SelectValue placeholder="Select project" /></SelectTrigger>
                     <SelectContent>
                       {projects.map(p => (
                         <SelectItem key={p.id} value={p.project_name}>
                           {p.project_name}{p.project_code ? ` (${p.project_code})` : ""}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                   <Select value={alloc.category} onValueChange={v => updateAllocation(i, "category", v)}>
                     <SelectTrigger className="w-44"><SelectValue placeholder="Category" /></SelectTrigger>
                     <SelectContent>
                       {(() => {
                         const activeAccounts = chartOfAccounts.filter(a => a.is_active !== false);
                         const options = activeAccounts.length > 0 ? activeAccounts : [
                           { id: "si", account_name: "Supplier Invoice", account_code: "" },
                           { id: "sc", account_name: "Subcontractor", account_code: "" },
                           { id: "lb", account_name: "Labor", account_code: "" },
                           { id: "eq", account_name: "Equipment", account_code: "" },
                           { id: "er", account_name: "Expense Reimbursement", account_code: "" },
                           { id: "ut", account_name: "Utilities", account_code: "" },
                           { id: "ot", account_name: "Other", account_code: "" },
                         ];
                         const hasCurrentValue = alloc.category && options.some(o => o.account_name === alloc.category);
                         return <>
                           {!hasCurrentValue && alloc.category && (
                             <SelectItem key="__current__" value={alloc.category}>{alloc.category}</SelectItem>
                           )}
                           {options.map(a => (
                             <SelectItem key={a.id} value={a.account_name}>
                               {a.account_code ? `${a.account_code} — ` : ""}{a.account_name}
                             </SelectItem>
                           ))}
                         </>;
                       })()}
                     </SelectContent>
                   </Select>
                   <Input
                     type="number"
                     step="0.01"
                     placeholder="Amount"
                     value={alloc.amount}
                     onChange={e => updateAllocation(i, "amount", e.target.value)}
                     className="w-32"
                   />
                   <Button
                     type="button"
                     variant="ghost"
                     size="icon"
                     onClick={() => removeAllocation(i)}
                     disabled={allocations.length === 1}
                     className="text-muted-foreground hover:text-destructive flex-shrink-0"
                   >
                     <Trash2 className="w-4 h-4" />
                   </Button>
                 </div>
               ))}
             </div>
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span className="font-medium">₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              {withholdingTaxAmount > 0 && (
                <div className="flex justify-between text-sm text-destructive">
                  <span>Withholding Tax ({form.withholding_tax_percentage}%):</span>
                  <span className="font-medium">-₱{withholdingTaxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
              {vatAmount > 0 && (
                <div className="flex justify-between text-sm text-chart-2">
                  <span>VAT ({form.vat_percentage}%):</span>
                  <span className="font-medium">+₱{vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold border-t border-border pt-2">
                <span>Net Amount:</span>
                <span>₱{(totalAmount - withholdingTaxAmount + vatAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Tax & VAT */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Withholding Tax %</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={form.withholding_tax_percentage} onChange={e => setField("withholding_tax_percentage", e.target.value)} />
              <p className="text-xs text-muted-foreground">Amount: ₱{withholdingTaxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="space-y-1.5">
              <Label>VAT %</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={form.vat_percentage} onChange={e => setField("vat_percentage", e.target.value)} />
              <p className="text-xs text-muted-foreground">Amount: ₱{vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <Select value={form.payment_method} onValueChange={v => setField("payment_method", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="credit_card">Credit Card</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Invoice details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Invoice / Ref #</Label>
              <Input placeholder="INV-001" value={form.invoice_number} onChange={e => setField("invoice_number", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Invoice Date</Label>
              <Input type="date" value={form.invoice_date} onChange={e => setField("invoice_date", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Payment Due Date</Label>
              <Input type="date" value={form.due_date} onChange={e => setField("due_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Requested By</Label>
              <Input placeholder="Your name" value={form.requested_by} onChange={e => setField("requested_by", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Supporting Documents</Label>
            <Input placeholder="e.g. Invoice attached, PO-2026-010" value={form.supporting_docs} onChange={e => setField("supporting_docs", e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowPrint(true)}>
              <Printer className="w-4 h-4 mr-2" /> Print Preview
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <PaymentRequestPrintView
      open={showPrint}
      onOpenChange={setShowPrint}
      data={{
        ...form,
        allocations,
        totalAmount,
        withholdingTaxAmount,
        vatAmount,
      }}
    />
    </>
  );
}