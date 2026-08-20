import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Package } from "lucide-react";

const ASSET_TYPES = [
  { value: "land", label: "Land" },
  { value: "vehicle", label: "Vehicle" },
  { value: "furniture_and_fixture", label: "Furnitures & Fixtures" },
  { value: "building", label: "Building" },
  { value: "equipment", label: "Equipment" },
  { value: "heavy_equipment", label: "Heavy Equipment" },
  { value: "other", label: "Other" },
];

const STATUS_STYLES = {
  active: "bg-primary/10 text-primary border-primary/20",
  disposed: "bg-muted text-muted-foreground border-border",
  under_maintenance: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  fully_depreciated: "bg-destructive/10 text-destructive border-destructive/20",
};

const STATUS_LABELS = {
  active: "Active",
  disposed: "Disposed",
  under_maintenance: "Under Maintenance",
  fully_depreciated: "Fully Depreciated",
};

const DEPRECIATION_LABELS = {
  straight_line: "Straight Line",
  declining_balance: "Declining Balance",
  none: "None",
};

const EMPTY_FORM = {
  asset_name: "",
  asset_type: "land",
  asset_code: "",
  title_no: "",
  area_sqm: "",
  acquisition_date: "",
  acquisition_cost: "",
  useful_life_years: "",
  depreciation_method: "straight_line",
  accumulated_depreciation: "",
  book_value: "",
  location: "",
  assigned_to: "",
  status: "active",
  notes: "",
};

