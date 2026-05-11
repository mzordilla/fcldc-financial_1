import { useMemo } from "react";
import { format, parseISO, differenceInDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, AlertTriangle } from "lucide-react";
import * as XLSX from "xlsx";

const fmt = (v) => `₱${(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const TYPE_LABELS = {
  loan: "Loan",
  credit_line: "Credit Line",
  equipment_financing: "Equipment Financing",
  vendor_credit: "Vendor Credit",
  mortgage: "Mortgage",
  other: "Other",
};

const STATUS_STYLES = {
  active: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  paid_off: "bg-primary/10 text-primary border-primary/20",
  defaulted: "bg-destructive/10 text-destructive border-destructive/20",
};

function getDaysUntilDue(due_date) {
  if (!due_date) return null;
  return differenceInDays(parseISO(due_date), new Date());
}

function DueBadge({ due_date }) {
  const days = getDaysUntilDue(due_date);
  if (days === null) return <span className="text-muted-foreground text-xs">—</span>;
  if (days < 0) return <span className="text-xs font-medium text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Overdue</span>;
  if (days <= 30) return <span className="text-xs font-medium text-amber-600">{days}d left</span>;
  return <span className="text-xs text-muted-foreground">{format(parseISO(due_date), "MMM d, yyyy")}</span>;
}

function SummaryCard({ label, value, sub, colorClass }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-xl font-bold ${colorClass || "text-foreground"}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function WorkingCapitalLoansReport({ loans = [] }) {
  const active = loans.filter(l => l.status === "active");
  const paidOff = loans.filter(l => l.status === "paid_off");
  const defaulted = loans.filter(l => l.status === "defaulted");

  const totalOutstanding = active.reduce((s, l) => s + Math.max(0, (l.total_amount || 0) - (l.amount_paid || 0)), 0);
  const totalGranted = active.reduce((s, l) => s + (l.amount_granted || l.total_amount || 0), 0);
  const totalAvailed = active.reduce((s, l) => s + (l.amount_availed || 0), 0);
  const availableCredit = Math.max(0, totalGranted - totalAvailed);
  const totalMonthly = active.reduce((s, l) => s + (l.monthly_payment || 0), 0);
  const totalInterest1yr = active.reduce((s, l) => s + (l.interest_accrued_1yr || 0), 0);

  // Group by type
  const byType = useMemo(() => {
    const map = {};
    loans.forEach(l => {
      const t = l.type || "other";
      if (!map[t]) map[t] = [];
      map[t].push(l);
    });
    return map;
  }, [loans]);

  // Upcoming maturities (next 90 days)
  const upcoming = active
    .filter(l => l.due_date)
    .map(l => ({ ...l, daysLeft: getDaysUntilDue(l.due_date) }))
    .filter(l => l.daysLeft !== null && l.daysLeft <= 90)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  function exportToExcel() {
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryRows = [
      ["Working Capital Loans Report", "", format(new Date(), "MMMM d, yyyy")],
      [],
      ["Summary"],
      ["Active Loans", active.length],
      ["Total Outstanding", totalOutstanding],
      ["Total Granted", totalGranted],
      ["Available Credit", availableCredit],
      ["Monthly Payments", totalMonthly],
      ["1-Year Interest Accrual", totalInterest1yr],
      ["Paid Off", paidOff.length],
      ["Defaulted", defaulted.length],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), "Summary");

    // All loans detail
    const headers = ["Creditor", "Type", "Status", "Total Amount", "Amount Paid", "Outstanding", "Amount Granted", "Amount Availed", "Interest Rate (%)", "Monthly Payment", "1-Yr Interest", "Loan Granted", "Loan Availed", "Due Date"];
    const rows = [headers, ...loans.map(l => [
      l.creditor,
      TYPE_LABELS[l.type] || l.type,
      l.status,
      l.total_amount || 0,
      l.amount_paid || 0,
      Math.max(0, (l.total_amount || 0) - (l.amount_paid || 0)),
      l.amount_granted || "",
      l.amount_availed || "",
      l.interest_rate || "",
      l.monthly_payment || 0,
      l.interest_accrued_1yr || "",
      l.loan_granted || "",
      l.loan_availed || "",
      l.due_date || "",
    ])];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "All Loans");

    XLSX.writeFile(wb, `WC_Loans_Report_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Working Capital Loans</h2>
        <Button variant="outline" size="sm" onClick={exportToExcel}>
          <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
        </Button>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCard label="Active Loans" value={active.length} />
        <SummaryCard label="Total Outstanding" value={fmt(totalOutstanding)} colorClass="text-destructive" />
        <SummaryCard label="Total Granted" value={fmt(totalGranted)} />
        <SummaryCard label="Available Credit" value={fmt(availableCredit)} colorClass="text-primary" />
        <SummaryCard label="Monthly Payments" value={fmt(totalMonthly)} />
        <SummaryCard label="1-Yr Interest" value={fmt(totalInterest1yr)} />
      </div>

      {/* Status breakdown */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-chart-2/5 border border-chart-2/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-chart-2">{active.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Active</p>
        </div>
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">{paidOff.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Paid Off</p>
        </div>
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-destructive">{defaulted.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Defaulted</p>
        </div>
      </div>

      {/* Loans by Type */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Breakdown by Loan Type</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Type</th>
              <th className="text-right px-5 py-2.5 text-xs font-medium text-muted-foreground">Count</th>
              <th className="text-right px-5 py-2.5 text-xs font-medium text-muted-foreground">Total Amount</th>
              <th className="text-right px-5 py-2.5 text-xs font-medium text-muted-foreground">Outstanding</th>
              <th className="text-right px-5 py-2.5 text-xs font-medium text-muted-foreground">Monthly</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(byType).map(([type, items]) => {
              const outstanding = items.reduce((s, l) => s + Math.max(0, (l.total_amount || 0) - (l.amount_paid || 0)), 0);
              const totalAmt = items.reduce((s, l) => s + (l.total_amount || 0), 0);
              const monthly = items.reduce((s, l) => s + (l.monthly_payment || 0), 0);
              return (
                <tr key={type} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="px-5 py-3 font-medium">{TYPE_LABELS[type] || type}</td>
                  <td className="px-5 py-3 text-right">{items.length}</td>
                  <td className="px-5 py-3 text-right">{fmt(totalAmt)}</td>
                  <td className="px-5 py-3 text-right text-destructive">{fmt(outstanding)}</td>
                  <td className="px-5 py-3 text-right">{fmt(monthly)}</td>
                </tr>
              );
            })}
            {Object.keys(byType).length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No loans recorded</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Upcoming Maturities */}
      {upcoming.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">Upcoming Maturities (Next 90 Days)</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Creditor</th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Type</th>
                <th className="text-right px-5 py-2.5 text-xs font-medium text-muted-foreground">Outstanding</th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map(l => (
                <tr key={l.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="px-5 py-3 font-medium">{l.creditor}</td>
                  <td className="px-5 py-3 text-muted-foreground">{TYPE_LABELS[l.type] || l.type}</td>
                  <td className="px-5 py-3 text-right text-destructive">{fmt(Math.max(0, (l.total_amount || 0) - (l.amount_paid || 0)))}</td>
                  <td className="px-5 py-3"><DueBadge due_date={l.due_date} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Full Loans Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">All Loans</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Creditor</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Type</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Total Amt</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Paid</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Outstanding</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Rate</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Monthly</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Due</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {loans.length === 0 && (
                <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">No loans recorded</td></tr>
              )}
              {loans.map(l => (
                <tr key={l.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{l.creditor}</td>
                  <td className="px-4 py-3 text-muted-foreground">{TYPE_LABELS[l.type] || l.type}</td>
                  <td className="px-4 py-3 text-right">{fmt(l.total_amount)}</td>
                  <td className="px-4 py-3 text-right text-primary">{fmt(l.amount_paid)}</td>
                  <td className="px-4 py-3 text-right text-destructive">{fmt(Math.max(0, (l.total_amount || 0) - (l.amount_paid || 0)))}</td>
                  <td className="px-4 py-3 text-right">{l.interest_rate ? `${l.interest_rate}%` : "—"}</td>
                  <td className="px-4 py-3 text-right">{fmt(l.monthly_payment)}</td>
                  <td className="px-4 py-3"><DueBadge due_date={l.due_date} /></td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-xs ${STATUS_STYLES[l.status] || ""}`}>
                      {(l.status || "active").replace(/_/g, " ")}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}