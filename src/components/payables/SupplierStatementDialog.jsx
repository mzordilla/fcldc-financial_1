import { useState, useRef } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Printer, X, TrendingDown, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";

function getMonthOptions() {
  const months = [];
  for (let i = 0; i < 24; i++) {
    const d = subMonths(new Date(), i);
    months.push({ label: format(d, "MMMM yyyy"), value: format(d, "yyyy-MM") });
  }
  return months;
}

function fmt(n) {
  return (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatusBadge({ status }) {
  const map = {
    paid: "bg-green-100 text-green-700 border-green-200",
    partially_paid: "bg-amber-100 text-amber-700 border-amber-200",
    overdue: "bg-red-100 text-red-700 border-red-200",
    unpaid: "bg-blue-100 text-blue-700 border-blue-200",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold capitalize ${map[status] || map.unpaid}`}>
      {status?.replace("_", " ")}
    </span>
  );
}

function SummaryCard({ label, value, sub, color = "text-foreground", icon }) {
  return (
    <div className="bg-muted/50 rounded-xl p-3 border border-border">
      <div className="flex items-center gap-1.5 mb-1">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className={`text-lg font-bold ${color}`}>₱{fmt(value)}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function SupplierStatementDialog({ open, onOpenChange, supplier, payables }) {
  const monthOptions = getMonthOptions();
  const [view, setView] = useState("all"); // "all" | "monthly"
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);
  const [excludedIds, setExcludedIds] = useState(new Set());
  const printRef = useRef();

  if (!supplier) return null;

  const toggleExclude = (id) => {
    setExcludedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };

  // All payables for this supplier
  const supplierPayables = payables.filter(p =>
    (p.supplier_name || "").toLowerCase().trim() === supplier.toLowerCase().trim()
  );

  // ── ALL-TIME VIEW ────────────────────────────────────────────────────────────
  const allInvoices = supplierPayables.filter(p => !excludedIds.has(p.id));

  const allGross        = allInvoices.reduce((s, p) => s + (p.amount || 0), 0);
  const allWHT          = allInvoices.reduce((s, p) => s + (p.withholding_tax_amount || 0), 0);
  const allVAT          = allInvoices.reduce((s, p) => s + (p.vat_amount || 0), 0);
  const allNet          = allGross - allWHT + allVAT;
  const allPaid         = allInvoices.reduce((s, p) => s + (p.amount_paid || 0), 0);
  const allOutstanding  = Math.max(0, allNet - allPaid);

  const unpaidInvoices  = allInvoices.filter(p => p.status !== "paid");
  const paidInvoices    = allInvoices.filter(p => p.status === "paid");

  // All payment history entries
  const allPayments = supplierPayables.flatMap(p =>
    (p.payment_history || []).map(ph => ({
      ...ph,
      invoice_number: p.invoice_number,
      description: p.description,
    }))
  ).sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));

  // ── MONTHLY VIEW ─────────────────────────────────────────────────────────────
  const [yr, mo] = selectedMonth.split("-").map(Number);
  const monthStart = startOfMonth(new Date(yr, mo - 1));
  const monthEnd   = endOfMonth(new Date(yr, mo - 1));

  const monthInvoices = supplierPayables.filter(p => {
    if (excludedIds.has(p.id)) return false;
    const d = new Date(p.due_date || p.created_date);
    return d >= monthStart && d <= monthEnd;
  });

  const monthPayments = supplierPayables.flatMap(p =>
    (p.payment_history || [])
      .filter(ph => { const d = new Date(ph.payment_date); return d >= monthStart && d <= monthEnd; })
      .map(ph => ({ ...ph, invoice_number: p.invoice_number, description: p.description }))
  );

  const monthGross  = monthInvoices.reduce((s, p) => s + (p.amount || 0), 0);
  const monthWHT    = monthInvoices.reduce((s, p) => s + (p.withholding_tax_amount || 0), 0);
  const monthVAT    = monthInvoices.reduce((s, p) => s + (p.vat_amount || 0), 0);
  const monthNet    = monthGross - monthWHT + monthVAT;
  const monthPaidAmt = monthPayments.reduce((s, ph) => s + (ph.amount || 0), 0);

  const openingBalance = supplierPayables.reduce((sum, p) => {
    const d = new Date(p.due_date || p.created_date);
    if (d >= monthStart) return sum;
    return sum + Math.max(0, (p.amount || 0) - (p.withholding_tax_amount || 0) + (p.vat_amount || 0) - (p.amount_paid || 0));
  }, 0);
  const closingBalance = openingBalance + monthNet - monthPaidAmt;

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const win = window.open("", "_blank");
    win.document.write(`<html><head><title>Vendor Statement – ${supplier}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 24px; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        p { margin: 0 0 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background: #f3f4f6; text-align: left; padding: 6px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e5e7eb; }
        td { padding: 6px 10px; border-bottom: 1px solid #f1f1f1; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
        .label { color: #6b7280; font-size: 11px; }
        .kpi-grid { display: flex; gap: 16px; flex-wrap: wrap; margin: 12px 0; }
        .kpi { border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 14px; min-width: 120px; }
        .kpi .val { font-size: 16px; font-weight: bold; }
        .no-print { display: none !important; }
        .section-title { font-size: 13px; font-weight: bold; margin: 18px 0 6px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
        @media print { body { margin: 0; } }
      </style>
      </head><body>${content}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <DialogTitle className="text-lg">Vendor Statement — {supplier}</DialogTitle>
            <div className="flex items-center gap-2 flex-wrap no-print">
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setView("all")}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === "all" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
                >
                  All Time
                </button>
                <button
                  onClick={() => setView("monthly")}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === "monthly" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
                >
                  Monthly
                </button>
              </div>
              {view === "monthly" && (
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-44 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <Button size="sm" onClick={handlePrint} className="gap-1.5">
                <Printer className="w-4 h-4" /> Print
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div ref={printRef} className="space-y-6 mt-1">
          {/* Report Header */}
          <div>
            <h1 className="text-xl font-bold text-foreground">Vendor Statement of Account</h1>
            <p className="text-sm text-muted-foreground mt-1">{supplier}</p>
            <p className="text-xs text-muted-foreground">
              {view === "monthly"
                ? `Period: ${format(monthStart, "MMM d, yyyy")} – ${format(monthEnd, "MMM d, yyyy")}`
                : `All transactions as of ${format(new Date(), "MMM d, yyyy")}`}
            </p>
          </div>

          {/* ── ALL-TIME REPORT ── */}
          {view === "all" && (
            <>
              {/* Tax & Balance Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <SummaryCard label="Total Gross Billed" value={allGross} color="text-foreground" icon={<TrendingUp className="w-3.5 h-3.5" />} />
                <SummaryCard label="Withholding Tax Deducted" value={allWHT} color="text-amber-600" sub={allInvoices.some(p => p.withholding_tax_percentage > 0) ? `Avg ${(allInvoices.filter(p=>p.withholding_tax_percentage>0).reduce((s,p)=>s+p.withholding_tax_percentage,0)/Math.max(1,allInvoices.filter(p=>p.withholding_tax_percentage>0).length)).toFixed(1)}% rate` : null} icon={<TrendingDown className="w-3.5 h-3.5" />} />
                <SummaryCard label="VAT Added" value={allVAT} color="text-blue-600" icon={<TrendingUp className="w-3.5 h-3.5" />} />
                <SummaryCard label="Net Amount Payable" value={allNet} color="text-foreground" sub="Gross − WHT + VAT" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <SummaryCard label="Total Paid" value={allPaid} color="text-primary" icon={<CheckCircle2 className="w-3.5 h-3.5 text-primary" />} sub={`${paidInvoices.length} invoices settled`} />
                <SummaryCard label="Outstanding Balance" value={allOutstanding} color={allOutstanding > 0 ? "text-destructive" : "text-primary"} icon={<AlertCircle className="w-3.5 h-3.5" />} sub={`${unpaidInvoices.length} invoice${unpaidInvoices.length !== 1 ? "s" : ""} pending`} />
                <div className="bg-muted/50 rounded-xl p-3 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Payment Rate</p>
                  <p className="text-lg font-bold text-foreground">{allNet > 0 ? Math.round((allPaid / allNet) * 100) : 0}%</p>
                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${allNet > 0 ? Math.min(100, (allPaid / allNet) * 100) : 0}%` }} />
                  </div>
                </div>
              </div>

              {/* Tax Deduction Detail */}
              {(allWHT > 0 || allVAT > 0) && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Tax Deduction Summary</h3>
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Invoice #</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Gross Amount</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">WHT %</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">WHT Amt</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">VAT %</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">VAT Amt</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Net Payable</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {allInvoices.filter(p => (p.withholding_tax_amount || 0) > 0 || (p.vat_amount || 0) > 0).map(p => {
                          const net = (p.amount || 0) - (p.withholding_tax_amount || 0) + (p.vat_amount || 0);
                          return (
                            <tr key={p.id} className="hover:bg-muted/20">
                              <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{p.invoice_number || "—"}</td>
                              <td className="px-4 py-2 text-xs text-foreground max-w-[160px] truncate">{p.description}</td>
                              <td className="px-4 py-2 text-right text-xs font-semibold">₱{fmt(p.amount)}</td>
                              <td className="px-4 py-2 text-right text-xs text-amber-600">{p.withholding_tax_percentage || 0}%</td>
                              <td className="px-4 py-2 text-right text-xs text-amber-600 font-semibold">₱{fmt(p.withholding_tax_amount)}</td>
                              <td className="px-4 py-2 text-right text-xs text-blue-600">{p.vat_percentage || 0}%</td>
                              <td className="px-4 py-2 text-right text-xs text-blue-600 font-semibold">₱{fmt(p.vat_amount)}</td>
                              <td className="px-4 py-2 text-right text-xs font-bold text-foreground">₱{fmt(net)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-muted/20 border-t border-border">
                        <tr>
                          <td colSpan={2} className="px-4 py-2 text-xs font-semibold text-right text-foreground">Total</td>
                          <td className="px-4 py-2 text-right text-xs font-bold">₱{fmt(allGross)}</td>
                          <td />
                          <td className="px-4 py-2 text-right text-xs font-bold text-amber-600">₱{fmt(allWHT)}</td>
                          <td />
                          <td className="px-4 py-2 text-right text-xs font-bold text-blue-600">₱{fmt(allVAT)}</td>
                          <td className="px-4 py-2 text-right text-xs font-bold text-foreground">₱{fmt(allNet)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* All Invoices */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">All Invoices ({allInvoices.length})</h3>
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Invoice #</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Project</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Due Date</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Gross</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">WHT</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Net</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Paid</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Balance</th>
                        <th className="px-4 py-2 w-8 no-print"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {allInvoices.map(p => {
                        const net = (p.amount || 0) - (p.withholding_tax_amount || 0) + (p.vat_amount || 0);
                        const bal = Math.max(0, net - (p.amount_paid || 0));
                        return (
                          <tr key={p.id} className="hover:bg-muted/20">
                            <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{p.invoice_number || "—"}</td>
                            <td className="px-4 py-2 text-xs text-foreground max-w-[150px] truncate">{p.description}</td>
                            <td className="px-4 py-2 text-xs text-muted-foreground">{p.project_name || "—"}</td>
                            <td className="px-4 py-2 text-xs text-muted-foreground">{p.due_date ? format(new Date(p.due_date), "MMM d, yyyy") : "—"}</td>
                            <td className="px-4 py-2"><StatusBadge status={p.status} /></td>
                            <td className="px-4 py-2 text-right text-xs text-foreground">₱{fmt(p.amount)}</td>
                            <td className="px-4 py-2 text-right text-xs text-amber-600">{p.withholding_tax_amount > 0 ? `−₱${fmt(p.withholding_tax_amount)}` : "—"}</td>
                            <td className="px-4 py-2 text-right text-xs font-semibold text-foreground">₱{fmt(net)}</td>
                            <td className="px-4 py-2 text-right text-xs text-primary">₱{fmt(p.amount_paid)}</td>
                            <td className="px-4 py-2 text-right text-xs font-bold text-foreground">₱{fmt(bal)}</td>
                            <td className="px-4 py-2 text-center no-print">
                              <button onClick={() => toggleExclude(p.id)} className="text-muted-foreground hover:text-destructive" title="Remove from statement">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-muted/20 border-t border-border">
                      <tr>
                        <td colSpan={5} className="px-4 py-2 text-xs font-semibold text-right text-foreground">Total</td>
                        <td className="px-4 py-2 text-right text-xs font-bold">₱{fmt(allGross)}</td>
                        <td className="px-4 py-2 text-right text-xs font-bold text-amber-600">−₱{fmt(allWHT)}</td>
                        <td className="px-4 py-2 text-right text-xs font-bold">₱{fmt(allNet)}</td>
                        <td className="px-4 py-2 text-right text-xs font-bold text-primary">₱{fmt(allPaid)}</td>
                        <td className="px-4 py-2 text-right text-xs font-bold text-foreground">₱{fmt(allOutstanding)}</td>
                        <td className="no-print" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* All Payments */}
              {allPayments.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Payment History ({allPayments.length})</h3>
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
                        {allPayments.map((ph, i) => (
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
                          <td colSpan={5} className="px-4 py-2 text-xs font-semibold text-right text-foreground">Total Payments</td>
                          <td className="px-4 py-2 text-right text-xs font-bold text-primary">₱{fmt(allPaid)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── MONTHLY REPORT ── */}
          {view === "monthly" && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <SummaryCard label="Opening Balance" value={openingBalance} color="text-foreground" />
                <SummaryCard label="Net Billed This Month" value={monthNet} color="text-chart-2" sub={`WHT: −₱${fmt(monthWHT)} · VAT: +₱${fmt(monthVAT)}`} />
                <SummaryCard label="Paid This Month" value={monthPaidAmt} color="text-primary" />
                <SummaryCard label="Closing Balance" value={closingBalance} color={closingBalance > 0 ? "text-destructive" : "text-primary"} />
              </div>

              {/* Invoices this month */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Invoices This Period</h3>
                {monthInvoices.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center border border-border rounded-xl">No invoices for this period.</p>
                ) : (
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Invoice #</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Due Date</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Gross</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">WHT</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Net</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Paid</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Balance</th>
                          <th className="px-4 py-2 w-8 no-print"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {monthInvoices.map(p => {
                          const net = (p.amount || 0) - (p.withholding_tax_amount || 0) + (p.vat_amount || 0);
                          const bal = Math.max(0, net - (p.amount_paid || 0));
                          return (
                            <tr key={p.id} className="hover:bg-muted/20">
                              <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{p.invoice_number || "—"}</td>
                              <td className="px-4 py-2 text-xs text-foreground max-w-[160px] truncate">{p.description}</td>
                              <td className="px-4 py-2 text-xs text-muted-foreground">{p.due_date ? format(new Date(p.due_date), "MMM d, yyyy") : "—"}</td>
                              <td className="px-4 py-2"><StatusBadge status={p.status} /></td>
                              <td className="px-4 py-2 text-right text-xs text-foreground">₱{fmt(p.amount)}</td>
                              <td className="px-4 py-2 text-right text-xs text-amber-600">{p.withholding_tax_amount > 0 ? `−₱${fmt(p.withholding_tax_amount)}` : "—"}</td>
                              <td className="px-4 py-2 text-right text-xs font-semibold text-foreground">₱{fmt(net)}</td>
                              <td className="px-4 py-2 text-right text-xs text-primary">₱{fmt(p.amount_paid)}</td>
                              <td className="px-4 py-2 text-right text-xs font-bold text-foreground">₱{fmt(bal)}</td>
                              <td className="px-4 py-2 text-center no-print">
                                <button onClick={() => toggleExclude(p.id)} className="text-muted-foreground hover:text-destructive">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-muted/20 border-t border-border">
                        <tr>
                          <td colSpan={4} className="px-4 py-2 text-xs font-semibold text-right text-foreground">Total</td>
                          <td className="px-4 py-2 text-right text-xs font-bold">₱{fmt(monthGross)}</td>
                          <td className="px-4 py-2 text-right text-xs font-bold text-amber-600">−₱{fmt(monthWHT)}</td>
                          <td className="px-4 py-2 text-right text-xs font-bold">₱{fmt(monthNet)}</td>
                          <td className="px-4 py-2 text-right text-xs font-bold text-primary">₱{fmt(monthInvoices.reduce((s,p)=>s+(p.amount_paid||0),0))}</td>
                          <td className="px-4 py-2 text-right text-xs font-bold">₱{fmt(monthInvoices.reduce((s,p)=>s+Math.max(0,(p.amount||0)-(p.withholding_tax_amount||0)+(p.vat_amount||0)-(p.amount_paid||0)),0))}</td>
                          <td className="no-print" />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* Payments this month */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Payments This Period</h3>
                {monthPayments.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center border border-border rounded-xl">No payments recorded for this period.</p>
                ) : (
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Invoice #</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Method</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reference</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {monthPayments.map((ph, i) => (
                          <tr key={i} className="hover:bg-muted/20">
                            <td className="px-4 py-2 text-xs text-muted-foreground">{ph.payment_date ? format(new Date(ph.payment_date), "MMM d, yyyy") : "—"}</td>
                            <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{ph.invoice_number || "—"}</td>
                            <td className="px-4 py-2 text-xs text-foreground max-w-[160px] truncate">{ph.notes || "—"}</td>
                            <td className="px-4 py-2 text-xs text-muted-foreground capitalize">{ph.payment_method?.replace("_", " ") || "—"}</td>
                            <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{ph.reference || "—"}</td>
                            <td className="px-4 py-2 text-right text-xs font-bold text-primary">₱{fmt(ph.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-muted/20 border-t border-border">
                        <tr>
                          <td colSpan={5} className="px-4 py-2 text-xs font-semibold text-right text-foreground">Total Payments</td>
                          <td className="px-4 py-2 text-right text-xs font-bold text-primary">₱{fmt(monthPaidAmt)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Excluded invoices restore (no-print) */}
          {excludedIds.size > 0 && (
            <div className="no-print bg-muted/30 border border-dashed border-border rounded-xl p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                {excludedIds.size} invoice{excludedIds.size > 1 ? "s" : ""} removed from statement
                <button className="ml-3 text-primary underline" onClick={() => setExcludedIds(new Set())}>Restore all</button>
              </p>
              <div className="flex flex-wrap gap-2">
                {supplierPayables.filter(p => excludedIds.has(p.id)).map(p => (
                  <button key={p.id} onClick={() => toggleExclude(p.id)}
                    className="text-xs bg-card border border-border rounded-full px-3 py-1 text-muted-foreground hover:text-foreground flex items-center gap-1">
                    {p.invoice_number || p.description || "Invoice"} <X className="w-3 h-3" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-border pt-4 text-xs text-muted-foreground flex items-center justify-between">
            <span>
              Outstanding Balance (all time): <strong className="text-foreground">₱{fmt(allOutstanding)}</strong>
              {allWHT > 0 && <> &nbsp;·&nbsp; Total WHT Deducted: <strong className="text-amber-600">₱{fmt(allWHT)}</strong></>}
            </span>
            <span>Generated: {format(new Date(), "MMM d, yyyy")}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}