function fmt(v) {
  return `₱${(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function AssetFormDialog({ open, onClose, asset, onSubmit }) {
  const [form, setForm] = useState(asset ? { ...asset } : { ...EMPTY_FORM });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...form,
      acquisition_cost: parseFloat(form.acquisition_cost) || 0,
      useful_life_years: form.useful_life_years ? parseFloat(form.useful_life_years) : undefined,
      accumulated_depreciation: parseFloat(form.accumulated_depreciation) || 0,
      area_sqm: form.area_sqm ? parseFloat(form.area_sqm) : undefined,
      book_value: form.book_value ? parseFloat(form.book_value) : (parseFloat(form.acquisition_cost) || 0) - (parseFloat(form.accumulated_depreciation) || 0),
    };
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{asset ? "Edit Asset" : "Add PPE Asset"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Asset Name *</Label>
              <Input value={form.asset_name} onChange={e => set("asset_name", e.target.value)} required />
            </div>
            <div>
              <Label>Title No.</Label>
              <Input value={form.title_no || ""} onChange={e => set("title_no", e.target.value)} placeholder="e.g. TCT-12345A" />
            </div>
            <div>
              <Label>Asset Type *</Label>
              <Select value={form.asset_type} onValueChange={v => set("asset_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSET_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Asset Code</Label>
              <Input value={form.asset_code} onChange={e => set("asset_code", e.target.value)} placeholder="e.g. VHL-001" />
            </div>
            {["land", "building"].includes(form.asset_type) && (
              <div>
                <Label>Area (sqm)</Label>
                <Input type="number" step="0.01" min="0" value={form.area_sqm || ""} onChange={e => set("area_sqm", e.target.value)} placeholder="e.g. 250.5" />
              </div>
            )}
            <div>
              <Label>Acquisition Date</Label>
              <Input type="date" value={form.acquisition_date} onChange={e => set("acquisition_date", e.target.value)} />
            </div>
            <div>
              <Label>Acquisition Cost *</Label>
              <Input type="number" value={form.acquisition_cost} onChange={e => set("acquisition_cost", e.target.value)} required min="0" />
            </div>
            <div>
              <Label>Useful Life (years)</Label>
              <Input type="number" value={form.useful_life_years} onChange={e => set("useful_life_years", e.target.value)} min="0" />
            </div>
            <div>
              <Label>Depreciation Method</Label>
              <Select value={form.depreciation_method} onValueChange={v => set("depreciation_method", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="straight_line">Straight Line</SelectItem>
                  <SelectItem value="declining_balance">Declining Balance</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Accumulated Depreciation</Label>
              <Input type="number" value={form.accumulated_depreciation} onChange={e => set("accumulated_depreciation", e.target.value)} min="0" />
            </div>
            <div>
              <Label>Book Value</Label>
              <Input type="number" value={form.book_value} onChange={e => set("book_value", e.target.value)} min="0" placeholder="Auto-calculated if blank" />
            </div>
            <div>
              <Label>Location</Label>
              <Input value={form.location} onChange={e => set("location", e.target.value)} />
            </div>
            <div>
              <Label>Assigned To</Label>
              <Input value={form.assigned_to} onChange={e => set("assigned_to", e.target.value)} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{asset ? "Save Changes" : "Add Asset"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function PPEAssets() {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["ppe_assets"],
    queryFn: () => base44.entities.PPEAsset.list("-acquisition_date", 500),
  });

  const create = useMutation({
    mutationFn: (data) => base44.entities.PPEAsset.create(data),
    onSuccess: () => { qc.invalidateQueries(["ppe_assets"]); setShowForm(false); },
  });

  const update = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PPEAsset.update(id, data),
    onSuccess: () => { qc.invalidateQueries(["ppe_assets"]); setEditing(null); },
  });

  const remove = useMutation({
    mutationFn: (id) => base44.entities.PPEAsset.delete(id),
    onSuccess: () => qc.invalidateQueries(["ppe_assets"]),
  });

  const filtered = assets.filter(a => {
    if (typeFilter !== "all" && a.asset_type !== typeFilter) return false;
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    return true;
  });

  const totalCost = filtered.reduce((s, a) => s + (a.acquisition_cost || 0), 0);
  const totalAccumDep = filtered.reduce((s, a) => s + (a.accumulated_depreciation || 0), 0);
  const totalBookValue = filtered.reduce((s, a) => s + (a.book_value ?? ((a.acquisition_cost || 0) - (a.accumulated_depreciation || 0))), 0);

  // Group totals by type
  const byType = ASSET_TYPES.map(t => ({
    ...t,
    count: assets.filter(a => a.asset_type === t.value && a.status !== "disposed").length,
    value: assets.filter(a => a.asset_type === t.value && a.status !== "disposed").reduce((s, a) => s + (a.book_value ?? ((a.acquisition_cost || 0) - (a.accumulated_depreciation || 0))), 0),
  }));

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">PPE Assets</h1>
          <p className="text-muted-foreground mt-1">Property, Plant & Equipment register</p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-2" />Add Asset</Button>
      </div>

      {/* Asset type summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {byType.map(t => (
          <div key={t.value} className="bg-card border border-border rounded-xl p-3">
            <p className="text-xs text-muted-foreground">{t.label}</p>
            <p className="text-lg font-bold text-foreground mt-0.5">{t.count}</p>
            <p className="text-xs text-primary">{fmt(t.value)}</p>
          </div>
        ))}
      </div>

      {/* KPI totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">Total Acquisition Cost</p>
          <p className="text-xl font-bold text-foreground mt-1">{fmt(totalCost)}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">Accumulated Depreciation</p>
          <p className="text-xl font-bold text-destructive mt-1">{fmt(totalAccumDep)}</p>
        </div>
        <div className="bg-card border border-primary/20 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">Net Book Value</p>
          <p className="text-xl font-bold text-primary mt-1">{fmt(totalBookValue)}</p>
        </div>
      </div>

      {/* Type tabs */}
      <Tabs value={typeFilter} onValueChange={setTypeFilter}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="all">All Types</TabsTrigger>
          {ASSET_TYPES.map(t => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      {/* Filters + table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex flex-wrap gap-3 p-4 border-b border-border">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading && <p className="text-center py-12 text-muted-foreground">Loading...</p>}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No assets found</p>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Asset</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Acquired</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cost</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Accum. Dep.</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Book Value</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => {
                  const bookVal = a.book_value ?? ((a.acquisition_cost || 0) - (a.accumulated_depreciation || 0));
                  return (
                    <tr key={a.id} className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${i % 2 === 0 ? "" : "bg-muted/5"}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{a.asset_name}</p>
                        {a.title_no && <p className="text-xs text-muted-foreground">Title No.: {a.title_no}</p>}
                        {a.area_sqm ? <p className="text-xs text-muted-foreground">{a.area_sqm.toLocaleString()} sqm</p> : null}
                        {a.asset_code && <p className="text-xs text-muted-foreground">{a.asset_code}</p>}
                        {a.location && <p className="text-xs text-muted-foreground">{a.location}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-foreground">{ASSET_TYPES.find(t => t.value === a.asset_type)?.label || a.asset_type}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {a.acquisition_date || "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">{fmt(a.acquisition_cost)}</td>
                      <td className="px-4 py-3 text-right text-destructive hidden lg:table-cell">{fmt(a.accumulated_depreciation)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-primary">{fmt(bookVal)}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-xs ${STATUS_STYLES[a.status] || ""}`}>
                          {STATUS_LABELS[a.status] || a.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(a)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { if (confirm("Delete this asset?")) remove.mutate(a.id); }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <AssetFormDialog open onClose={() => setShowForm(false)} onSubmit={(data) => create.mutate(data)} />
      )}
      {editing && (
        <AssetFormDialog open onClose={() => setEditing(null)} asset={editing} onSubmit={(data) => update.mutate({ id: editing.id, data })} />
      )}
    </div>
  );
}