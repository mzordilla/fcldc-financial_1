import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TransactionFormDialog({ open, onOpenChange, title, bankAccounts = [], categories = [], onSubmit, initialData }) {
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setFormData(initialData || {});
  }, [open]);

  const set = (key, val) => setFormData(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSubmit(formData);
    setSaving(false);
    setFormData({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Description */}
          <div className="space-y-1.5">
            <Label>Description *</Label>
            <Input
              required
              placeholder="e.g. Payment for Oak Street project"
              value={formData.description || ""}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          {/* Amount & Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount (₱) *</Label>
              <Input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={formData.amount ?? ""}
                onChange={(e) => set("amount", parseFloat(e.target.value) || "")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={formData.type || ""} onValueChange={(v) => set("type", v)}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={formData.category || ""} onValueChange={(v) => set("category", v)}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Bank Account */}
          <div className="space-y-1.5">
            <Label>Bank Account</Label>
            <Select
              value={formData.bank_account_id || "none"}
              onValueChange={(v) => set("bank_account_id", v === "none" ? "" : v)}
            >
              <SelectTrigger><SelectValue placeholder="Select bank account" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {bankAccounts.filter(a => a.status !== "closed").map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.account_name} ({a.bank_name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Project & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Project Name</Label>
              <Input
                placeholder="e.g. Oak Street Renovation"
                value={formData.project_name || ""}
                onChange={(e) => set("project_name", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input
                type="date"
                required
                value={formData.date || ""}
                onChange={(e) => set("date", e.target.value)}
              />
            </div>
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