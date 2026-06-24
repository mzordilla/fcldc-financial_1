import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Package } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function ProjectDeliverySummary({ receivingRecords }) {
  const [search, setSearch] = useState("");
  const [expandedProject, setExpandedProject] = useState(null);

  // Group all receiving line items by project
  const projectGroups = useMemo(() => {
    const map = {};
    for (const record of receivingRecords) {
      const project = record.project_name || "(No Project)";
      if (!map[project]) {
        map[project] = {
          project_name: project,
          total_value: 0,
          total_items: 0,
          po_count: new Set(),
          suppliers: new Set(),
          records: [],
          line_items: [],
        };
      }
      const g = map[project];
      g.total_value += record.total_amount || 0;
      g.records.push(record);
      if (record.po_number) g.po_count.add(record.po_number);
      if (record.supplier_name) g.suppliers.add(record.supplier_name);
      (record.line_items || []).forEach((li) => {
        g.line_items.push({
          ...li,
          po_number: record.po_number,
          supplier_name: record.supplier_name,
          received_date: record.received_date,
        });
        g.total_items += li.quantity_received || li.quantity_ordered || 0;
      });
    }
    return Object.values(map).sort((a, b) => b.total_value - a.total_value);
  }, [receivingRecords]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return projectGroups.filter(g =>
      !q ||
      g.project_name.toLowerCase().includes(q) ||
      [...g.suppliers].some(s => s.toLowerCase().includes(q))
    );
  }, [projectGroups, search]);

  const grandTotal = useMemo(() => filtered.reduce((s, g) => s + g.total_value, 0), [filtered]);

  if (receivingRecords.length === 0) {
    return <p className="text-center py-16 text-muted-foreground">No delivery records yet.</p>;
  }

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Projects", value: projectGroups.length },
          { label: "Total POs Delivered", value: new Set(receivingRecords.map(r => r.po_number).filter(Boolean)).size },
          { label: "Total Suppliers", value: new Set(receivingRecords.map(r => r.supplier_name).filter(Boolean)).size },
          { label: "Grand Total Value", value: `₱${receivingRecords.reduce((s, r) => s + (r.total_amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, highlight: true },
        ].map((kpi, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className={`text-lg font-bold mt-1 ${kpi.highlight ? "text-primary" : "text-foreground"}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by project or supplier..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Project cards */}
      {filtered.map((g) => {
        const key = g.project_name;
        const expanded = expandedProject === key;
        return (
          <div key={key} className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-md transition-shadow">
            <div
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 cursor-pointer"
              onClick={() => setExpandedProject(expanded ? null : key)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <Package className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-foreground">{g.project_name}</h3>
                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                    {g.po_count.size} PO{g.po_count.size !== 1 ? "s" : ""}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {g.records.length} receipt{g.records.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {[...g.suppliers].join(", ") || "—"}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="sm:text-right">
                  <p className="text-xl font-bold text-foreground">₱{g.total_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  <p className="text-xs text-muted-foreground">Total Delivered Value</p>
                </div>
                {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
              </div>
            </div>

            {expanded && (
              <div className="border-t border-border">
                {/* Per-record breakdown */}
                <div className="divide-y divide-border">
                  {g.records.map((rec, ri) => (
                    <div key={ri} className="px-5 py-3 bg-muted/10">
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-2">
                        {rec.po_number && <span className="font-mono bg-muted px-2 py-0.5 rounded">PO: {rec.po_number}</span>}
                        <span className="font-medium text-foreground">{rec.supplier_name}</span>
                        {rec.received_date && <span>Received: {format(new Date(rec.received_date), "MMM d, yyyy")}</span>}
                        {rec.received_by && <span>by {rec.received_by}</span>}
                        <Badge variant="outline" className={`text-xs ${rec.status === "complete" ? "bg-primary/10 text-primary border-primary/20" : "bg-amber-500/10 text-amber-700 border-amber-200"}`}>
                          {rec.status === "complete" ? "Complete" : "Partial"}
                        </Badge>
                        <span className="ml-auto font-semibold text-foreground">₱{(rec.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                      {rec.line_items?.length > 0 && (
                        <div className="border border-border rounded-lg overflow-hidden">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-muted/50 border-b border-border">
                                <th className="px-3 py-2 text-left font-semibold">Item</th>
                                <th className="px-3 py-2 text-right font-semibold">Ordered</th>
                                <th className="px-3 py-2 text-right font-semibold">Received</th>
                                <th className="px-3 py-2 text-right font-semibold">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rec.line_items.map((li, li_i) => (
                                <tr key={li_i} className="border-b border-border/50 last:border-0">
                                  <td className="px-3 py-2">{li.description}</td>
                                  <td className="px-3 py-2 text-right text-muted-foreground">{li.quantity_ordered ?? "—"}</td>
                                  <td className="px-3 py-2 text-right text-muted-foreground">{li.quantity_received ?? "—"}</td>
                                  <td className="px-3 py-2 text-right font-semibold">₱{(li.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Project subtotal footer */}
                <div className="px-5 py-3 bg-primary/5 border-t border-border flex justify-between items-center">
                  <span className="text-sm font-semibold text-foreground">{g.project_name} — Total</span>
                  <span className="text-sm font-bold text-primary">₱{g.total_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}

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