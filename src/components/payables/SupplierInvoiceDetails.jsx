import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, differenceInDays } from "date-fns";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const netPayable = (p) => (p.amount || 0) - (p.withholding_tax_amount || 0) + (p.vat_amount || 0);

export default function SupplierInvoiceDetails({ supplier, typeFilter, isExpanded, onDelete }) {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["payablesSupplier", supplier, typeFilter],
    queryFn: () => base44.entities.Payable.filter({ supplier_name: supplier }, "-due_date", 1000),
    enabled: isExpanded,
  });

  if (!isExpanded) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground text-sm gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading invoices…
      </div>
    );
  }

  const unpaidInvoices = invoices.filter((p) =>
    p.status !== "paid" &&
    (typeFilter === "all" || (typeFilter === "subcontractor" ? p.category === "subcontractor" : p.category !== "subcontractor"))
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/30 border-y border-border">
          <tr>
            <th className="px-3 py-1.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Invoice #</th>
            <th className="px-3 py-1.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Description</th>
            <th className="px-3 py-1.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Project</th>
            <th className="px-3 py-1.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Due Date</th>
            <th className="px-3 py-1.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Aging</th>
            <th className="px-3 py-1.5 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
            <th className="px-3 py-1.5 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Paid</th>
            <th className="px-3 py-1.5 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Balance</th>
            <th className="px-3 py-1.5 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {unpaidInvoices.length === 0 && (
            <tr>
              <td colSpan={9} className="px-4 py-6 text-center text-xs text-muted-foreground">No outstanding invoices</td>
            </tr>
          )}
          {unpaidInvoices.map((p) => {
            const bucket = getAgingBucket(p.due_date, p.status);
            const netAmt = netPayable(p);
            const balance = netAmt - (p.amount_paid || 0);
            return (
              <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground">{p.invoice_number || "—"}</td>
                <td className="px-3 py-1.5 text-xs text-foreground max-w-[200px] truncate">{p.description}</td>
                <td className="px-3 py-1.5 text-xs text-muted-foreground">{p.project_name || "—"}</td>
                <td className="px-3 py-1.5 text-xs text-muted-foreground">{p.due_date ? format(new Date(p.due_date), "MMM d, yyyy") : "—"}</td>
                <td className="px-3 py-1.5">
                  {bucket ? <Badge className={bucket.style} variant="outline">{bucket.label}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-1.5 text-right text-xs font-semibold text-foreground">
                  ₱{netAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  {p.withholding_tax_amount > 0 && (
                    <div className="text-muted-foreground font-normal">Gross: ₱{(p.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  )}
                </td>
                <td className="px-3 py-1.5 text-right text-xs text-primary">₱{(p.amount_paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="px-3 py-1.5 text-right text-xs font-bold text-foreground">₱{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="px-3 py-1.5 text-right">
                  <Button size="sm" variant="outline" onClick={() => onDelete(p.id, p.supplier_name)} className="text-xs text-destructive hover:text-destructive h-6 px-2">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}