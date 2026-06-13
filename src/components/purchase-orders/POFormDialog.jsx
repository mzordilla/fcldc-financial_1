import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import LineItemAdd from "./LineItemAdd";

const COA_CATEGORY_LABELS = {
  project_payment: "Project Payment", material_cost: "Material Cost", labor: "Labor",
  equipment: "Equipment", subcontractor: "Subcontractor", overhead: "Overhead",
  permits: "Permits", insurance: "Insurance", bank_reconciliation: "Bank Reconciliation",
  non_current_assets: "Non-Current Assets", current_assets: "Current Assets",
  current_liabilities: "Current Liabilities", non_current_liabilities: "Non-Current Liabilities",
  repair_and_maintenance: "Repair & Maintenance", fixtures: "Fixtures", other: "Other",
};

const defaultForm = {
  po_number: "",
  supplier_name: "",
  project_name: "",
  description: "",
  items: "",
  line_items: [],
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

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("project_name", 200),
  });

  const { data: chartOfAccounts = [] } = useQuery({
    queryKey: ["chartofaccounts"],
    queryFn: () => base44.entities.ChartOfAccount.list("account_code", 200),
    enabled: open,
  });

  const { data: historicalPOs = [] } = useQuery({
    queryKey: ["purchase_orders_for_autocomplete"],
    queryFn: () => base44.entities.PurchaseOrder.list("-requested_date", 500),
    enabled: open,
  });

  // Build deduplicated material suggestions from all historical line items
  // Keep the most recent entry per description (lowest index = most recent since sorted by -requested_date)
  const materialSuggestions = useMemo(() => {
    const seen = new Map();
    historicalPOs.forEach((po) => {
      (po.line_items || []).forEach((item) => {
        const key = (item.description || "").toLowerCase().trim();
        if (key && !seen.has(key)) {
          seen.set(key, { ...item, supplier_name: po.supplier_name });
        }
      });
    });
    return Array.from(seen.values()).sort((a, b) => (a.description || "").localeCompare(b.description || ""));
  }, [historicalPOs]);

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
    const amount = form.line_items?.length > 0 
      ? form.line_items.reduce((sum, item) => sum + (item.total || 0), 0)
      : parseFloat(form.amount) || 0;
    await onSubmit({ ...form, amount });
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
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
            <Select value={form.project_name} onValueChange={v => set("project_name", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a project..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.project_name}>{p.project_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Description <span className="text-destructive">*</span></Label>
            <Input required placeholder="What is being purchased?" value={form.description} onChange={e => set("description", e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Itemized Line Items</Label>
            {form.line_items && form.line_items.length > 0 && (
              <div className="border border-border rounded-lg overflow-hidden mb-2">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="px-2 py-1 text-left font-semibold">Description</th>
                      <th className="px-2 py-1 text-right font-semibold w-8">Qty</th>
                      <th className="px-2 py-1 text-left font-semibold w-16">UOM</th>
                      <th className="px-2 py-1 text-right font-semibold w-10">Cost/Item</th>
                      <th className="px-2 py-1 text-right font-semibold w-20">Total</th>
                      <th className="w-6"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.line_items.map((item, idx) => (
                      <tr key={idx} className="border-b border-border/50 last:border-0">
                        <td className="px-2 py-1">{item.description}</td>
                        <td className="px-2 py-1 text-right text-xs">{item.quantity}</td>
                        <td className="px-2 py-1 text-xs text-muted-foreground">{item.unit_of_measure || "pcs"}</td>
                        <td className="px-2 py-1 text-right text-xs">${(item.cost_per_item || 0).toLocaleString()}</td>
                        <td className="px-2 py-1 text-right text-xs font-semibold">${(item.total || 0).toLocaleString()}</td>
                        <td className="px-2 py-1">
                          <button type="button" onClick={() => setForm(prev => ({ ...prev, line_items: prev.line_items.filter((_, i) => i !== idx) }))} className="text-destructive hover:text-destructive/80">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <LineItemAdd
              onAdd={(item) => setForm(prev => ({ ...prev, line_items: [...(prev.line_items || []), item] }))}
              suggestions={materialSuggestions}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Additional Notes (optional)</Label>
            <Textarea rows={2} placeholder="e.g. Additional line items, specs..." value={form.items} onChange={e => set("items", e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Total Amount <span className="text-destructive">*</span></Label>
            {form.line_items?.length > 0 ? (
              <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm font-semibold text-foreground">
                ₱{form.line_items.reduce((sum, item) => sum + (item.total || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="ml-2 text-xs text-muted-foreground font-normal">(auto-calculated from line items)</span>
              </div>
            ) : (
              <Input required type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e => set("amount", e.target.value)} />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => set("category", v)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {(() => {
                    const activeAccounts = chartOfAccounts.filter(a => a.is_active !== false && a.category);
                    if (activeAccounts.length === 0) {
                      return Object.entries(COA_CATEGORY_LABELS).map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ));
                    }
                    // Deduplicate by category value — keep first occurrence per unique category
                    const seen = new Set();
                    return activeAccounts.filter(a => {
                      if (seen.has(a.category)) return false;
                      seen.add(a.category);
                      return true;
                    }).map(a => (
                      <SelectItem key={a.category} value={a.category}>
                        {COA_CATEGORY_LABELS[a.category] || a.category.replace(/_/g, " ")}
                      </SelectItem>
                    ));
                  })()}
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