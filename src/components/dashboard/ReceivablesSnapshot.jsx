import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const statusStyles = {
  outstanding: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  partially_paid: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  paid: "bg-primary/10 text-primary border-primary/20",
  overdue: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function ReceivablesSnapshot({ receivables }) {
  const outstanding = receivables
    .filter(r => r.status !== "paid")
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5);

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Outstanding Receivables</h3>
          <p className="text-sm text-muted-foreground">Pending payments from clients</p>
        </div>
        <Link to="/receivables" className="text-sm text-primary font-medium flex items-center gap-1 hover:underline">
          View all <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="space-y-3">
        {outstanding.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No outstanding receivables</p>
        )}
        {outstanding.map((r) => (
          <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <div>
              <p className="text-sm font-medium">{r.client_name}</p>
              <p className="text-xs text-muted-foreground">
                {r.project_name || r.invoice_number || "—"}
                {r.due_date && ` · Due ${format(new Date(r.due_date), "MMM d")}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={`text-xs ${statusStyles[r.status] || ""}`}>
                {(r.status || "outstanding").replace(/_/g, " ")}
              </Badge>
              <span className="text-sm font-semibold">${((r.amount || 0) - (r.amount_paid || 0)).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}