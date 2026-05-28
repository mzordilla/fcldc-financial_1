import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Pencil, Users, List, FileUp, Download } from "lucide-react";
import { exportToExcel, parseExcelFile, downloadTemplate } from "@/utils/excelUtils";
import { useRef } from "react";
import BatchPayeeDialog from "../components/payees/BatchPayeeDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const categoryLabels = {
  supplier: "Supplier",
  subcontractor: "Subcontractor",
  employee: "Employee",
  government: "Government",
  utility: "Utility",
  other: "Other",
};

const categoryStyles = {
  supplier: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  subcontractor: "bg-primary/10 text-primary border-primary/20",
  employee: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  government: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  utility: "bg-muted text-muted-foreground border-border",
  other: "bg-muted text-muted-foreground border-border",
};

const defaultForm = { name: "", category: "", contact: "", credit_limit: "", bank_account_name: "", bank_account_number: "", terms_of_payment: "", vat_status: "", notes: "" };

function PayeeFormDialog({ open, onOpenChange, onSubmit, initialData, title }) {
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  // Properly sync form when dialog opens with initialData
  useEffect(() => {
    if (open && initialData) {
      setForm(initialData);
    } else if (open) {
      setForm(defaultForm);
    }
  }, [open, initialData]);

  const handleOpen = (isOpen) => {
    if (!isOpen) {
      setForm(defaultForm);
    }
    onOpenChange(isOpen);
  };

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      credit_limit: form.credit_limit !== "" && form.credit_limit !== null && form.credit_limit !== undefined
        ? parseFloat(form.credit_limit)
        : undefined,
    };
    await onSubmit(payload);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input required placeholder="Payee name" value={form.name} onChange={e => set("name", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={form.category} onValueChange={v => set("category", v)}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="supplier">Supplier</SelectItem>
                <SelectItem value="subcontractor">Subcontractor</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="government">Government</SelectItem>
                <SelectItem value="utility">Utility</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Contact (phone / email)</Label>
            <Input placeholder="e.g. 09XX-XXX-XXXX" value={form.contact} onChange={e => set("contact", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Credit Limit (₱)</Label>
            <Input type="number" placeholder="0.00" value={form.credit_limit} onChange={e => set("credit_limit", e.target.value ? parseFloat(e.target.value) : "")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Bank Account Name</Label>
              <Input placeholder="Account holder name" value={form.bank_account_name} onChange={e => set("bank_account_name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Bank Account Number</Label>
              <Input placeholder="Account number" value={form.bank_account_number} onChange={e => set("bank_account_number", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Terms of Payment</Label>
              <Input placeholder="e.g. Net 30, COD, Net 60" value={form.terms_of_payment} onChange={e => set("terms_of_payment", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>VAT Status</Label>
              <Select value={form.vat_status} onValueChange={v => set("vat_status", v)}>
                <SelectTrigger><SelectValue placeholder="Select VAT status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vat">VAT Registered</SelectItem>
                  <SelectItem value="non_vat">Non-VAT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea rows={2} placeholder="Additional notes..." value={form.notes} onChange={e => set("notes", e.target.value)} />
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

export default function Payees() {
  const [showAdd, setShowAdd] = useState(false);
  const [showBatch, setShowBatch] = useState(false);
  const [editingPayee, setEditingPayee] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const queryClient = useQueryClient();
  const importRef = useRef();

  const handleExport = (data) => {
    exportToExcel(data.map(p => ({
      name: p.name, category: p.category, contact: p.contact,
      terms_of_payment: p.terms_of_payment, vat_status: p.vat_status,
      bank_account_name: p.bank_account_name, bank_account_number: p.bank_account_number,
      credit_limit: p.credit_limit, notes: p.notes,
    })), "payee_masterlist.xlsx", "Payees");
  };

  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const rows = await parseExcelFile(file);
    const parsed = rows.map(r => ({
      name: String(r.name || r.Name || "").trim(),
      category: String(r.category || r.Category || "").toLowerCase().trim(),
      contact: String(r.contact || r.Contact || "").trim(),
      terms_of_payment: String(r.terms_of_payment || r["Terms of Payment"] || "").trim(),
      vat_status: String(r.vat_status || r["VAT Status"] || "").toLowerCase().trim(),
      bank_account_name: String(r.bank_account_name || r["Bank Account Name"] || "").trim(),
      bank_account_number: String(r.bank_account_number || r["Bank Account Number"] || "").trim(),
      credit_limit: r.credit_limit ? parseFloat(r.credit_limit) : undefined,
      notes: String(r.notes || r.Notes || "").trim(),
    })).filter(r => r.name);
    await Promise.all(parsed.map(r => createMutation.mutateAsync(r)));
    e.target.value = "";
  };

  const { data: payees = [], isLoading } = useQuery({
    queryKey: ["payees"],
    queryFn: () => base44.entities.Payee.list("name", 500),
  });

  const { data: payables = [] } = useQuery({
    queryKey: ["payables"],
    queryFn: () => base44.entities.Payable.list("-created_date", 500),
  });

  const getOutstandingBalance = (payeeName) => {
    return payables
      .filter(p => p.supplier_name === payeeName && (p.status === "unpaid" || p.status === "partially_paid"))
      .reduce((sum, p) => sum + Math.max(0, (p.amount || 0) - (p.amount_paid || 0)), 0);
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Payee.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payees"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Payee.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payees"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Payee.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payees"] }),
  });

  const filtered = payees.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.contact || "").toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === "all" || p.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Payee Masterlist</h1>
          <p className="text-muted-foreground mt-1">{payees.length} payees registered</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport(payees)}>
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => importRef.current.click()}>
            <FileUp className="w-4 h-4 mr-2" /> Import
          </Button>
          <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportFile} />
          <Button variant="outline" onClick={() => setShowBatch(true)}>
            <List className="w-4 h-4 mr-2" /> Batch Entry
          </Button>
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Payee
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search by name or contact..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="supplier">Supplier</SelectItem>
            <SelectItem value="subcontractor">Subcontractor</SelectItem>
            <SelectItem value="employee">Employee</SelectItem>
            <SelectItem value="government">Government</SelectItem>
            <SelectItem value="utility">Utility</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Category summary pills */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(categoryLabels).map(([key, label]) => {
          const count = payees.filter(p => p.category === key).length;
          if (count === 0) return null;
          return (
            <button
              key={key}
              onClick={() => setCategoryFilter(categoryFilter === key ? "all" : key)}
              className={`text-xs px-3 py-1 rounded-full border font-medium transition-all ${categoryFilter === key ? categoryStyles[key] : "bg-muted text-muted-foreground border-border hover:bg-accent"}`}
            >
              {label} · {count}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {isLoading && <p className="text-center py-12 text-muted-foreground">Loading...</p>}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16">
            <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No payees found</p>
          </div>
        )}
        {filtered.length > 0 && (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Terms</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">VAT</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Outstanding</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Credit Limit</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                  <td className="px-4 py-3">
                    {p.category ? (
                      <Badge variant="outline" className={`text-xs ${categoryStyles[p.category]}`}>
                        {categoryLabels[p.category]}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{p.contact || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{p.terms_of_payment || "—"}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {p.vat_status ? (
                      <Badge variant="outline" className={p.vat_status === "vat" ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border"}>
                        {p.vat_status === "vat" ? "VAT" : "Non-VAT"}
                      </Badge>
                    ) : <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {getOutstandingBalance(p.name) > 0 ? (
                      <span className="text-destructive">₱{getOutstandingBalance(p.name).toLocaleString()}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium hidden lg:table-cell">{p.credit_limit ? `₱${p.credit_limit.toLocaleString()}` : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => setEditingPayee(p)} className="text-muted-foreground hover:text-foreground h-8 w-8">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(p.id)} className="text-muted-foreground hover:text-destructive h-8 w-8">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <BatchPayeeDialog
        open={showBatch}
        onOpenChange={setShowBatch}
        onImport={async (rows) => {
          await Promise.all(rows.map(r => createMutation.mutateAsync(r)));
        }}
      />
      <PayeeFormDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        title="Add Payee"
        onSubmit={(data) => createMutation.mutateAsync(data)}
      />
      <PayeeFormDialog
        open={!!editingPayee}
        onOpenChange={(v) => { if (!v) setEditingPayee(null); }}
        title="Edit Payee"
        initialData={editingPayee || defaultForm}
        onSubmit={(data) => updateMutation.mutateAsync({ id: editingPayee.id, data })}
      />
    </div>
  );
}