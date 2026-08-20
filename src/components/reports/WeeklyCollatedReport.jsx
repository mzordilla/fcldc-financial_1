import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, startOfWeek, endOfWeek } from "date-fns";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, CalendarDays } from "lucide-react";
import { fetchAllTransactions } from "@/lib/fetchAllTransactions";
import { normalizeLoan } from "@/lib/normalizeLoan";

const fmt = (v) => `₱${(v || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

function Stat({ label, value, colorClass }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-xl font-bold ${colorClass || "text-foreground"}`}>{value}</p>
    </div>
  );
}

export default function WeeklyCollatedReport() {
  const [weekStart, setWeekStart] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"));
  const from = weekStart;
  const to = format(endOfWeek(new Date(weekStart), { weekStartsOn: 1 }), "yyyy-MM-dd");

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => fetchAllTransactions("-date"),
  });
  const { data: receivables = [] } = useQuery({
    queryKey: ["receivables"],
    queryFn: () => base44.entities.Receivable.list("-created_date", 5000),
  });
  const { data: payables = [] } = useQuery({
    queryKey: ["payables"],
    queryFn: () => base44.entities.Payable.list("-created_date", 5000),
  });
  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["purchaseorders"],
    queryFn: () => base44.entities.PurchaseOrder.list("-created_date", 5000),
  });
  const { data: paymentRequests = [] } = useQuery({
    queryKey: ["paymentrequests"],
    queryFn: () => base44.entities.PaymentRequest.list("-created_date", 5000),
  });
  const { data: loans = [] } = useQuery({
    queryKey: ["bankloans"],
    queryFn: () => base44.entities.BankLoan.list("-created_date", 200),
  });
  const { data: wcLoans = [] } = useQuery({
    queryKey: ["workingcapitalloans"],
    queryFn: () => base44.entities.WorkingCapitalLoan.list("-created_date", 200),
  });
  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bankaccounts"],
    queryFn: () => base44.entities.BankAccount.list("-created_date", 100),
  });

  const weekTx = useMemo(
    () => transactions.filter(t => t.date && t.date >= from && t.date <= to),
    [transactions, from, to]
  );

  const income = weekTx.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
  const expenses = weekTx.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
  const net = income - expenses;

  const cashBalance = bankAccounts.reduce((s, a) => s + (a.current_balance || 0), 0);

  const outstandingReceivables = receivables.filter(r => r.status !== "collected" && r.status !== "paid")
    .reduce((s, r) => s + ((r.amount || 0) - (r.amount_collected || 0)), 0);
  const outstandingPayables = payables.filter(p => p.status !== "paid")
    .reduce((s, p) => s + ((p.amount || 0) - (p.amount_paid || 0)), 0);

  const weekPOs = purchaseOrders.filter(po => po.requested_date && po.requested_date >= from && po.requested_date <= to);
  const pendingPOs = purchaseOrders.filter(po => po.approval_status === "pending");

  const weekPRs = paymentRequests.filter(pr => pr.created_date && pr.created_date.slice(0, 10) >= from && pr.created_date.slice(0, 10) <= to);
  const paidThisWeek = weekPRs.filter(pr => pr.approval_status === "paid").reduce((s, pr) => s + (pr.amount || 0), 0);
  const pendingApprovals = paymentRequests.filter(pr => pr.approval_status === "pending").length;

  const allLoans = [...loans, ...wcLoans].map(normalizeLoan).filter(l => l.status === "active");
  const totalLoanBalance = allLoans.reduce((s, l) => s + (l.outstanding_balance ?? l.principal_balance ?? Math.max(0, (l.total_amount || 0) - (l.amount_paid || 0)) ?? 0), 0);
  const weeklyLoanPayments = allLoans.reduce((s, l) => s + (l.monthly_payment || 0), 0) / 4.33;

  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    const rows = [
      ["Weekly Collated Report"],
      [`Period: ${format(new Date(from), "MMM d, yyyy")} – ${format(new Date(to), "MMM d, yyyy")}`],
      [],
      ["Cash Flow"],
      ["Revenue", income],
      ["Expenses", expenses],
      ["Net Income", net],
      [],
      ["Cash & Bank"],
      ["Total Cash Balance", cashBalance],
      [],
      ["Receivables & Payables"],
      ["Outstanding Receivables", outstandingReceivables],
      ["Outstanding Payables", outstandingPayables],
      [],
      ["Purchase Orders"],
      ["New POs This Week", weekPOs.length],
      ["Pending PO Approvals", pendingPOs.length],
      [],
      ["Payment Approvals"],
      ["Paid This Week", paidThisWeek],
      ["Pending Payment Approvals", pendingApprovals],
      [],
      ["Working Capital / Loans"],
      ["Total Outstanding Loan Balance", totalLoanBalance],
      ["Est. Weekly Loan Payments", weeklyLoanPayments],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Weekly Report");
    XLSX.writeFile(wb, `Weekly_Collated_Report_${from}_to_${to}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
          <label className="text-xs text-muted-foreground">Week of</label>
          <input
            type="date"
            value={weekStart}
            onChange={e => setWeekStart(format(startOfWeek(new Date(e.target.value), { weekStartsOn: 1 }), "yyyy-MM-dd"))}
            className="h-9 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <span className="text-sm text-muted-foreground">
            {format(new Date(from), "MMM d")} – {format(new Date(to), "MMM d, yyyy")}
          </span>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
        </Button>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Cash Flow</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Stat label="Revenue" value={fmt(income)} colorClass="text-primary" />
          <Stat label="Expenses" value={fmt(expenses)} colorClass="text-destructive" />
          <Stat label="Net Income" value={fmt(net)} colorClass={net >= 0 ? "text-primary" : "text-destructive"} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Cash & Bank</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Stat label="Total Cash Balance" value={fmt(cashBalance)} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Receivables & Payables</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Stat label="Outstanding Receivables" value={fmt(outstandingReceivables)} colorClass="text-chart-2" />
          <Stat label="Outstanding Payables" value={fmt(outstandingPayables)} colorClass="text-chart-3" />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Purchase Orders</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Stat label="New POs This Week" value={weekPOs.length} />
          <Stat label="Pending PO Approvals" value={pendingPOs.length} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Payment Approvals</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Stat label="Paid This Week" value={fmt(paidThisWeek)} colorClass="text-primary" />
          <Stat label="Pending Approvals" value={pendingApprovals} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Working Capital / Loans</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Stat label="Total Outstanding Loan Balance" value={fmt(totalLoanBalance)} colorClass="text-destructive" />
          <Stat label="Est. Weekly Loan Payments" value={fmt(weeklyLoanPayments)} />
        </div>
      </div>
    </div>
  );
}