import { format } from "date-fns";
import { differenceInDays } from "date-fns";
import { CreditCard, CheckCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

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
  unpaid: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  partially_paid: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  paid: "bg-primary/10 text-primary border-primary/20",
  overdue: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function PayableCard({ p, isDuplicate, onPay, onDelete }) {
  const remaining = (p.amount || 0) - (p.amount_paid || 0);
  const paidPct = p.amount ? Math.min(((p.amount_paid || 0) / p.amount) * 100, 100) : 0;
  const aging = getAgingBucket(p.due_date, p.status);

  return (
    <div className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h3 className="font-semibold text-foreground">{p.supplier_name}</h3>
            {p.po_number && <Badge variant="secondary" className="text-xs">PO: {p.po_number}</Badge>}
            <Badge variant="outline" className={`text-xs ${statusStyles[p.status] || ""}`}>
              {(p.status || "unpaid").replace(/_/g, " ")}
            </Badge>
            {p.category && <Badge variant="secondary" className="text-xs">{p.category}</Badge>}
            {aging && <Badge variant="outline" className={`text-xs ${aging.style}`}>{aging.label}</Badge>}
            {isDuplicate && (
              <Badge variant="outline" className="text-xs bg-chart-3/10 text-chart-3 border-chart-3/20">
                ⚠ Possible Duplicate
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {p.description || ""}
            {p.invoice_number ? ` · ${p.invoice_number}` : ""}
            {p.project_name ? ` · ${p.project_name}` : ""}
            {p.due_date && ` · Due ${format(new Date(p.due_date), "MMM d, yyyy")}`}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Progress value={paidPct} className="h-2 flex-1" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              ₱{(p.amount_paid || 0).toLocaleString()} / ₱{(p.amount || 0).toLocaleString()}
            </span>
          </div>
          {(p.payment_history || []).length > 0 && (
            <div className="mt-3 rounded-lg border border-border divide-y divide-border text-xs">
              {(p.payment_history || []).map((h, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-1.5">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CreditCard className="w-3 h-3" />
                    <span className="capitalize">{(h.payment_method || "").replace(/_/g, " ")}</span>
                    {h.reference && <span>· {h.reference}</span>}
                    {h.payment_date && <span>· {format(new Date(h.payment_date), "MMM d, yyyy")}</span>}
                    {h.notes && <span className="italic">· {h.notes}</span>}
                  </div>
                  <span className="font-semibold text-primary">₱{(h.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 sm:flex-col sm:items-end">
          <p className={`text-lg font-bold ${p.status === "paid" ? "text-primary" : "text-destructive"}`}>
            {p.status === "paid" ? "PAID" : `₱${remaining.toLocaleString()}`}
          </p>
          <div className="flex gap-1">
            {p.status !== "paid" && (
              <Button variant="ghost" size="icon" onClick={() => onPay(p)} className="text-primary hover:text-primary" title="Record Payment">
                <CheckCircle className="w-4 h-4" />
              </Button>
            )}
            {p.status === "paid" && (p.payment_history || []).length > 0 && (
              <Button variant="ghost" size="icon" onClick={() => onPay(p)} className="text-muted-foreground hover:text-primary" title="View Payments">
                <CreditCard className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => onDelete(p.id)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}