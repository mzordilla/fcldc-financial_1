import { useMemo, useState } from "react";
import ProjectClassificationSection from "@/components/purchase-orders/ProjectClassificationSection";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COA_CATEGORY_LABELS = {
  project_payment: "Project Payment", material_cost: "Material Cost", labor: "Labor",
  equipment: "Equipment", subcontractor: "Subcontractor", overhead: "Overhead",
  permits: "Permits", insurance: "Insurance", bank_reconciliation: "Bank Reconciliation",
  non_current_assets: "Non-Current Assets", current_assets: "Current Assets",
  current_liabilities: "Current Liabilities", non_current_liabilities: "Non-Current Liabilities",
  repair_and_maintenance: "Repair & Maintenance", fixtures: "Fixtures", other: "Other",
};

export default function ProjectDeliverySummary({ receivingRecords, orders = [], projects = [] }) {
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const poMap = useMemo(() => {
    const map = {};
    orders.forEach((order) => { map[order.id] = order; });
    return map;
  }, [orders]);

  const poCategoryMap = useMemo(() => {
    const map = {};
    orders.forEach((o) => { map[o.id] = o.category; });
    return map;
  }, [orders]);

  const projectClassificationMap = useMemo(() => {
    const map = {};
    projects.forEach((project) => { map[project.project_name] = project.project_classification || "unclassified"; });
    return map;
  }, [projects]);

  const approvedOrders = useMemo(() => orders.filter((order) => order.approval_status === "approved").map((order) => ({
    ...order,
    po_id: order.id,
    po_key: order.id,
    total_amount: order.amount || 0,
    issued_amount: order.amount || 0,
    issued_line_items: order.line_items || [],
  })), [orders]);

  const recordSuppliers = useMemo(() => [...new Set(approvedOrders.map((order) => order.supplier_name).filter(Boolean))].sort(), [approvedOrders]);
  const recordCategories = useMemo(() => [...new Set(approvedOrders.map((order) => order.category).filter(Boolean))].sort(), [approvedOrders]);

  const filteredRecords = useMemo(() => approvedOrders.filter((order) => {
    if (supplierFilter !== "all" && order.supplier_name !== supplierFilter) return false;
    if (categoryFilter !== "all" && order.category !== categoryFilter) return false;
    return true;
  }), [approvedOrders, supplierFilter, categoryFilter]);

  // Group approved purchase orders by project
  const projectGroups = useMemo(() => {
    const map = {};
    for (const record of filteredRecords) {
      const project = record.project_name || "(No Project)";
      if (!map[project]) {
        map[project] = {
          project_name: project,
          classification: projectClassificationMap[project] || "unclassified",
          total_value: 0,
          total_items: 0,
          po_count: new Set(),
          po_ids: new Set(),
          suppliers: new Set(),
          records: [],
          supplier_records: {},
          line_items: [],
        };
      }
      const g = map[project];
      const linkedPO = poMap[record.po_id];
      const poKey = record.po_id || record.po_number || record.id;
      const issuedAmount = linkedPO ? (linkedPO.amount ?? (linkedPO.line_items || []).reduce((sum, item) => sum + (item.total || item.quantity * item.cost_per_item || 0), 0)) : (record.total_amount ?? 0);
      const issuedRecord = { ...record, po_key: poKey, issued_amount: issuedAmount, issued_line_items: linkedPO?.line_items || record.line_items || [] };
      if (!g.po_ids.has(poKey)) {
        g.total_value += issuedAmount;
        g.po_ids.add(poKey);
      }
      g.records.push(issuedRecord);
      const supplier = record.supplier_name || "(No Supplier)";
      if (!g.supplier_records[supplier]) g.supplier_records[supplier] = [];
      g.supplier_records[supplier].push(issuedRecord);
      if (record.po_number) g.po_count.add(record.po_number);
      if (record.supplier_name) g.suppliers.add(record.supplier_name);
      (record.line_items || []).forEach((li) => {
        g.line_items.push({
          ...li,
          po_number: record.po_number,
          supplier_name: record.supplier_name,
          received_date: record.received_date,
        });
        g.total_items += li.quantity_received ?? li.quantity_ordered ?? li.quantity ?? 0;
      });
    }
    return Object.values(map).sort((a, b) => b.total_value - a.total_value);
  }, [filteredRecords, projectClassificationMap, poMap]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return projectGroups.filter(g =>
      !q ||
      g.project_name.toLowerCase().includes(q) ||
      [...g.suppliers].some(s => s.toLowerCase().includes(q))
    );
  }, [projectGroups, search]);

  const classificationGroups = useMemo(() => {
    const groups = {};
    filtered.forEach((project) => {
      if (!groups[project.classification]) groups[project.classification] = [];
      groups[project.classification].push(project);
    });
    return Object.entries(groups).sort(([, a], [, b]) => b.reduce((sum, project) => sum + project.total_value, 0) - a.reduce((sum, project) => sum + project.total_value, 0));
  }, [filtered]);

  const grandTotal = useMemo(() => filtered.reduce((s, g) => s + g.total_value, 0), [filtered]);

  if (approvedOrders.length === 0) {
    return <p className="text-center py-16 text-muted-foreground">No approved purchase orders yet.</p>;
  }

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Projects", value: projectGroups.length },
          { label: "Approved POs", value: new Set(filteredRecords.map(r => r.po_number).filter(Boolean)).size },
          { label: "Total Suppliers", value: new Set(filteredRecords.map(r => r.supplier_name).filter(Boolean)).size },
          { label: "Grand Total Value", value: `₱${projectGroups.reduce((sum, project) => sum + project.total_value, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, highlight: true },
        ].map((kpi, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className={`text-lg font-bold mt-1 ${kpi.highlight ? "text-primary" : "text-foreground"}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by project or supplier..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={supplierFilter} onValueChange={setSupplierFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="All Suppliers" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Suppliers</SelectItem>
            {recordSuppliers.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {recordCategories.map((c) => <SelectItem key={c} value={c}>{COA_CATEGORY_LABELS[c] || c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Projects grouped by classification */}
      {classificationGroups.map(([classification, groupedProjects]) => (
        <ProjectClassificationSection key={classification} classification={classification} projects={groupedProjects} />
      ))}

      {/* Grand total */}
      {filtered.length > 0 && (
        <div className="flex justify-between items-center px-5 py-3 bg-card rounded-xl border border-border font-bold">
          <span className="text-foreground">Grand Total ({filtered.length} project{filtered.length !== 1 ? "s" : ""})</span>
          <span className="text-primary text-lg">₱{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
      )}
    </div>
  );
}