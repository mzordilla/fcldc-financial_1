import { useEffect, useMemo, useState } from "react";
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
  const tenantGroups = useMemo(() => {
    const groups = new Map();
    tenants.filter((tenant) => tenant.status === "active").forEach((tenant) => {
      const key = tenant.full_name?.trim().toLowerCase();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(tenant);
    });
    return [...groups.values()];
  }, [tenants]);
  const selectedTenants = tenantGroups.find((group) => group.some((tenant) => tenant.id === form.tenant_id)) || [];
  const selectedTenant = selectedTenants[0];
  const total = amount(form.rent_amount) + amount(form.association_dues) + amount(form.other_charges) - amount(form.deductions);

  const selectTenant = (tenantId) => {
    const group = tenantGroups.find((items) => items.some((item) => item.id === tenantId)) || [];
    setForm((current) => ({ ...current, tenant_id: tenantId, rent_amount: group.reduce((sum, tenant) => sum + amount(tenant.monthly_rent), 0), association_dues: group.reduce((sum, tenant) => sum + amount(tenant.association_dues), 0) }));
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
      unit_number: selectedTenants.map((tenant) => tenant.unit_number).filter(Boolean).join(", ") || initialData?.unit_number || "",
      building: [...new Set(selectedTenants.map((tenant) => tenant.building).filter(Boolean))].join(", ") || initialData?.building || "",
      tenant_contracts: selectedTenants.length ? selectedTenants.map((tenant) => ({ tenant_id: tenant.id, unit_number: tenant.unit_number || "", building: tenant.building || "", rent_amount: amount(tenant.monthly_rent), association_dues: amount(tenant.association_dues), contract_url: tenant.contract_attachment_url || "" })) : (initialData?.tenant_contracts || []),
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
      <div className="space-y-1.5"><Label>Tenant Name — Select All Contracts</Label><Select required value={form.tenant_id} onValueChange={selectTenant}><SelectTrigger><SelectValue placeholder="Select tenant and all contracts" /></SelectTrigger><SelectContent>{tenantGroups.map((group) => <SelectItem key={group[0].id} value={group[0].id}>{group[0].full_name} — All {group.length} contract{group.length === 1 ? "" : "s"}</SelectItem>)}</SelectContent></Select></div>
      {selectedTenants.length > 0 && <div className="rounded-lg border border-primary/20 bg-primary/5 p-3"><p className="mb-2 text-xs font-medium text-primary">All {selectedTenants.length} contract{selectedTenants.length === 1 ? "" : "s"} selected</p>{selectedTenants.map((tenant) => <div key={tenant.id} className="flex items-center justify-between py-1 text-sm"><span>{tenant.unit_number}{tenant.building ? ` · ${tenant.building}` : ""}</span>{tenant.contract_attachment_url ? <a className="text-primary hover:underline" href={tenant.contract_attachment_url} target="_blank" rel="noreferrer">View contract</a> : <span className="text-xs text-muted-foreground">No contract</span>}</div>)}</div>}
      <div className="grid grid-cols-2 gap-3"><div className="space-y-1.5"><Label>Monthly Rent</Label><Input type="number" min="0" step="0.01" value={form.rent_amount} onChange={(e) => set("rent_amount", e.target.value)} /></div><div className="space-y-1.5"><Label>Association Dues</Label><Input type="number" min="0" step="0.01" value={form.association_dues} onChange={(e) => set("association_dues", e.target.value)} /></div><div className="space-y-1.5"><Label>Other Charges</Label><Input type="number" min="0" step="0.01" value={form.other_charges} onChange={(e) => set("other_charges", e.target.value)} /></div><div className="space-y-1.5"><Label>Deductions</Label><Input type="number" min="0" step="0.01" value={form.deductions} onChange={(e) => set("deductions", e.target.value)} /></div></div>
      <div className="rounded-xl border border-border bg-muted/40 p-3 flex justify-between"><span className="font-medium">Total Lease Receivable</span><span className="font-bold text-primary">₱{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
      <div className="space-y-1.5"><Label>Due Date</Label><Input required type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} /></div>
      <div className="space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Rent, dues, utilities, or other billing details" /></div>
      <div className="space-y-1.5"><Label>Prepared By</Label><Input value={form.prepared_by} onChange={(e) => set("prepared_by", e.target.value)} /></div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={saving || total < 0}>{saving ? "Saving..." : "Save Billing"}</Button></DialogFooter>
    </form></DialogContent></Dialog>;
}