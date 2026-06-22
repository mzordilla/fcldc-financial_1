import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

const defaultForm = {
  billing_number: "",
  project_name: "",
  client_name: "",
  period_label: "",
  period_start: "",
  period_end: "",
  accomplishment_percentage: "",
  cumulative_percentage: "",
  contract_amount: "",
  change_orders: [],
  additive_rows: [],
  deductive_rows: [],
  retention_rate: "",
  down_payment: "",
  recoupment: "",
  due_date: "",
  description: "",
  prepared_by: "",
};

const fmt = (val) => parseFloat(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });

function RowTable({ label, rows, onChange, type }) {
  const addRow = () => onChange([...rows, { description: "", amount: "" }]);
  const removeRow = (i) => onChange(rows.filter((_, idx) => idx !== i));
  const updateRow = (i, key, val) => {
    const updated = rows.map((r, idx) => idx === i ? { ...r, [key]: val } : r);
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className={type === "deductive" ? "text-destructive" : "text-primary"}>{label}</Label>
        <Button type="button" size="sm" variant="outline" onClick={addRow} className="h-7 text-xs gap-1">
          <Plus className="w-3 h-3" /> Add Row
        </Button>
      </div>
      {rows.length === 0 && (
        <p className="text-xs text-muted-foreground italic">No rows yet. Click "Add Row" to begin.</p>
      )}
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2 items-center">
          <Input
            className="flex-1 h-8 text-sm"
            placeholder="Description"
            value={row.description}
            onChange={e => updateRow(i, "description", e.target.value)}
          />
          <Input
            className="w-36 h-8 text-sm"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={row.amount}
            onChange={e => updateRow(i, "amount", e.target.value)}
          />
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeRow(i)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}

function ChangeOrderTable({ rows, onChange }) {
  const addRow = () => onChange([...rows, { co_number: "", description: "", type: "additive", amount: "" }]);
  const removeRow = (i) => onChange(rows.filter((_, idx) => idx !== i));
  const updateRow = (i, key, val) => {
    const updated = rows.map((r, idx) => idx === i ? { ...r, [key]: val } : r);
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Change Orders</Label>
        <Button type="button" size="sm" variant="outline" onClick={addRow} className="h-7 text-xs gap-1">
          <Plus className="w-3 h-3" /> Add CO
        </Button>
      </div>
      {rows.length === 0 && (
        <p className="text-xs text-muted-foreground italic">No change orders yet.</p>
      )}
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2 items-center flex-wrap">
          <Input
            className="w-24 h-8 text-sm"
            placeholder="CO #"
            value={row.co_number}
            onChange={e => updateRow(i, "co_number", e.target.value)}
          />
          <Input
            className="flex-1 h-8 text-sm min-w-[120px]"
            placeholder="Description"
            value={row.description}
            onChange={e => updateRow(i, "description", e.target.value)}
          />
          <Select value={row.type} onValueChange={v => updateRow(i, "type", v)}>
            <SelectTrigger className="w-32 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="additive">Additive</SelectItem>
              <SelectItem value="deductive">Deductive</SelectItem>
            </SelectContent>
          </Select>
          <Input
            className="w-36 h-8 text-sm"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={row.amount}
            onChange={e => updateRow(i, "amount", e.target.value)}
          />
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeRow(i)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}

function calcTotals(form) {
  const contract = parseFloat(form.contract_amount) || 0;
  const accomplishPct = parseFloat(form.accomplishment_percentage) || 0;
  const retentionRate = parseFloat(form.retention_rate) || 0;
  const downPayment = parseFloat(form.down_payment) || 0;
  const recoupment = parseFloat(form.recoupment) || 0;

  // Change orders adjust contract amount
  const coNet = (form.change_orders || []).reduce((s, co) => {
    const amt = parseFloat(co.amount) || 0;
    return co.type === "deductive" ? s - amt : s + amt;
  }, 0);
  const adjustedContract = contract + coNet;

  const grossBilling = adjustedContract * (accomplishPct / 100);
  const retentionAmt = grossBilling * (retentionRate / 100);
  const dpDeduction = downPayment * (accomplishPct / 100);

  const totalAdditives = (form.additive_rows || []).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const totalDeductives = (form.deductive_rows || []).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

  const net = grossBilling - retentionAmt - dpDeduction + totalAdditives - totalDeductives - recoupment;

  return {
    adjustedContract,
    coNet,
    grossBilling,
    retentionAmt,
    dpDeduction,
    totalAdditives,
    totalDeductives,
    recoupment,
    net,
  };
}

export default function BillingCycleFormDialog({ open, onOpenChange, title, initialData, onSubmit }) {
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("project_name", 200),
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setForm({
        ...defaultForm,
        ...initialData,
        change_orders: initialData?.change_orders || [],
        additive_rows: initialData?.additive_rows || [],
        deductive_rows: initialData?.deductive_rows || [],
        recoupment: initialData?.recoupment?.toString() || "",
      });
    }
  }, [open, initialData]);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleProjectSelect = (projectName) => {
    const proj = projects.find(p => p.project_name === projectName);
    setForm(prev => ({
      ...prev,
      project_name: projectName,
      client_name: proj?.client_name || prev.client_name,
      contract_amount: proj?.contract_amount?.toString() || prev.contract_amount,
      retention_rate: proj?.retention_rate?.toString() || prev.retention_rate,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const calc = calcTotals(form);
    const payload = {
      ...form,
      accomplishment_percentage: parseFloat(form.accomplishment_percentage) || 0,
      cumulative_percentage: parseFloat(form.cumulative_percentage) || 0,
      contract_amount: parseFloat(form.contract_amount) || 0,
      adjusted_contract_amount: calc.adjustedContract,
      billing_amount: calc.grossBilling,
      retention_rate: parseFloat(form.retention_rate) || 0,
      retention_amount: calc.retentionAmt,
      down_payment: parseFloat(form.down_payment) || 0,
      down_payment_deduction: calc.dpDeduction,
      recoupment: calc.recoupment,
      total_additives: calc.totalAdditives,
      total_deductives: calc.totalDeductives,
      net_billing_amount: calc.net,
      change_orders: form.change_orders.map(co => ({ ...co, amount: parseFloat(co.amount) || 0 })),
      additive_rows: form.additive_rows.map(r => ({ ...r, amount: parseFloat(r.amount) || 0 })),
      deductive_rows: form.deductive_rows.map(r => ({ ...r, amount: parseFloat(r.amount) || 0 })),
    };
    await onSubmit(payload);
    setSaving(false);
    onOpenChange(false);
  };

  const calc = calcTotals(form);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Billing #</Label>
              <Input placeholder="BC-2026-001" value={form.billing_number} onChange={e => set("billing_number", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Period Label</Label>
              <Input placeholder="e.g. May 2026" value={form.period_label} onChange={e => set("period_label", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Project <span className="text-destructive">*</span></Label>
            <Select value={form.project_name} onValueChange={handleProjectSelect}>
              <SelectTrigger><SelectValue placeholder="Select a project..." /></SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.project_name}>{p.project_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Client Name <span className="text-destructive">*</span></Label>
            <Input required placeholder="Client name" value={form.client_name} onChange={e => set("client_name", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Period Start</Label>
              <Input type="date" value={form.period_start} onChange={e => set("period_start", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Period End</Label>
              <Input type="date" value={form.period_end} onChange={e => set("period_end", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Accomplishment % <span className="text-destructive">*</span></Label>
              <Input required type="number" step="0.000001" min="0" max="100" placeholder="e.g. 25" value={form.accomplishment_percentage} onChange={e => set("accomplishment_percentage", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Cumulative %</Label>
              <Input type="number" step="0.01" min="0" max="100" placeholder="e.g. 75" value={form.cumulative_percentage} onChange={e => set("cumulative_percentage", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Original Contract Amount (₱)</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={form.contract_amount} onChange={e => set("contract_amount", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Retention Rate (%)</Label>
              <Input type="number" step="0.01" min="0" max="100" placeholder="e.g. 5" value={form.retention_rate} onChange={e => set("retention_rate", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Down Payment Received (₱)</Label>
            <Input type="number" step="0.01" min="0" placeholder="0.00 — leave blank if none" value={form.down_payment} onChange={e => set("down_payment", e.target.value)} />
            <p className="text-xs text-muted-foreground">A proportional deduction is applied each billing cycle based on accomplishment %.</p>
          </div>

          <div className="space-y-1.5">
            <Label>Recoupment (₱)</Label>
            <Input type="number" step="0.01" min="0" placeholder="0.00 — leave blank if none" value={form.recoupment} onChange={e => set("recoupment", e.target.value)} />
            <p className="text-xs text-muted-foreground">Direct deduction this cycle for advance recovery or other recoupments.</p>
          </div>

          {/* Divider */}
          <hr className="border-border" />

          {/* Change Orders */}
          <div className="space-y-3 bg-muted/30 rounded-xl p-4 border border-border">
            <ChangeOrderTable
              rows={form.change_orders}
              onChange={rows => set("change_orders", rows)}
            />
            {form.change_orders.length > 0 && (
              <div className="text-sm flex justify-between pt-1 border-t border-border">
                <span className="text-muted-foreground">Net CO Adjustment</span>
                <span className={calc.coNet >= 0 ? "text-primary font-semibold" : "text-destructive font-semibold"}>
                  {calc.coNet >= 0 ? "+" : ""}₱{fmt(calc.coNet)}
                </span>
              </div>
            )}
            {form.change_orders.length > 0 && (
              <div className="text-sm flex justify-between">
                <span className="text-muted-foreground">Adjusted Contract Amount</span>
                <span className="font-semibold">₱{fmt(calc.adjustedContract)}</span>
              </div>
            )}
          </div>

          {/* Additive Rows */}
          <div className="space-y-3 bg-primary/5 rounded-xl p-4 border border-primary/20">
            <RowTable
              label="Additive Items (add to billing)"
              rows={form.additive_rows}
              onChange={rows => set("additive_rows", rows)}
              type="additive"
            />
            {form.additive_rows.length > 0 && (
              <div className="text-sm flex justify-between pt-1 border-t border-primary/20">
                <span className="text-muted-foreground">Total Additives</span>
                <span className="text-primary font-semibold">+₱{fmt(calc.totalAdditives)}</span>
              </div>
            )}
          </div>

          {/* Deductive Rows */}
          <div className="space-y-3 bg-destructive/5 rounded-xl p-4 border border-destructive/20">
            <RowTable
              label="Deductive Items (deducted from billing)"
              rows={form.deductive_rows}
              onChange={rows => set("deductive_rows", rows)}
              type="deductive"
            />
            {form.deductive_rows.length > 0 && (
              <div className="text-sm flex justify-between pt-1 border-t border-destructive/20">
                <span className="text-muted-foreground">Total Deductives</span>
                <span className="text-destructive font-semibold">-₱{fmt(calc.totalDeductives)}</span>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="bg-muted/40 rounded-xl p-4 space-y-2 border border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Billing Summary</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gross Billing ({form.accomplishment_percentage || 0}% × ₱{fmt(calc.adjustedContract)})</span>
                <span className="font-medium">₱{fmt(calc.grossBilling)}</span>
              </div>
              {calc.totalAdditives > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">+ Additives</span>
                  <span className="text-primary font-medium">+₱{fmt(calc.totalAdditives)}</span>
                </div>
              )}
              {calc.totalDeductives > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">- Deductives</span>
                  <span className="text-destructive font-medium">-₱{fmt(calc.totalDeductives)}</span>
                </div>
              )}
              {calc.retentionAmt > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">- Retention ({form.retention_rate || 0}%)</span>
                  <span className="text-destructive font-medium">-₱{fmt(calc.retentionAmt)}</span>
                </div>
              )}
              {calc.dpDeduction > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">- Down Payment Deduction</span>
                  <span className="text-destructive font-medium">-₱{fmt(calc.dpDeduction)}</span>
                </div>
              )}
              {calc.recoupment > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">- Recoupment</span>
                  <span className="text-destructive font-medium">-₱{fmt(calc.recoupment)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 mt-1">
                <span className="font-semibold">Net Billing Amount</span>
                <span className="font-bold text-primary text-base">₱{fmt(calc.net)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Due Date</Label>
            <Input type="date" value={form.due_date} onChange={e => set("due_date", e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Description / Scope Accomplished</Label>
            <Textarea rows={3} placeholder="Describe the work accomplished this billing period..." value={form.description} onChange={e => set("description", e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Prepared By</Label>
            <Input placeholder="Your name" value={form.prepared_by} onChange={e => set("prepared_by", e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}