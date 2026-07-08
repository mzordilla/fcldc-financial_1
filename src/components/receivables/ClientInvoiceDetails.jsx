import { format, differenceInDays } from "date-fns";
import { CheckCircle, Pencil, Trash2, Banknote } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function getAgingBucket(dueDateStr, status) {
  if (status === "paid") return null;
  if (!dueDateStr) return null;
  const days = differenceInDays(new Date(), new Date(dueDateStr));
  if (days <= 0) return { label: "Current", style: "bg-primary/10 text-primary" };
  if (days <= 30) return { label: "1–30 days", style: "bg-chart-3/10 text-chart-3" };
  if (days <= 60) return { label: "31–60 days", style: "bg-chart-3/20 text-chart-3" };
  if (days <= 90) return { label: "61–90 days", style: "bg-destructive/10 text-destructive" };
  return { label: "90+ days", style: "bg-destructive/20 text-destructive font-semibold" };
}

const statusStyles = {
  outstanding: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  partially_paid: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  paid: "bg-primary/10 text-primary border-primary/20",
  overdue: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function ClientInvoiceDetails({ rows, onCollect, onEdit, onDelete }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/30 border-y border-border">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Invoice #</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Due Date</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Aging</th>
            <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Billed</th>
            <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Collected</th>
            <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Balance</th>
            <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-6 text-center text-xs text-muted-foreground">No invoices</td>
            </tr>
          )}
          {rows.map((r) => {
            const remaining = (r.amount || 0) - (r.amount_paid || 0);
            const aging = getAgingBucket(r.due_date, r.status);
            return (
              <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.invoice_number || "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{r.due_date ? format(new Date(r.due_date), "MMM d, yyyy") : "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={`text-xs ${statusStyles[r.status] || ""}`}>
                    {(r.status || "outstanding").replace(/_/g, " ")}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {aging ? <Badge className={aging.style} variant="outline">{aging.label}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 text-right text-xs font-semibold text-foreground">₱{(r.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-3 text-right text-xs text-primary">₱{(r.amount_paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-3 text-right text-xs font-bold text-foreground">₱{remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {r.status !== "paid" && (
                      <button onClick={() => onCollect(r)} className="text-primary hover:opacity-70 transition-opacity" title="Record Collection">
                        <CheckCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {r.status === "paid" && (r.payment_history || []).length > 0 && (
                      <button onClick={() => onCollect(r)} className="text-muted-foreground hover:text-primary transition-colors" title="View Collections">
                        <Banknote className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => onEdit(r)} className="text-muted-foreground hover:text-foreground transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onDelete(r.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}