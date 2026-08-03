import { Banknote, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const fmt = (n) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

export default function LeaseCollectionClientDetails({ rows, onOpen }) {
  return <div className="overflow-x-auto"><table className="w-full text-sm">
    <thead className="bg-muted/30 border-y border-border"><tr>
      {["Billing Month", "Units", "Status", "Billed", "Collected", "Balance", "Actions"].map((label) =>
        <th key={label} className={`px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide ${["Billed", "Collected", "Balance", "Actions"].includes(label) ? "text-right" : "text-left"}`}>{label}</th>)}
    </tr></thead>
    <tbody className="divide-y divide-border">{rows.map((row) => {
      const paid = row.balance <= 0;
      const units = row.tenants.map((t) => t.unit_number).filter(Boolean).join(", ") || "—";
      return <tr key={row.month} className="hover:bg-muted/20 transition-colors">
        <td className="px-4 py-3 text-xs font-medium">{row.label}</td><td className="px-4 py-3 text-xs text-muted-foreground">{units}</td>
        <td className="px-4 py-3"><Badge variant="outline" className={paid ? "bg-primary/10 text-primary border-primary/20" : row.collected > 0 ? "bg-chart-3/10 text-chart-3 border-chart-3/20" : "bg-chart-2/10 text-chart-2 border-chart-2/20"}>{paid ? "paid" : row.collected > 0 ? "partially paid" : "outstanding"}</Badge></td>
        <td className="px-4 py-3 text-right text-xs font-semibold">{fmt(row.billed)}</td><td className="px-4 py-3 text-right text-xs text-primary">{fmt(row.collected)}</td>
        <td className="px-4 py-3 text-right text-xs font-bold">{fmt(row.balance)}</td><td className="px-4 py-3 text-right">
          <button onClick={() => onOpen(row)} className={paid ? "text-muted-foreground hover:text-primary" : "text-primary hover:opacity-70"} title={paid ? "View collection" : "Record collection"}>{paid ? <Banknote className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}</button>
        </td>
      </tr>;
    })}</tbody>
  </table></div>;
}