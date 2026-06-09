import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileSpreadsheet, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";
import { format, parseISO } from "date-fns";

const fmt = (v) => `₱${(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const fmtSigned = (v) => (v < 0 ? `-₱${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `₱${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`);

function SectionHeader({ label }) {
  return <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-5 mb-1">{label}</p>;
}

function ExpandableRow({ label, amount, transactions = [], colorClass }) {
  const [open, setOpen] = useState(false);
  const hasDetail = transactions.length > 0;

  // Group transactions by month
  const monthlyBreakdown = useMemo(() => {
    const map = {};
    transactions.forEach(t => {
      if (!t.date) return;
      const key = format(parseISO(t.date), "yyyy-MM");
      if (!map[key]) map[key] = { label: format(parseISO(t.date), "MMMM yyyy"), amount: 0, count: 0 };
      map[key].amount += t.amount || 0;
      map[key].count += 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([, v]) => v);
  }, [transactions]);

  return (
    <>
      <div
        className={`flex justify-between py-2 pl-6 border-b border-border/30 ${hasDetail ? "cursor-pointer hover:bg-muted/30" : ""}`}
        onClick={() => hasDetail && setOpen(o => !o)}
      >
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          {hasDetail ? (
            open ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
          ) : <span className="w-3.5" />}
          {label}
        </span>
        <span className={`text-sm font-medium ${colorClass || ""}`}>{fmt(amount)}</span>
      </div>
      {open && (
        <div className="bg-muted/20 border-b border-border/30">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border/30">
                <th className="pl-10 pr-3 py-1.5 text-left font-medium">Month</th>
                <th className="px-3 py-1.5 text-left font-medium"># Transactions</th>
                <th className="px-3 py-1.5 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {monthlyBreakdown.map((m, i) => (
                <tr key={i} className="border-b border-border/20 hover:bg-muted/30">
                  <td className="pl-10 pr-3 py-1.5 text-foreground font-medium whitespace-nowrap">{m.label}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{m.count} txn{m.count !== 1 ? "s" : ""}</td>
                  <td className={`px-3 py-1.5 text-right font-semibold ${colorClass || ""}`}>{fmt(m.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function TotalRow({ label, value, colorClass }) {
  return (
    <div className="flex justify-between py-2 border-t border-border font-semibold">
      <span className="text-sm text-foreground">{label}</span>
      <span className={`text-sm font-medium ${colorClass || ""}`}>{fmt(value)}</span>
    </div>
  );
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

  const statement = useMemo(() => {
    const incomeAccounts = accounts.filter(a => a.account_type === "income");
    const expenseAccounts = accounts.filter(a => a.account_type === "expense");

    const txByAccount = {};
    filtered.forEach(t => {
      const key = t.chart_of_account || null;
      if (!key) return;
      if (!txByAccount[key]) txByAccount[key] = [];
      txByAccount[key].push(t);
    });

    // Income lines
    const incomeLines = [];
    let totalIncome = 0;

    incomeAccounts.forEach(acc => {
      const txs = (txByAccount[acc.account_name] || []).filter(t => t.type === "income");
      const amount = txs.reduce((s, t) => s + (t.amount || 0), 0);
      if (amount > 0) {
        incomeLines.push({ label: `${acc.account_code ? acc.account_code + " · " : ""}${acc.account_name}`, amount, transactions: txs });
        totalIncome += amount;
      }
    });

    const unmappedIncomeTxs = filtered.filter(t => t.type === "income" && !t.chart_of_account);
    const unmappedIncome = unmappedIncomeTxs.reduce((s, t) => s + (t.amount || 0), 0);
    if (unmappedIncome > 0) {
      incomeLines.push({ label: "Other Income (unclassified)", amount: unmappedIncome, transactions: unmappedIncomeTxs });
      totalIncome += unmappedIncome;
    }

    // Expense lines
    const expenseLines = [];
    let totalExpenses = 0;

    expenseAccounts.forEach(acc => {
      const txs = (txByAccount[acc.account_name] || []).filter(t => t.type === "expense");
      const amount = txs.reduce((s, t) => s + (t.amount || 0), 0);
      if (amount > 0) {
        expenseLines.push({ label: `${acc.account_code ? acc.account_code + " · " : ""}${acc.account_name}`, amount, transactions: txs });
        totalExpenses += amount;
      }
    });

    const unmappedExpenseTxs = filtered.filter(t => t.type === "expense" && !t.chart_of_account);
    const unmappedExpenses = unmappedExpenseTxs.reduce((s, t) => s + (t.amount || 0), 0);
    if (unmappedExpenses > 0) {
      expenseLines.push({ label: "Other Expenses (unclassified)", amount: unmappedExpenses, transactions: unmappedExpenseTxs });
      totalExpenses += unmappedExpenses;
    }

    const netIncome = totalIncome - totalExpenses;
    return { incomeLines, expenseLines, totalIncome, totalExpenses, netIncome };
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

      <div className="bg-card border border-border rounded-2xl p-5 max-w-3xl">
        <p className="text-xs text-muted-foreground italic mb-3">Click any line item to see transaction details</p>

        <SectionHeader label="Revenue" />
        {statement.incomeLines.length === 0 && (
          <p className="text-sm text-muted-foreground pl-6 py-2">No revenue recorded for this period.</p>
        )}
        {statement.incomeLines.map((l, i) => (
          <ExpandableRow key={i} label={l.label} amount={l.amount} transactions={l.transactions} colorClass="text-primary" />
        ))}
        <TotalRow label="Total Revenue" value={statement.totalIncome} colorClass="text-primary" />

        <SectionHeader label="Expenses" />
        {statement.expenseLines.length === 0 && (
          <p className="text-sm text-muted-foreground pl-6 py-2">No expenses recorded for this period.</p>
        )}
        {statement.expenseLines.map((l, i) => (
          <ExpandableRow key={i} label={l.label} amount={l.amount} transactions={l.transactions} colorClass="text-destructive" />
        ))}
        <TotalRow label="Total Expenses" value={statement.totalExpenses} colorClass="text-destructive" />

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