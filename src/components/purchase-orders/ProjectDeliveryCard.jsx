import { useState } from "react";
import { ChevronDown, ChevronUp, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import SupplierDeliveryDropdown from "@/components/purchase-orders/SupplierDeliveryDropdown";

export default function ProjectDeliveryCard({ project }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <button type="button" className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 text-left hover:bg-muted/20" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3 flex-wrap">
          <Package className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">{project.project_name}</h3>
          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">{project.po_count.size} PO{project.po_count.size !== 1 ? "s" : ""}</Badge>
          <Badge variant="outline" className="text-xs">{project.records.length} receipt{project.records.length !== 1 ? "s" : ""}</Badge>
        </div>
        <div className="flex items-center gap-4">
          <div className="sm:text-right"><p className="text-xl font-bold text-foreground">₱{project.total_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p><p className="text-xs text-muted-foreground">Project Total</p></div>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>
      {expanded && <div className="border-t border-border">
        {Object.entries(project.supplier_records).sort(([, a], [, b]) => b.reduce((sum, record) => sum + (record.issued_amount || 0), 0) - a.reduce((sum, record) => sum + (record.issued_amount || 0), 0)).map(([supplier, records]) => <SupplierDeliveryDropdown key={supplier} name={supplier} records={records} />)}
        <div className="px-5 py-3 bg-primary/5 border-t border-border flex justify-between"><span className="text-sm font-semibold">{project.project_name} — Total</span><span className="text-sm font-bold text-primary">₱{project.total_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
      </div>}
    </div>
  );
}