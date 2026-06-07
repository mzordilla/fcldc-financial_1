import { useState, useRef } from "react";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, parseISO } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Printer, X, Trash2 } from "lucide-react";

// Build list of last 12 months as options
function getMonthOptions() {
  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = subMonths(new Date(), i);
    months.push({
      label: format(d, "MMMM yyyy"),
      value: format(d, "yyyy-MM"),
    });
  }
  return months;
}

function fmt(n) {
  return (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SupplierStatementDialog({ open, onOpenChange, supplier, payables }) {
  const monthOptions = getMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);
  const [excludedInvoices, setExcludedInvoices] = useState(new Set());
  const printRef = useRef();

  const toggleExclude = (id) => {
    setExcludedInvoices(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (!supplier) return null;

  // Parse selected month bounds
  const [yr, mo] = selectedMonth.split("-").map(Number);
  const monthStart = startOfMonth(new Date(yr, mo - 1));
  const monthEnd = endOfMonth(new Date(yr, mo - 1));

  // All invoices for this supplier
  const supplierPayables = payables.filter(p =>
    (p.supplier_name || "").toLowerCase().trim() === supplier.toLowerCase().trim()
  );

  // Invoices created / due within selected month (excluding removed ones)
  const monthInvoices = supplierPayables.filter(p => {
    if (excludedInvoices.has(p.id)) return false;
    const ref = p.due_date || p.created_date;
    if (!ref) return false;
    const d = new Date(ref);
    return d >= monthStart && d <= monthEnd;
  });

  // Payment history entries within selected month
  const monthPayments = supplierPayables.flatMap(p =>
    (p.payment_history || [])
      .filter(ph => {
        if (!ph.payment_date) return false;
        const d = new Date(ph.payment_date);
        return d >= monthStart && d <= monthEnd;
      })
      .map(ph => ({ ...ph, supplier_name: p.supplier_name, invoice_number: p.invoice_number, description: p.description }))
  );

  // Opening balance: total unpaid balance of all invoices with due_date BEFORE this month
  const openingBalance = supplierPayables.reduce((sum, p) => {
    const ref = p.due_date || p.created_date;
    if (!ref || new Date(ref) >= monthStart) return sum;
    return sum + Math.max(0, (p.amount || 0) - (p.amount_paid || 0));
  }, 0);

  const totalBilled = monthInvoices.reduce((s, p) => s + (p.amount || 0), 0);
  const totalPaid = monthPayments.reduce((s, ph) => s + (ph.amount || 0), 0);
  const closingBalance = openingBalance + totalBilled - totalPaid;

  // Outstanding (all time, not just this month)
  const totalOutstanding = supplierPayables
    .filter(p => p.status !== "paid")
    .reduce((s, p) => s + Math.max(0, (p.amount || 0) - (p.amount_paid || 0)), 0);

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const win = window.open("", "_blank");
    win.document.write(`
      <html><head><title>Supplier Statement – ${supplier}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 24px; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        h2 { font-size: 14px; margin-bottom: 16px; color: #444; font-weight: normal; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th { background: #f3f4f6; text-align: left; padding: 6px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e5e7eb; }
        td { padding: 6px 10px; border-bottom: 1px solid #f1f1f1; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
        .summary { margin-top: 20px; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 16px; display: flex; gap: 32px; }
        .summary-item { }
        .summary-item p { margin: 0; }
        .summary-item .label { color: #6b7280; font-size: 11px; }
        .summary-item .value { font-size: 15px; font-weight: bold; }
        .no-print { display: none !important; }
        @media print { body { margin: 0; } }
      </style>
      </head><body>${content}</body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Supplier Statement – {supplier}</DialogTitle>
            <div className="flex items-center gap-2">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-1" /> Print
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Printable content */}
        <div ref={printRef} className="space-y-6 mt-2">
          {/* Header */}
          <div>
            <h1 className="text-xl font-bold text-foreground">Supplier Statement of Account</h1>
            <h2 className="text-sm text-muted-foreground mt-1">
              {supplier} &mdash; {format(monthStart, "MMMM yyyy")}
            </h2>
            <p className="text-xs text-muted-foreground">
              Period: {format(monthStart, "MMM d, yyyy")} – {format(monthEnd, "MMM d, yyyy")}
            </p>
          </div>

          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Opening Balance", value: openingBalance, color: "text-foreground" },
              { label: "Billed This Month", value: totalBilled, color: "text-chart-2" },
              { label: "Paid This Month", value: totalPaid, color: "text-primary" },
              { label: "Closing Balance", value: closingBalance, color: closingBalance > 0 ? "text-destructive" : "text-primary" },
            ].map(k => (
              <div key={k.label} className="bg-muted/50 rounded-xl p-3 border border-border">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className={`text-lg font-bold mt-0.5 ${k.color}`}>₱{fmt(k.value)}</p>
              </div>
            ))}
          </div>

          {/* Invoices this month */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Invoices This Month</h3>
            {monthInvoices.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center border border-border rounded-xl">No invoices for this period.</p>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Invoice #</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Project</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Due Date</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Paid</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Balance</th>
                      <th className="px-4 py-2 w-8"></th>
                      </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                      {monthInvoices.map(p => {
                      const balance = (p.amount || 0) - (p.amount_paid || 0);
                      return (
                        <tr key={p.id} className="hover:bg-muted/20">
                          <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{p.invoice_number || "—"}</td>
                          <td className="px-4 py-2 text-xs text-foreground max-w-[180px] truncate">{p.description}</td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">{p.project_name || "—"}</td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">{p.due_date ? format(new Date(p.due_date), "MMM d, yyyy") : "—"}</td>
                          <td className="px-4 py-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold capitalize ${
                              p.status === "paid" ? "bg-primary/10 text-primary border-primary/20" :
                              p.status === "partially_paid" ? "bg-chart-3/10 text-chart-3 border-chart-3/20" :
                              p.status === "overdue" ? "bg-destructive/10 text-destructive border-destructive/20" :
                              "bg-chart-2/10 text-chart-2 border-chart-2/20"
                            }`}>{p.status?.replace("_", " ")}</span>
                          </td>
                          <td className="px-4 py-2 text-right text-xs font-semibold text-foreground">₱{fmt(p.amount)}</td>
                          <td className="px-4 py-2 text-right text-xs text-primary">₱{fmt(p.amount_paid)}</td>
                          <td className="px-4 py-2 text-right text-xs font-bold text-foreground">₱{fmt(balance)}</td>
                          <td className="px-4 py-2 text-center no-print">
                            <button
                              onClick={() => toggleExclude(p.id)}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                              title="Remove from statement"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                      })}
                  </tbody>
                  <tfoot className="bg-muted/20 border-t border-border">
                    <tr>
                      <td colSpan={5} className="px-4 py-2 text-xs font-semibold text-foreground text-right">Total</td>
                      <td className="px-4 py-2 text-right text-xs font-bold text-foreground">₱{fmt(totalBilled)}</td>
                      <td className="px-4 py-2 text-right text-xs font-bold text-primary">₱{fmt(monthInvoices.reduce((s, p) => s + (p.amount_paid || 0), 0))}</td>
                      <td className="px-4 py-2 text-right text-xs font-bold text-foreground">₱{fmt(monthInvoices.reduce((s, p) => s + Math.max(0, (p.amount || 0) - (p.amount_paid || 0)), 0))}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Removed invoices — restore option (hidden on print) */}
          {excludedInvoices.size > 0 && (
            <div className="no-print bg-muted/30 border border-dashed border-border rounded-xl p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                {excludedInvoices.size} invoice{excludedInvoices.size > 1 ? "s" : ""} removed from statement
                <button className="ml-3 text-primary underline" onClick={() => setExcludedInvoices(new Set())}>
                  Restore all
                </button>
              </p>
              <div className="flex flex-wrap gap-2">
                {supplierPayables
                  .filter(p => excludedInvoices.has(p.id))
                  .map(p => (
                    <button
                      key={p.id}
                      onClick={() => toggleExclude(p.id)}
                      className="text-xs bg-card border border-border rounded-full px-3 py-1 text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      {p.invoice_number || p.description || "Invoice"} <X className="w-3 h-3" />
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Payments this month */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Payments This Month</h3>
            {monthPayments.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center border border-border rounded-xl">No payments recorded for this period.</p>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Invoice #</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Method</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reference</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {monthPayments.map((ph, i) => (
                      <tr key={i} className="hover:bg-muted/20">
                        <td className="px-4 py-2 text-xs text-muted-foreground">{ph.payment_date ? format(new Date(ph.payment_date), "MMM d, yyyy") : "—"}</td>
                        <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{ph.invoice_number || "—"}</td>
                        <td className="px-4 py-2 text-xs text-foreground max-w-[160px] truncate">{ph.description || ph.notes || "—"}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground capitalize">{ph.payment_method?.replace("_", " ") || "—"}</td>
                        <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{ph.reference || "—"}</td>
                        <td className="px-4 py-2 text-right text-xs font-bold text-primary">₱{fmt(ph.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/20 border-t border-border">
                    <tr>
                      <td colSpan={5} className="px-4 py-2 text-xs font-semibold text-foreground text-right">Total Payments</td>
                      <td className="px-4 py-2 text-right text-xs font-bold text-primary">₱{fmt(totalPaid)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="border-t border-border pt-4 text-xs text-muted-foreground flex items-center justify-between">
            <span>Total Outstanding Balance (all periods): <strong className="text-foreground">₱{fmt(totalOutstanding)}</strong></span>
            <span>Generated: {format(new Date(), "MMM d, yyyy")}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}