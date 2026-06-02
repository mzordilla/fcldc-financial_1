import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const defaults = {
  unit_id: "", unit_number: "", building: "", listing_type: "for_sale",
  asking_price: "", status: "active", buyer_tenant_name: "",
  buyer_tenant_contact: "", date_listed: "", date_closed: "",
  final_price: "", agent: "", notes: "",
};

export default function ListingFormDialog({ open, onOpenChange, initialData, units = [], onSubmit }) {
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
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSubmit({
      ...form,
      asking_price: form.asking_price ? Number(form.asking_price) : undefined,
      final_price: form.final_price ? Number(form.final_price) : undefined,
    });
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Listing" : "New Listing"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-1">
              <Label>Listing Type *</Label>
              <Select value={form.listing_type} onValueChange={v => set("listing_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="for_sale">For Sale</SelectItem>
                  <SelectItem value="for_lease">For Lease</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="under_negotiation">Under Negotiation</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="leased">Leased</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Asking Price (₱) *</Label>
              <Input type="number" value={form.asking_price} onChange={e => set("asking_price", e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Final Price (₱)</Label>
              <Input type="number" value={form.final_price} onChange={e => set("final_price", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Buyer / Tenant Name</Label>
              <Input value={form.buyer_tenant_name} onChange={e => set("buyer_tenant_name", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Buyer / Tenant Contact</Label>
              <Input value={form.buyer_tenant_contact} onChange={e => set("buyer_tenant_contact", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Agent / Broker</Label>
              <Input value={form.agent} onChange={e => set("agent", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Date Listed</Label>
              <Input type="date" value={form.date_listed} onChange={e => set("date_listed", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Date Closed</Label>
              <Input type="date" value={form.date_closed} onChange={e => set("date_closed", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Listing"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}