import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  billing_amount: "",
  retention_rate: "",
  retention_amount: "",
  down_payment: "",
  down_payment_deduction: "",
  net_billing_amount: "",
  due_date: "",
  description: "",
  prepared_by: "",
};

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
      setForm({ ...defaultForm, ...initialData });
    }
  }, [open, initialData]);

  const set = (key, val) => {
    setForm(prev => {
      const next = { ...prev, [key]: val };
      // Auto-calculate amounts
      const contractAmt = parseFloat(next.contract_amount) || 0;
      const accomplishPct = parseFloat(next.accomplishment_percentage) || 0;
      const retentionRate = parseFloat(next.retention_rate) || 0;

      if (["contract_amount", "accomplishment_percentage", "retention_rate", "down_payment"].includes(key)) {
        const downPayment = parseFloat(next.down_payment) || 0;
        const billing = contractAmt * (accomplishPct / 100);
        const retention = billing * (retentionRate / 100);
        const downPaymentDeduction = downPayment * (accomplishPct / 100);
        next.billing_amount = billing.toFixed(2);
        next.retention_amount = retention.toFixed(2);
        next.down_payment_deduction = downPaymentDeduction.toFixed(2);
        next.net_billing_amount = (billing - retention - downPaymentDeduction).toFixed(2);
      }
      return next;
    });
  };

  // When project is selected, auto-fill client_name and contract_amount
  const handleProjectSelect = (projectName) => {
    set("project_name", projectName);
    const proj = projects.find(p => p.project_name === projectName);
    if (proj) {
      setForm(prev => ({
        ...prev,
        project_name: projectName,
        client_name: proj.client_name || prev.client_name,
        contract_amount: proj.contract_amount?.toString() || prev.contract_amount,
        retention_rate: proj.retention_rate?.toString() || prev.retention_rate,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      accomplishment_percentage: parseFloat(form.accomplishment_percentage) || 0,
      cumulative_percentage: parseFloat(form.cumulative_percentage) || 0,
      contract_amount: parseFloat(form.contract_amount) || 0,
      billing_amount: parseFloat(form.billing_amount) || 0,
      retention_rate: parseFloat(form.retention_rate) || 0,
      retention_amount: parseFloat(form.retention_amount) || 0,
      down_payment: parseFloat(form.down_payment) || 0,
      down_payment_deduction: parseFloat(form.down_payment_deduction) || 0,
      net_billing_amount: parseFloat(form.net_billing_amount) || 0,
    };
    await onSubmit(payload);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">

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
              <Input required type="number" step="0.01" min="0" max="100" placeholder="e.g. 25" value={form.accomplishment_percentage} onChange={e => set("accomplishment_percentage", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Cumulative %</Label>
              <Input type="number" step="0.01" min="0" max="100" placeholder="e.g. 75" value={form.cumulative_percentage} onChange={e => set("cumulative_percentage", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Contract Amount (₱)</Label>
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
            <p className="text-xs text-muted-foreground">Total down payment received from client. A proportional deduction will be applied each billing cycle based on accomplishment %.</p>
          </div>

          {/* Auto-calculated amounts */}
          <div className="bg-muted/40 rounded-xl p-4 space-y-2 border border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Calculated Amounts</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Gross Billing</p>
                <p className="font-semibold">₱{parseFloat(form.billing_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Retention</p>
                <p className="font-semibold text-chart-3">-₱{parseFloat(form.retention_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Down Pmt Deduction</p>
                <p className="font-semibold text-chart-3">-₱{parseFloat(form.down_payment_deduction || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Net Billing</p>
                <p className="font-bold text-primary">₱{parseFloat(form.net_billing_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
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