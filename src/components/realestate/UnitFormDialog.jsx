import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const defaults = {
  unit_number: "", building: "", floor: "", unit_type: "1br",
  status: "available_for_sale", area_sqm: "", selling_price: "",
  monthly_rent: "", description: "", amenities: "", parking_slots: 0, notes: "",
};

export default function UnitFormDialog({ open, onOpenChange, initialData, onSubmit }) {
  const [form, setForm] = useState(defaults);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initialData ? { ...defaults, ...initialData } : defaults);
  }, [initialData, open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSubmit({
      ...form,
      area_sqm: form.area_sqm ? Number(form.area_sqm) : undefined,
      selling_price: form.selling_price ? Number(form.selling_price) : undefined,
      monthly_rent: form.monthly_rent ? Number(form.monthly_rent) : undefined,
      parking_slots: Number(form.parking_slots) || 0,
    });
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Unit" : "Add Condo Unit"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Unit Number *</Label>
              <Input value={form.unit_number} onChange={e => set("unit_number", e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Building</Label>
              <Input value={form.building} onChange={e => set("building", e.target.value)} placeholder="e.g. Tower A" />
            </div>
            <div className="space-y-1">
              <Label>Floor</Label>
              <Input value={form.floor} onChange={e => set("floor", e.target.value)} placeholder="e.g. 12" />
            </div>
            <div className="space-y-1">
              <Label>Area (sqm)</Label>
              <Input type="number" value={form.area_sqm} onChange={e => set("area_sqm", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Unit Type *</Label>
              <Select value={form.unit_type} onValueChange={v => set("unit_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="studio">Studio</SelectItem>
                  <SelectItem value="1br">1 Bedroom</SelectItem>
                  <SelectItem value="2br">2 Bedrooms</SelectItem>
                  <SelectItem value="3br">3 Bedrooms</SelectItem>
                  <SelectItem value="penthouse">Penthouse</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status *</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available_for_sale">Available for Sale</SelectItem>
                  <SelectItem value="available_for_lease">Available for Lease</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="leased">Leased</SelectItem>
                  <SelectItem value="under_renovation">Under Renovation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Selling Price (₱)</Label>
              <Input type="number" value={form.selling_price} onChange={e => set("selling_price", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Monthly Rent (₱)</Label>
              <Input type="number" value={form.monthly_rent} onChange={e => set("monthly_rent", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Parking Slots</Label>
              <Input type="number" value={form.parking_slots} onChange={e => set("parking_slots", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Amenities</Label>
              <Input value={form.amenities} onChange={e => set("amenities", e.target.value)} placeholder="Pool, Gym, etc." />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => set("description", e.target.value)} rows={3} />
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Unit"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}