import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const EMPTY_ROW = () => ({
  payee: "",
  description: "",
  amount: "",
  category: "supplier_invoice",
  payment_method: "bank_transfer",
  due_date: "",
  invoice_number: "",
  requested_by: "",
  project_name: "",
});

const CATEGORIES = [
  { value: "supplier_invoice", label: "Supplier Invoice" },
  { value: "subcontractor", label: "Subcontractor" },
  { value: "labor", label: "Labor" },
  { value: "equipment", label: "Equipment" },
  { value: "expense_reimbursement", label: "Expense Reimbursement" },
  { value: "utilities", label: "Utilities" },
  { value: "other", label: "Other" },
];

const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "check", label: "Check" },
  { value: "cash", label: "Cash" },
  { value: "credit_card", label: "Credit Card" },
  { value: "other", label: "Other" },
];

export default function BulkPaymentRequestDialog({ open, onOpenChange, onSubmit }) {
  const [rows, setRows] = useState([EMPTY_ROW()]);
  const [saving, setSaving] = useState(false);

  const { data: payees = [] } = useQuery({
    queryKey: ["payees_list"],
    queryFn: () => base44.entities.Payee.list("name", 200),
    enabled: open,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects_list_bulk"],
    queryFn: () => base44.entities.Project.list("project_name", 200),
    enabled: open,
  });

  const updateRow = (index, field, value) => {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  const addRow = () => setRows(prev => [...prev, EMPTY_ROW()]);

  const removeRow = (index) => {
    if (rows.length === 1) return;
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const valid = rows.filter(r => r.payee.trim() && r.description.trim() && r.amount);
    if (!valid.length) return;
    setSaving(true);
    const payload = valid.map((r, idx) => ({
      payee: r.payee.trim(),
      description: r.description.trim(),
      amount: parseFloat(r.amount) || 0,
      category: r.category,
      payment_method: r.payment_method,
      due_date: r.due_date || undefined,
      invoice_number: r.invoice_number || undefined,
      requested_by: r.requested_by || undefined,
      project_allocations: r.project_name
        ? [{ project_name: r.project_name, amount: parseFloat(r.amount) || 0 }]
        : [],
      approval_status: "pending",
      approval_step: "submitted",
      request_number: `PR-BULK-${Date.now()}-${idx + 1}`,
    }));
    await onSubmit(payload);
    setRows([EMPTY_ROW()]);
    setSaving(false);
    onOpenChange(false);
  };

  const handleClose = () => {
    setRows([EMPTY_ROW()]);
    onOpenChange(false);
  };

  const validCount = rows.filter(r => r.payee.trim() && r.description.trim() && r.amount).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Bulk Create Payment Requests
          </DialogTitle>
          <p className="text-sm text-muted-foreground">Fill in each row to create multiple payment requests at once. Rows missing payee, description, or amount will be skipped.</p>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {rows.map((row, idx) => (
            <div key={idx} className="border border-border rounded-xl p-4 space-y-3 bg-card relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Request #{idx + 1}</span>
                {rows.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeRow(idx)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Payee */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Payee <span className="text-destructive">*</span></label>
                  {payees.length > 0 ? (
                    <Select value={row.payee} onValueChange={v => updateRow(idx, "payee", v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select payee..." /></SelectTrigger>
                      <SelectContent>
                        {payees.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                        <SelectItem value="__manual__">Enter manually...</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : null}
                  {(payees.length === 0 || row.payee === "__manual__") && (
                    <Input
                      className="h-8 text-sm"
                      placeholder="Payee name"
                      value={row.payee === "__manual__" ? "" : row.payee}
                      onChange={e => updateRow(idx, "payee", e.target.value)}
                    />
                  )}
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Description <span className="text-destructive">*</span></label>
                  <Input className="h-8 text-sm" placeholder="Reason for payment" value={row.description} onChange={e => updateRow(idx, "description", e.target.value)} />
                </div>

                {/* Amount */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Amount <span className="text-destructive">*</span></label>
                  <Input className="h-8 text-sm" type="number" placeholder="0.00" value={row.amount} onChange={e => updateRow(idx, "amount", e.target.value)} />
                </div>

                {/* Category */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Category</label>
                  <Select value={row.category} onValueChange={v => updateRow(idx, "category", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Method */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Payment Method</label>
                  <Select value={row.payment_method} onValueChange={v => updateRow(idx, "payment_method", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Project */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Project</label>
                  <Select value={row.project_name || "__none__"} onValueChange={v => updateRow(idx, "project_name", v === "__none__" ? "" : v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select project..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {projects.map(p => <SelectItem key={p.id} value={p.project_name}>{p.project_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Invoice Number */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Invoice #</label>
                  <Input className="h-8 text-sm" placeholder="Optional" value={row.invoice_number} onChange={e => updateRow(idx, "invoice_number", e.target.value)} />
                </div>

                {/* Due Date */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Due Date</label>
                  <Input className="h-8 text-sm" type="date" value={row.due_date} onChange={e => updateRow(idx, "due_date", e.target.value)} />
                </div>

                {/* Requested By */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Requested By</label>
                  <Input className="h-8 text-sm" placeholder="Optional" value={row.requested_by} onChange={e => updateRow(idx, "requested_by", e.target.value)} />
                </div>
              </div>
            </div>
          ))}

          <Button variant="outline" className="w-full gap-2" onClick={addRow}>
            <Plus className="w-4 h-4" /> Add Another Request
          </Button>
        </div>

        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || validCount === 0}>
            {saving ? "Creating..." : `Create ${validCount} Request${validCount !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}