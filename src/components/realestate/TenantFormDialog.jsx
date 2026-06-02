import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const defaults = {
  full_name: "", email: "", contact_number: "", unit_id: "", unit_number: "",
  building: "", area_sqm: "", lease_start: "", lease_end: "", monthly_rent: "",
  deposit_amount: "", association_dues_per_sqm: "", association_dues: "", status: "active", notes: "",
};

export default function TenantFormDialog({ open, onOpenChange, initialData, units = [], onSubmit }) {
  const [form, setForm] = useState(defaults);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initialData ? { ...defaults, ...initialData } : defaults);
  }, [initialData, open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleUnitSelect = (unitId) => {
    const unit = units.find(u => u.id === unitId);
    set("unit_id", unitId);
    if (unit) {
      set("unit_number", unit.unit_number || "");
      set("building", unit.building || "");
      set("area_sqm", unit.area_sqm || 0);
      // Auto-calculate association dues: area_sqm × association_dues_per_sqm
      const area = unit.area_sqm || 0;
      const ratePerSqm = unit.price_per_sqm_rent || 0;
      const dues = area * ratePerSqm;
      set("association_dues_per_sqm", ratePerSqm.toString());
      set("association_dues", dues.toString());
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSubmit({
      ...form,
      monthly_rent: form.monthly_rent ? Number(form.monthly_rent) : undefined,
      deposit_amount: form.deposit_amount ? Number(form.deposit_amount) : undefined,
      association_dues_per_sqm: form.association_dues_per_sqm ? Number(form.association_dues_per_sqm) : undefined,
      association_dues: form.association_dues ? Number(form.association_dues) : undefined,
    });
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Tenant" : "Add Tenant"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label>Full Name *</Label>
              <Input value={form.full_name} onChange={e => set("full_name", e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Contact Number</Label>
              <Input value={form.contact_number} onChange={e => set("contact_number", e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Unit *</Label>
              <Select value={form.unit_id} onValueChange={handleUnitSelect}>
                <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                <SelectContent>
                  {units.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      Unit {u.unit_number}{u.building ? ` — ${u.building}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Unit Area (sqm)</Label>
              <Input type="number" value={form.area_sqm} disabled placeholder="Auto-filled from unit" />
            </div>
            <div className="space-y-1">
              <Label>Lease Start *</Label>
              <Input type="date" value={form.lease_start} onChange={e => set("lease_start", e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Lease End</Label>
              <Input type="date" value={form.lease_end} onChange={e => set("lease_end", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Monthly Rent (₱) *</Label>
              <Input type="number" value={form.monthly_rent} onChange={e => set("monthly_rent", e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Security Deposit (₱)</Label>
              <Input type="number" value={form.deposit_amount} onChange={e => set("deposit_amount", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Association Dues per sqm (₱)</Label>
              <Input type="number" value={form.association_dues_per_sqm} onChange={e => set("association_dues_per_sqm", e.target.value)} placeholder="Auto-calculated from unit" />
            </div>
            <div className="space-y-1">
              <Label>Association Dues (₱/mo)</Label>
              <Input type="number" value={form.association_dues} onChange={e => set("association_dues", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Tenant"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}