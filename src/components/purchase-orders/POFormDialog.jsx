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
import POBudgetWarning from "@/components/purchase-orders/POBudgetWarning";

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
  project_code: "",
  description: "",
  items: "",
  line_items: [],
  amount: "",
  category: "",
  chart_of_account: "",
  priority: "normal",
  requested_by: "",
  requested_date: "",
  required_date: "",
};

const OTHER_VALUE = "__other__";

export default function POFormDialog({ open, onOpenChange, title, initialData, onSubmit }) {
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
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
    queryFn: () => base44.entities.PurchaseOrder.list("-requested_date", 10000),
    enabled: open,
  });

  // Build suggestions from current line items and legacy PO descriptions/items.
  const materialSuggestions = useMemo(() => {
    const seen = new Map();
    const addSuggestion = (description, details, po) => {
      const cleanDescription = String(description || "").trim();
      const key = cleanDescription.toLowerCase();
      if (!key || seen.has(key)) return;
      seen.set(key, {
        description: cleanDescription,
        quantity: details?.quantity,
        unit_of_measure: details?.unit_of_measure || "pcs",
        cost_per_item: details?.cost_per_item || 0,
        supplier_name: po.supplier_name || "Previous supplier",
      });
    };

    historicalPOs.forEach((po) => {
      const lineItems = po.line_items || [];
      lineItems.forEach((item) => addSuggestion(item.description, item, po));

      String(po.items || "")
        .split(/\r?\n|,/)
        .forEach((description) => addSuggestion(description, null, po));

      if (lineItems.length === 0 && !po.items) {
        addSuggestion(po.description, null, po);
      }
    });

    return Array.from(seen.values()).sort((a, b) => a.description.localeCompare(b.description));
  }, [historicalPOs]);

  useEffect(() => {
    if (open) {
      const data = { ...defaultForm, ...initialData };
      setForm(data);
      setFormError("");
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
  const currentAmount = form.line_items?.length > 0 ? form.line_items.reduce((sum, item) => sum + (item.total || 0), 0) : parseFloat(form.amount) || 0;
  const selectedProject = projects.find((project) => project.project_name === form.project_name);

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
    if (!form.category || !form.chart_of_account) {
      setFormError("Category and Chart of Account are required before saving.");
      return;
    }
    setFormError("");
    setSaving(true);
    const amount = form.line_items?.length > 0 
      ? form.line_items.reduce((sum, item) => sum + (item.total || 0), 0)
      : parseFloat(form.amount) || 0;
    await onSubmit({ ...form, requested_by: "", amount });
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-slate-300 bg-white p-0 text-slate-900 shadow-2xl sm:max-w-3xl [&>button]:text-white [&>button]:opacity-80">
        <DialogHeader className="space-y-3 bg-slate-900 px-6 py-5 text-left text-white">
          <DialogTitle className="font-project-display text-2xl font-medium tracking-tight text-white">{title}</DialogTitle>
          <div className="space-y-0.5 text-xs leading-tight text-slate-200">
            <p className="font-medium">PO Number</p>
            <p className="font-mono text-sm text-white">{form.po_number || "PO-2026-001"}</p>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="font-project-body">
          <div className="space-y-5 px-6 py-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_1.2fr_.7fr]">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Supplier Name <span className="text-destructive">*</span></Label>
                {supplierMode === "select" ? (
                  <>
                    <Select value={form.supplier_name} onValueChange={handleSupplierSelect}>
                      <SelectTrigger className="h-9 rounded-sm border-slate-300 bg-white text-sm shadow-none">
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
                    <button type="button" className="text-xs font-medium text-primary underline underline-offset-2" onClick={() => { setSupplierMode("manual"); set("supplier_name", ""); }}>
                      Not in list — enter manually
                    </button>
                  </>
                ) : (
                  <div className="space-y-1.5">
                    <Input required placeholder="Enter supplier name" value={form.supplier_name} onChange={e => set("supplier_name", e.target.value)} className="h-9 rounded-sm border-slate-300 shadow-none" />
                    <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={() => { setSupplierMode("select"); set("supplier_name", ""); }}>Use List</Button>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Project Name</Label>
                <Select value={form.project_name} onValueChange={v => { const proj = projects.find(p => p.project_name === v); set("project_name", v); set("project_code", proj?.project_code || ""); }}>
                  <SelectTrigger className="h-9 rounded-sm border-slate-300 bg-white text-sm shadow-none"><SelectValue placeholder="Select a project..." /></SelectTrigger>
                  <SelectContent>
                    {projects.map(p => <SelectItem key={p.id} value={p.project_name}>{p.project_name}{p.project_code ? ` (${p.project_code})` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Project Code</Label>
                <div className="flex h-9 items-center rounded-sm border border-slate-300 bg-slate-50 px-3 font-mono text-sm font-semibold text-slate-700">
                  {form.project_code || "—"}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Description <span className="text-destructive">*</span></Label>
              <Textarea required rows={3} placeholder="What is being purchased?" value={form.description} onChange={e => set("description", e.target.value)} className="min-h-20 rounded-sm border-slate-300 shadow-none" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">Itemized Line Items</Label>
              <div className="overflow-hidden rounded-sm border border-slate-300">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-300 bg-slate-100 text-slate-800">
                      <th className="px-3 py-2 text-left font-semibold">Description</th>
                      <th className="w-16 border-l border-slate-300 px-2 py-2 text-right font-semibold">Qty</th>
                      <th className="w-20 border-l border-slate-300 px-2 py-2 text-left font-semibold">UOM</th>
                      <th className="w-28 border-l border-slate-300 px-2 py-2 text-right font-semibold">Cost/Item</th>
                      <th className="w-28 border-l border-slate-300 px-2 py-2 text-right font-semibold">Total</th>
                      <th className="w-9 border-l border-slate-300" />
                    </tr>
                  </thead>
                  {form.line_items?.length > 0 && (
                    <tbody>
                      {form.line_items.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-200 last:border-0">
                          <td className="px-3 py-2">{item.description}</td>
                          <td className="border-l border-slate-200 px-2 py-2 text-right">{item.quantity}</td>
                          <td className="border-l border-slate-200 px-2 py-2 text-slate-500">{item.unit_of_measure || "pcs"}</td>
                          <td className="border-l border-slate-200 px-2 py-2 text-right">${(item.cost_per_item || 0).toLocaleString()}</td>
                          <td className="border-l border-slate-200 px-2 py-2 text-right font-semibold">${(item.total || 0).toLocaleString()}</td>
                          <td className="border-l border-slate-200 px-2 py-2 text-center">
                            <button type="button" onClick={() => setForm(prev => ({ ...prev, line_items: prev.line_items.filter((_, i) => i !== idx) }))} className="text-destructive hover:text-destructive/80"><Trash2 className="h-3.5 w-3.5" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  )}
                </table>
                <LineItemAdd onAdd={(item) => setForm(prev => ({ ...prev, line_items: [...(prev.line_items || []), item] }))} suggestions={materialSuggestions} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Additional Notes (optional)</Label>
              <Textarea rows={2} placeholder="e.g. Additional line items, specs..." value={form.items} onChange={e => set("items", e.target.value)} className="min-h-16 rounded-sm border-slate-300 shadow-none" />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Total Amount <span className="text-destructive">*</span></Label>
                {form.line_items?.length > 0 ? (
                  <div className="flex h-9 items-center rounded-sm border border-slate-200 bg-slate-100 px-3 text-sm font-semibold">₱{form.line_items.reduce((sum, item) => sum + (item.total || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                ) : (
                  <Input required type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e => set("amount", e.target.value)} className="h-9 rounded-sm border-slate-300 shadow-none" />
                )}
                <p className="text-[11px] leading-tight text-slate-500">auto-calculated from line items</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Category <span className="text-destructive">*</span></Label>
                <Select value={form.category} onValueChange={v => set("category", v)}>
                  <SelectTrigger className="h-9 rounded-sm border-slate-300 bg-white shadow-none"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {(() => {
                      const activeAccounts = chartOfAccounts.filter(a => a.is_active !== false && a.category);
                      if (activeAccounts.length === 0) return Object.entries(COA_CATEGORY_LABELS).map(([val, label]) => <SelectItem key={val} value={val}>{label}</SelectItem>);
                      const seen = new Set();
                      return activeAccounts.filter(a => { if (seen.has(a.category)) return false; seen.add(a.category); return true; }).map(a => <SelectItem key={a.category} value={a.category}>{COA_CATEGORY_LABELS[a.category] || a.category.replace(/_/g, " ")}</SelectItem>);
                    })()}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Priority</Label>
                <Select value={form.priority} onValueChange={v => set("priority", v)}>
                  <SelectTrigger className="h-9 rounded-sm border-slate-300 bg-white shadow-none"><SelectValue placeholder="Select priority" /></SelectTrigger>
                  <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="normal">Normal</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Chart of Account <span className="text-destructive">*</span></Label>
                <Select value={form.chart_of_account} onValueChange={v => set("chart_of_account", v)}>
                  <SelectTrigger className="h-9 rounded-sm border-slate-300 bg-white shadow-none"><SelectValue placeholder="Select an account..." /></SelectTrigger>
                  <SelectContent>
                    {chartOfAccounts.filter(a => a.is_active !== false).map(a => <SelectItem key={a.id} value={a.account_name}>{a.account_code ? `${a.account_code} — ` : ""}{a.account_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formError && <p className="rounded-sm border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p>}
            <POBudgetWarning project={selectedProject} orders={historicalPOs} category={form.category} amount={currentAmount} currentPOId={initialData?.id} />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.5fr_1fr_1fr]">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Purchaser</Label>
                <div className="flex h-9 items-center rounded-sm border border-slate-300 bg-slate-50 px-3 text-sm font-medium">PROCUREMENT AND LOGISTIC</div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Request Date</Label>
                <Input type="date" value={form.requested_date} onChange={e => set("requested_date", e.target.value)} className="h-9 rounded-sm border-slate-300 shadow-none" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Required By Date</Label>
                <Input type="date" value={form.required_date} onChange={e => set("required_date", e.target.value)} className="h-9 rounded-sm border-slate-300 shadow-none" />
              </div>
            </div>
          </div>

          <DialogFooter className="border-t-4 border-primary bg-slate-50 px-6 py-4 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="min-w-24 rounded-sm border-slate-400 bg-white">Cancel</Button>
            <Button type="submit" disabled={saving} className="min-w-24 rounded-sm">{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}