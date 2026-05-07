import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const defaultForm = {
  po_number: "",
  supplier_name: "",
  project_name: "",
  description: "",
  items: "",
  amount: "",
  category: "",
  priority: "normal",
  requested_by: "",
  requested_date: "",
  required_date: "",
};

const OTHER_VALUE = "__other__";

export default function POFormDialog({ open, onOpenChange, title, initialData, onSubmit }) {
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [supplierMode, setSupplierMode] = useState("select"); // "select" | "manual"

  const { data: payees = [] } = useQuery({
    queryKey: ["payees"],
    queryFn: () => base44.entities.Payee.list("name", 200),
  });

  useEffect(() => {
    if (open) {
      const data = { ...defaultForm, ...initialData };
      setForm(data);
      // if editing and the supplier isn't in the list, start in manual mode
      if (initialData?.supplier_name) {
        const inList = payees.some(p => p.name === initialData.supplier_name);
        setSupplierMode(inList ? "select" : "manual");
      } else {
        setSupplierMode("select");
      }
    }
  }, [open, initialData]);

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSupplierSelect = (value) => {
    if (value === OTHER_VALUE) {
      setSupplierMode("manual");
      set("supplier_name", "");
    } else {
      set("supplier_name", value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSubmit({ ...form, amount: parseFloat(form.amount) || 0 });
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

          <div className="space-y-1.5">
            <Label>PO Number</Label>
            <Input placeholder="PO-2026-001" value={form.po_number} onChange={e => set("po_number", e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Supplier Name <span className="text-destructive">*</span></Label>
            {supplierMode === "select" ? (
              <Select value={form.supplier_name} onValueChange={handleSupplierSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select from payee masterlist..." />
                </SelectTrigger>
                <SelectContent>
                  {payees.map(p => (
                    <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                  ))}
                  <SelectItem value={OTHER_VALUE}>
                    <span className="text-muted-foreground italic">Not in list — enter manually</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex gap-2">
                <Input
                  required
                  placeholder="Enter supplier name"
                  value={form.supplier_name}
                  onChange={e => set("supplier_name", e.target.value)}
                />
                <Button type="button" variant="outline" className="shrink-0 text-xs px-3" onClick={() => { setSupplierMode("select"); set("supplier_name", ""); }}>
                  Use List
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Project Name</Label>
            <Input placeholder="e.g. Main Street Tower" value={form.project_name} onChange={e => set("project_name", e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Description <span className="text-destructive">*</span></Label>
            <Input required placeholder="What is being purchased?" value={form.description} onChange={e => set("description", e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Line Items</Label>
            <Textarea rows={2} placeholder="e.g. 500 steel rods, 20 bags cement..." value={form.items} onChange={e => set("items", e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Total Amount <span className="text-destructive">*</span></Label>
            <Input required type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e => set("amount", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => set("category", v)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="materials">Materials</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="subcontractor">Subcontractor</SelectItem>
                  <SelectItem value="services">Services</SelectItem>
                  <SelectItem value="utilities">Utilities</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => set("priority", v)}>
                <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Requested By</Label>
            <Input placeholder="Your name" value={form.requested_by} onChange={e => set("requested_by", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Request Date</Label>
              <Input type="date" value={form.requested_date} onChange={e => set("requested_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Required By Date</Label>
              <Input type="date" value={form.required_date} onChange={e => set("required_date", e.target.value)} />
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