import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";
import { format, parseISO } from "date-fns";

const fmt = (v) => `₱${(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const fmtSigned = (v) => (v < 0 ? `-₱${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `₱${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`);

function Row({ label, value, isSub, isTotal, colorClass }) {
  return (
    <div className={`flex justify-between py-2 ${isSub ? "pl-6" : ""} ${isTotal ? "border-t border-border font-semibold" : "border-b border-border/30"}`}>
      <span className={`text-sm ${isSub ? "text-muted-foreground" : "text-foreground"}`}>{label}</span>
      <span className={`text-sm font-medium ${colorClass || ""}`}>{fmt(value)}</span>
    </div>
  );
}

function SectionHeader({ label }) {
  return <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-5 mb-1">{label}</p>;
}

export default function IncomeStatementReport({ dateFrom, dateTo }) {
  const { data: accounts = [] } = useQuery({
    queryKey: ["chartofaccounts"],
    queryFn: () => base44.entities.ChartOfAccount.list("account_code", 200),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => base44.entities.Transaction.list("-date", 1000),
  });

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (!t.date) return false;
      if (dateFrom && t.date < dateFrom) return false;
      if (dateTo && t.date > dateTo) return false;
      return true;
    });
  }, [transactions, dateFrom, dateTo]);

  // Build income statement grouped by COA
  const statement = useMemo(() => {
    const incomeAccounts = accounts.filter(a => a.account_type === "income");
    const expenseAccounts = accounts.filter(a => a.account_type === "expense");

    // Map transactions to accounts by chart_of_account name or category fallback
    const txByAccount = {};
    filtered.forEach(t => {
      const key = t.chart_of_account || null;
      if (!key) return;
      if (!txByAccount[key]) txByAccount[key] = [];
      txByAccount[key].push(t);
    });

    // Also group by category for transactions without COA link
    const txByCategory = {};
    filtered.forEach(t => {
      if (t.chart_of_account) return; // already handled
      const key = t.category || "other";
      if (!txByCategory[key]) txByCategory[key] = [];
      txByCategory[key].push(t);
    });

    // Income lines
    const incomeLines = [];
    let totalIncome = 0;

    incomeAccounts.forEach(acc => {
      const txs = txByAccount[acc.account_name] || [];
      const amount = txs.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
      if (amount > 0) {
        incomeLines.push({ label: `${acc.account_code ? acc.account_code + " · " : ""}${acc.account_name}`, amount });
        totalIncome += amount;
      }
    });

    // Remaining income not mapped to COA
    const unmappedIncome = filtered
      .filter(t => t.type === "income" && !t.chart_of_account)
      .reduce((s, t) => s + (t.amount || 0), 0);
    if (unmappedIncome > 0) {
      incomeLines.push({ label: "Other Income (unclassified)", amount: unmappedIncome });
      totalIncome += unmappedIncome;
    }

    // Expense lines
    const expenseLines = [];
    let totalExpenses = 0;

    expenseAccounts.forEach(acc => {
      const txs = txByAccount[acc.account_name] || [];
      const amount = txs.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
      if (amount > 0) {
        expenseLines.push({ label: `${acc.account_code ? acc.account_code + " · " : ""}${acc.account_name}`, amount });
        totalExpenses += amount;
      }
    });

    // Remaining expenses not mapped to COA
    const unmappedExpenses = filtered
      .filter(t => t.type === "expense" && !t.chart_of_account)
      .reduce((s, t) => s + (t.amount || 0), 0);
    if (unmappedExpenses > 0) {
      expenseLines.push({ label: "Other Expenses (unclassified)", amount: unmappedExpenses });
      totalExpenses += unmappedExpenses;
    }

    const grossProfit = totalIncome - totalExpenses;
    const netIncome = grossProfit;

    return { incomeLines, expenseLines, totalIncome, totalExpenses, grossProfit, netIncome };
  }, [accounts, filtered]);

  const periodLabel = dateFrom && dateTo
    ? `${format(parseISO(dateFrom), "MMMM d, yyyy")} – ${format(parseISO(dateTo), "MMMM d, yyyy")}`
    : "All Periods";

  const handleExport = () => {
    const rows = [
      ["INCOME STATEMENT", periodLabel],
      [],
      ["REVENUE"],
      ...statement.incomeLines.map(l => [l.label, l.amount]),
      ["Total Revenue", statement.totalIncome],
      [],
      ["EXPENSES"],
      ...statement.expenseLines.map(l => [l.label, l.amount]),
      ["Total Expenses", statement.totalExpenses],
      [],
      ["NET INCOME", statement.netIncome],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Income Statement");
    XLSX.writeFile(wb, `Income_Statement_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Income Statement</h2>
          <p className="text-sm text-muted-foreground">{periodLabel}</p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
        </Button>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-primary/20 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-primary">{fmt(statement.totalIncome)}</p>
        </div>
        <div className="bg-card border border-destructive/20 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Expenses</p>
          <p className="text-2xl font-bold text-destructive">{fmt(statement.totalExpenses)}</p>
        </div>
        <div className={`bg-card border rounded-2xl p-4 ${statement.netIncome >= 0 ? "border-primary/20" : "border-destructive/20"}`}>
          <p className="text-xs text-muted-foreground mb-1">Net Income</p>
          <p className={`text-2xl font-bold ${statement.netIncome >= 0 ? "text-primary" : "text-destructive"}`}>
            {fmtSigned(statement.netIncome)}
          </p>
          {statement.totalIncome > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((statement.netIncome / statement.totalIncome) * 100)}% margin
            </p>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 max-w-2xl">
        {/* Revenue */}
        <SectionHeader label="Revenue" />
        {statement.incomeLines.length === 0 && (
          <p className="text-sm text-muted-foreground pl-6 py-2">No revenue recorded for this period.</p>
        )}
        {statement.incomeLines.map((l, i) => (
          <Row key={i} label={l.label} value={l.amount} isSub />
        ))}
        <Row label="Total Revenue" value={statement.totalIncome} isTotal colorClass="text-primary" />

        {/* Expenses */}
        <SectionHeader label="Expenses" />
        {statement.expenseLines.length === 0 && (
          <p className="text-sm text-muted-foreground pl-6 py-2">No expenses recorded for this period.</p>
        )}
        {statement.expenseLines.map((l, i) => (
          <Row key={i} label={l.label} value={l.amount} isSub />
        ))}
        <Row label="Total Expenses" value={statement.totalExpenses} isTotal colorClass="text-destructive" />

        {/* Net Income */}
        <div className="flex justify-between items-center mt-5 pt-4 border-t-2 border-border">
          <span className="font-bold text-foreground text-base">Net Income</span>
          <span className={`text-xl font-bold ${statement.netIncome >= 0 ? "text-primary" : "text-destructive"}`}>
            {fmtSigned(statement.netIncome)}
          </span>
        </div>
      </div>
    </div>
  );
}