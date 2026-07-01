import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

const defaults = {
  units: [], listing_type: "for_sale",
  asking_price: "", status: "active", buyer_tenant_name: "",
  buyer_tenant_contact: "", date_listed: "", date_closed: "",
  final_price: "", agent: "", notes: "",
};

export default function ListingFormDialog({ open, onOpenChange, initialData, units = [], onSubmit }) {
  const [form, setForm] = useState(defaults);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initialData ? { ...defaults, ...initialData, units: initialData.units || [] } : defaults);
  }, [initialData, open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleUnit = (unit) => {
    setForm(f => {
      const exists = f.units.some(u => u.unit_id === unit.id);
      const nextUnits = exists
        ? f.units.filter(u => u.unit_id !== unit.id)
        : [...f.units, { unit_id: unit.id, unit_number: unit.unit_number || "", building: unit.building || "" }];
      return { ...f, units: nextUnits };
    });
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
              <Label>Units * (select one or more)</Label>
              <div className="border border-input rounded-md max-h-40 overflow-y-auto p-2 space-y-1">
                {units.map(u => {
                  const checked = form.units.some(x => x.unit_id === u.id);
                  return (
                    <label key={u.id} className="flex items-center gap-2 text-sm py-1 px-1 rounded hover:bg-muted/40 cursor-pointer">
                      <Checkbox checked={checked} onCheckedChange={() => toggleUnit(u)} />
                      Unit {u.unit_number}{u.building ? ` — ${u.building}` : ""}
                    </label>
                  );
                })}
              </div>
              {form.units.length === 0 && (
                <p className="text-xs text-destructive">Select at least one unit</p>
              )}
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
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="inquiry">Inquiry</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                  <SelectItem value="impasse">Impasse</SelectItem>
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
            <Button type="submit" disabled={saving || form.units.length === 0}>{saving ? "Saving..." : "Save Listing"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}