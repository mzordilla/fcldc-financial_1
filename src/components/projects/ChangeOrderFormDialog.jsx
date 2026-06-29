import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const today = format(new Date(), "yyyy-MM-dd");

const defaultForm = {
  co_number: "",
  contract_id: "",
  co_type: "additive",
  amount: "",
  description: "",
  scope_change: "",
  quantity_adjustment: "",
  pricing_adjustment: "",
  date_issued: today,
  date_approved: "",
  timeline_impact_days: "",
  status: "pending",
  approved_by: "",
  notes: "",
};

// contracts prop: array of { id, contract_number, description } for the parent project
export default function ChangeOrderFormDialog({ open, onOpenChange, initialData, onSubmit, title = "New Change Order", contracts = [] }) {
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm({ ...defaultForm, ...(initialData || {}) });
  }, [open, initialData]);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSubmit({ ...form, amount: parseFloat(form.amount) || 0, timeline_impact_days: parseInt(form.timeline_impact_days) || 0 });
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">

          {contracts.length > 0 && (
            <div className="space-y-1.5">
              <Label>Linked Contract</Label>
              <Select value={form.contract_id || ""} onValueChange={v => set("contract_id", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select contract (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {contracts.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.contract_number || "Contract"}{c.description ? ` — ${c.description}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>CO Number</Label>
              <Input placeholder="CO-001" value={form.co_number} onChange={e => set("co_number", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Type <span className="text-destructive">*</span></Label>
              <Select value={form.co_type} onValueChange={v => set("co_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="additive">Additive (+)</SelectItem>
                  <SelectItem value="deductive">Deductive (−)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description / Reason <span className="text-destructive">*</span></Label>
            <Input required placeholder="Brief reason for change order" value={form.description} onChange={e => set("description", e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Amount (₱) <span className="text-destructive">*</span></Label>
            <Input required type="number" step="0.01" min="0" placeholder="0.00" value={form.amount} onChange={e => set("amount", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Date Issued</Label>
              <Input type="date" value={form.date_issued} onChange={e => set("date_issued", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea rows={2} placeholder="Additional remarks..." value={form.notes} onChange={e => set("notes", e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Change Order"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}