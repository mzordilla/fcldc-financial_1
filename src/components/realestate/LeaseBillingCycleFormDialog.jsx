import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const emptyForm = { billing_number: "", tenant_id: "", period_month: format(new Date(), "yyyy-MM"), rent_amount: "", association_dues: "", other_charges: "", deductions: "", due_date: "", description: "", prepared_by: "" };
const amount = (value) => Number.parseFloat(value) || 0;

export default function LeaseBillingCycleFormDialog({ open, onOpenChange, initialData, onSubmit }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { data: tenants = [] } = useQuery({ queryKey: ["tenants"], queryFn: () => base44.entities.Tenant.list("full_name", 300), enabled: open });

  useEffect(() => {
    if (!open) return;
    setForm({ ...emptyForm, billing_number: `LBC-${format(new Date(), "yyyyMM")}-${Date.now().toString().slice(-4)}`, ...initialData });
    setError("");
  }, [open, initialData]);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const selectedTenant = tenants.find((tenant) => tenant.id === form.tenant_id);
  const total = amount(form.rent_amount) + amount(form.association_dues) + amount(form.other_charges) - amount(form.deductions);

  const selectTenant = (tenantId) => {
    const tenant = tenants.find((item) => item.id === tenantId);
    setForm((current) => ({ ...current, tenant_id: tenantId, rent_amount: tenant?.monthly_rent || 0, association_dues: tenant?.association_dues || 0 }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.tenant_id) {
      setError("Please select a tenant.");
      return;
    }
    setSaving(true);
    const [year, month] = form.period_month.split("-").map(Number);
    const payload = {
      ...form,
      tenant_name: selectedTenant?.full_name || initialData?.tenant_name || "",
      unit_number: selectedTenant?.unit_number || initialData?.unit_number || "",
      building: selectedTenant?.building || initialData?.building || "",
      period_start: format(new Date(year, month - 1, 1), "yyyy-MM-dd"),
      period_end: format(new Date(year, month, 0), "yyyy-MM-dd"),
      rent_amount: amount(form.rent_amount), association_dues: amount(form.association_dues),
      other_charges: amount(form.other_charges), deductions: amount(form.deductions), billing_amount: total,
    };
    try { await onSubmit(payload); onOpenChange(false); } catch (err) { setError(err?.message || "Unable to save this billing cycle."); } finally { setSaving(false); }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>{initialData ? "Edit Lease Billing" : "New Lease Billing Cycle"}</DialogTitle></DialogHeader>
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3"><div className="space-y-1.5"><Label>Billing #</Label><Input value={form.billing_number} onChange={(e) => set("billing_number", e.target.value)} /></div><div className="space-y-1.5"><Label>Billing Month</Label><Input required type="month" value={form.period_month} onChange={(e) => set("period_month", e.target.value)} /></div></div>
      <div className="space-y-1.5"><Label>Tenant / Unit</Label><Select required value={form.tenant_id} onValueChange={selectTenant}><SelectTrigger><SelectValue placeholder="Select active tenant" /></SelectTrigger><SelectContent>{tenants.filter((tenant) => tenant.status === "active").map((tenant) => <SelectItem key={tenant.id} value={tenant.id}>{tenant.full_name} — {tenant.unit_number}</SelectItem>)}</SelectContent></Select></div>
      <div className="grid grid-cols-2 gap-3"><div className="space-y-1.5"><Label>Monthly Rent</Label><Input type="number" min="0" step="0.01" value={form.rent_amount} onChange={(e) => set("rent_amount", e.target.value)} /></div><div className="space-y-1.5"><Label>Association Dues</Label><Input type="number" min="0" step="0.01" value={form.association_dues} onChange={(e) => set("association_dues", e.target.value)} /></div><div className="space-y-1.5"><Label>Other Charges</Label><Input type="number" min="0" step="0.01" value={form.other_charges} onChange={(e) => set("other_charges", e.target.value)} /></div><div className="space-y-1.5"><Label>Deductions</Label><Input type="number" min="0" step="0.01" value={form.deductions} onChange={(e) => set("deductions", e.target.value)} /></div></div>
      <div className="rounded-xl border border-border bg-muted/40 p-3 flex justify-between"><span className="font-medium">Total Lease Receivable</span><span className="font-bold text-primary">₱{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
      <div className="space-y-1.5"><Label>Due Date</Label><Input required type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} /></div>
      <div className="space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Rent, dues, utilities, or other billing details" /></div>
      <div className="space-y-1.5"><Label>Prepared By</Label><Input value={form.prepared_by} onChange={(e) => set("prepared_by", e.target.value)} /></div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={saving || total < 0}>{saving ? "Saving..." : "Save Billing"}</Button></DialogFooter>
    </form></DialogContent></Dialog>;
}