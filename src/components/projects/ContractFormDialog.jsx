import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const emptyForm = {
  contract_number: "",
  description: "",
  original_contract_amount: "",
  retention_rate: "",
  completed_percentage: "",
  contract_status: "pending",
  contract_date: "",
  start_date: "",
  end_date: "",
  approved_by: "",
  notes: "",
};

export default function ContractFormDialog({ open, onOpenChange, title = "New Contract", initialData = {}, onSubmit }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ ...emptyForm, ...initialData });
    }
  }, [open, initialData]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setSaving(true);
    const data = {
      ...form,
      original_contract_amount: parseFloat(form.original_contract_amount) || 0,
      retention_rate: parseFloat(form.retention_rate) || 0,
      completed_percentage: parseFloat(form.completed_percentage) || 0,
    };
    await onSubmit(data);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Contract Number</label>
              <Input value={form.contract_number} onChange={e => set("contract_number", e.target.value)} placeholder="CTR-2026-001" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Status</label>
              <Select value={form.contract_status} onValueChange={v => set("contract_status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["pending","approved","active","completed","on_hold","cancelled"].map(s => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g," ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Description / Scope</label>
              <Input value={form.description} onChange={e => set("description", e.target.value)} placeholder="Scope of this contract" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Original Contract Amount (₱) *</label>
              <Input type="number" value={form.original_contract_amount} onChange={e => set("original_contract_amount", e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Retention Rate (%)</label>
              <Input type="number" value={form.retention_rate} onChange={e => set("retention_rate", e.target.value)} placeholder="e.g. 5" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Completed (%)</label>
              <Input type="number" value={form.completed_percentage} onChange={e => set("completed_percentage", e.target.value)} placeholder="e.g. 45" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Contract Date</label>
              <Input type="date" value={form.contract_date} onChange={e => set("contract_date", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Start Date</label>
              <Input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">End Date</label>
              <Input type="date" value={form.end_date} onChange={e => set("end_date", e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Approved By</label>
              <Input value={form.approved_by} onChange={e => set("approved_by", e.target.value)} placeholder="Approver name" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
              <Input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Optional notes" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.original_contract_amount || saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}