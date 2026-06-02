import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Package } from "lucide-react";

const STATUS_STYLES = {
  approved: "bg-primary/10 text-primary border-primary/20",
  pending: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  cancelled: "bg-muted text-muted-foreground border-border",
};

export default function MaterialsHistory() {
  const [search, setSearch] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("all");
  const [filterProject, setFilterProject] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: purchaseOrders = [], isLoading } = useQuery({
    queryKey: ["purchase_orders_materials"],
    queryFn: () => base44.entities.PurchaseOrder.list("-requested_date", 500),
  });

  // Flatten all line items from all POs into a single materials list
  const allMaterials = useMemo(() => {
    const rows = [];
    purchaseOrders.forEach((po) => {
      if (po.line_items && po.line_items.length > 0) {
        po.line_items.forEach((item) => {
          rows.push({
            ...item,
            po_number: po.po_number,
            po_id: po.id,
            supplier_name: po.supplier_name,
            project_name: po.project_name,
            requested_date: po.requested_date,
            approval_status: po.approval_status,
            category: po.category,
          });
        });
      }
    });
    return rows;
  }, [purchaseOrders]);

  const suppliers = useMemo(() => [...new Set(allMaterials.map(m => m.supplier_name).filter(Boolean))].sort(), [allMaterials]);
  const projects = useMemo(() => [...new Set(allMaterials.map(m => m.project_name).filter(Boolean))].sort(), [allMaterials]);

  const filtered = useMemo(() => {
    return allMaterials.filter((m) => {
      const q = search.toLowerCase();
      const matchSearch = !q || (m.description || "").toLowerCase().includes(q) || (m.supplier_name || "").toLowerCase().includes(q) || (m.po_number || "").toLowerCase().includes(q);
      const matchSupplier = filterSupplier === "all" || m.supplier_name === filterSupplier;
      const matchProject = filterProject === "all" || m.project_name === filterProject;
      const matchStatus = filterStatus === "all" || m.approval_status === filterStatus;
      return matchSearch && matchSupplier && matchProject && matchStatus;
    });
  }, [allMaterials, search, filterSupplier, filterProject, filterStatus]);

  const totalValue = useMemo(() => filtered.reduce((s, m) => s + (m.total || 0), 0), [filtered]);
  const totalQty = useMemo(() => filtered.reduce((s, m) => s + (m.quantity || 0), 0), [filtered]);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Package className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Materials History</h1>
          <p className="text-sm text-muted-foreground">All line items from purchase orders</p>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Line Items", value: filtered.length.toLocaleString() },
          { label: "Total Quantity", value: totalQty.toLocaleString() },
          { label: "Total Value", value: `₱${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, highlight: true },
          { label: "Unique Materials", value: [...new Set(filtered.map(m => (m.description || "").toLowerCase().trim()))].length.toLocaleString() },
        ].map((kpi, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className={`text-lg font-bold mt-1 ${kpi.highlight ? "text-primary" : "text-foreground"}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search materials, supplier, PO#..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterSupplier} onValueChange={setFilterSupplier}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="All Suppliers" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Suppliers</SelectItem>
            {suppliers.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="All Projects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <p className="text-center py-16 text-muted-foreground">Loading materials...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center py-16 text-muted-foreground">No materials found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Description</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Qty</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Unit Cost</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Total</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase hidden sm:table-cell">Supplier</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase hidden md:table-cell">Project</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase hidden lg:table-cell">PO #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase hidden lg:table-cell">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => (
                  <tr key={i} className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${i % 2 === 0 ? "" : "bg-muted/5"}`}>
                    <td className="px-4 py-3 font-medium text-foreground max-w-xs">
                      <span className="line-clamp-2">{m.description || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{m.quantity ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">₱{(m.cost_per_item || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">₱{(m.total || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{m.supplier_name || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{m.project_name || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden lg:table-cell">{m.po_number || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">{m.requested_date || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-xs ${STATUS_STYLES[m.approval_status] || STATUS_STYLES.pending}`}>
                        {m.approval_status || "pending"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30 border-t border-border">
                  <td className="px-4 py-3 font-semibold text-foreground" colSpan={3}>Total ({filtered.length} items)</td>
                  <td className="px-4 py-3 text-right font-bold text-primary">₱{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td colSpan={5}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}