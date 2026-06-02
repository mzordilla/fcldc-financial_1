import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileSpreadsheet, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as XLSX from "xlsx";
import {
  format, parseISO, subMonths, subQuarters, subYears,
  startOfMonth, endOfMonth, startOfQuarter, endOfQuarter,
  startOfYear, endOfYear, eachMonthOfInterval, eachQuarterOfInterval
} from "date-fns";

const fmt = (v) => `₱${(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const fmtSigned = (v) => (v < 0 ? `-₱${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `₱${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
const pct = (n, d) => d === 0 ? "—" : `${Math.round((n / d) * 100)}%`;

function computeStatement(accounts, transactions, dateFrom, dateTo) {
  const filtered = transactions.filter(t => {
    if (!t.date) return false;
    if (dateFrom && t.date < dateFrom) return false;
    if (dateTo && t.date > dateTo) return false;
    return true;
  });

  const incomeAccounts = accounts.filter(a => a.account_type === "income");
  const expenseAccounts = accounts.filter(a => a.account_type === "expense");

  const txByAccount = {};
  filtered.forEach(t => {
    const key = t.chart_of_account;
    if (!key) return;
    if (!txByAccount[key]) txByAccount[key] = [];
    txByAccount[key].push(t);
  });

  const incomeLines = [];
  let totalIncome = 0;
  incomeAccounts.forEach(acc => {
    const txs = txByAccount[acc.account_name] || [];
    const amount = txs.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
    if (amount > 0) {
      incomeLines.push({ label: `${acc.account_code ? acc.account_code + " · " : ""}${acc.account_name}`, amount, accountName: acc.account_name });
      totalIncome += amount;
    }
  });
  const unmappedIncome = filtered.filter(t => t.type === "income" && !t.chart_of_account).reduce((s, t) => s + (t.amount || 0), 0);
  if (unmappedIncome > 0) { incomeLines.push({ label: "Other Income (unclassified)", amount: unmappedIncome }); totalIncome += unmappedIncome; }

  const expenseLines = [];
  let totalExpenses = 0;
  expenseAccounts.forEach(acc => {
    const txs = txByAccount[acc.account_name] || [];
    const amount = txs.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
    if (amount > 0) {
      expenseLines.push({ label: `${acc.account_code ? acc.account_code + " · " : ""}${acc.account_name}`, amount, accountName: acc.account_name });
      totalExpenses += amount;
    }
  });
  const unmappedExpenses = filtered.filter(t => t.type === "expense" && !t.chart_of_account).reduce((s, t) => s + (t.amount || 0), 0);
  if (unmappedExpenses > 0) { expenseLines.push({ label: "Other Expenses (unclassified)", amount: unmappedExpenses }); totalExpenses += unmappedExpenses; }

  return { incomeLines, expenseLines, totalIncome, totalExpenses, netIncome: totalIncome - totalExpenses };
}

function StatCard({ label, value, sub, positive }) {
  return (
    <div className={`bg-card border rounded-2xl p-4 ${positive === true ? "border-primary/20" : positive === false ? "border-destructive/20" : "border-border"}`}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-2xl font-bold ${positive === true ? "text-primary" : positive === false ? "text-destructive" : "text-foreground"}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function StatementCard({ stmt, periodLabel }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
      >
        <div className="text-left">
          <p className="text-sm font-semibold text-foreground">{periodLabel}</p>
          <p className={`text-xs font-medium mt-0.5 ${stmt.netIncome >= 0 ? "text-primary" : "text-destructive"}`}>
            Net: {fmtSigned(stmt.netIncome)}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-primary hidden sm:block">{fmt(stmt.totalIncome)} in</span>
          <span className="text-xs text-destructive hidden sm:block">{fmt(stmt.totalExpenses)} out</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>
      {expanded && (
        <div className="px-5 pb-5 border-t border-border">
          {/* Revenue */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-1">Revenue</p>
          {stmt.incomeLines.length === 0 && <p className="text-sm text-muted-foreground pl-4 py-1">No revenue</p>}
          {stmt.incomeLines.map((l, i) => (
            <div key={i} className="flex justify-between py-1.5 pl-4 border-b border-border/30">
              <span className="text-sm text-muted-foreground">{l.label}</span>
              <span className="text-sm font-medium text-primary">{fmt(l.amount)}</span>
            </div>
          ))}
          <div className="flex justify-between py-2 border-t border-border font-semibold">
            <span className="text-sm">Total Revenue</span>
            <span className="text-sm text-primary">{fmt(stmt.totalIncome)}</span>
          </div>

          {/* Expenses */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-1">Expenses</p>
          {stmt.expenseLines.length === 0 && <p className="text-sm text-muted-foreground pl-4 py-1">No expenses</p>}
          {stmt.expenseLines.map((l, i) => (
            <div key={i} className="flex justify-between py-1.5 pl-4 border-b border-border/30">
              <span className="text-sm text-muted-foreground">{l.label}</span>
              <span className="text-sm font-medium text-destructive">{fmt(l.amount)}</span>
            </div>
          ))}
          <div className="flex justify-between py-2 border-t border-border font-semibold">
            <span className="text-sm">Total Expenses</span>
            <span className="text-sm text-destructive">{fmt(stmt.totalExpenses)}</span>
          </div>

          {/* Net */}
          <div className={`flex justify-between items-center mt-4 pt-3 border-t-2 border-border`}>
            <span className="font-bold text-foreground">Net Income</span>
            <span className={`text-lg font-bold ${stmt.netIncome >= 0 ? "text-primary" : "text-destructive"}`}>
              {fmtSigned(stmt.netIncome)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function IncomeStatement() {
  const [viewMode, setViewMode] = useState("monthly"); // monthly | quarterly | yearly | custom
  const [customFrom, setCustomFrom] = useState(format(subMonths(new Date(), 1), "yyyy-MM-dd"));
  const [customTo, setCustomTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [periodsCount, setPeriodsCount] = useState("6");

  const { data: accounts = [] } = useQuery({
    queryKey: ["chartofaccounts"],
    queryFn: () => base44.entities.ChartOfAccount.list("account_code", 200),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => base44.entities.Transaction.list("-date", 1000),
  });

  const periods = useMemo(() => {
    const n = parseInt(periodsCount);
    const now = new Date();

    if (viewMode === "monthly") {
      return Array.from({ length: n }, (_, i) => {
        const d = subMonths(now, i);
        return {
          label: format(d, "MMMM yyyy"),
          from: format(startOfMonth(d), "yyyy-MM-dd"),
          to: format(endOfMonth(d), "yyyy-MM-dd"),
        };
      }).reverse();
    }
    if (viewMode === "quarterly") {
      return Array.from({ length: n }, (_, i) => {
        const d = subQuarters(now, i);
        const qs = startOfQuarter(d);
        const qe = endOfQuarter(d);
        return {
          label: `Q${Math.ceil((qs.getMonth() + 1) / 3)} ${qs.getFullYear()}`,
          from: format(qs, "yyyy-MM-dd"),
          to: format(qe, "yyyy-MM-dd"),
        };
      }).reverse();
    }
    if (viewMode === "yearly") {
      return Array.from({ length: n }, (_, i) => {
        const d = subYears(now, i);
        return {
          label: format(d, "yyyy"),
          from: format(startOfYear(d), "yyyy-MM-dd"),
          to: format(endOfYear(d), "yyyy-MM-dd"),
        };
      }).reverse();
    }
    if (viewMode === "custom") {
      return [{
        label: `${format(parseISO(customFrom), "MMM d, yyyy")} – ${format(parseISO(customTo), "MMM d, yyyy")}`,
        from: customFrom,
        to: customTo,
      }];
    }
    return [];
  }, [viewMode, periodsCount, customFrom, customTo]);

  const statements = useMemo(() => {
    return periods.map(p => ({
      ...p,
      stmt: computeStatement(accounts, transactions, p.from, p.to),
    }));
  }, [periods, accounts, transactions]);

  // Latest period for KPIs
  const latest = statements[statements.length - 1];
  const prev = statements[statements.length - 2];

  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    statements.forEach(({ label, stmt }) => {
      const rows = [
        ["INCOME STATEMENT", label],
        [],
        ["REVENUE"],
        ...stmt.incomeLines.map(l => [l.label, l.amount]),
        ["Total Revenue", stmt.totalIncome],
        [],
        ["EXPENSES"],
        ...stmt.expenseLines.map(l => [l.label, l.amount]),
        ["Total Expenses", stmt.totalExpenses],
        [],
        ["NET INCOME", stmt.netIncome],
      ];
      const sheetName = label.replace(/[/\\?*[\]]/g, "").slice(0, 31);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), sheetName);
    });
    XLSX.writeFile(wb, `Income_Statement_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Income Statement</h1>
          <p className="text-muted-foreground mt-1">Profit & Loss by Chart of Accounts</p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
        </Button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={viewMode} onValueChange={setViewMode}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="quarterly">Quarterly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>

        {viewMode !== "custom" && (
          <Select value={periodsCount} onValueChange={setPeriodsCount}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Last 3</SelectItem>
              <SelectItem value="6">Last 6</SelectItem>
              <SelectItem value="12">Last 12</SelectItem>
            </SelectContent>
          </Select>
        )}

        {viewMode === "custom" && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">From</label>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring" />
            <label className="text-xs text-muted-foreground">To</label>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
        )}
      </div>

      {/* KPI Cards (latest period) */}
      {latest && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label={`Revenue — ${latest.label}`}
            value={fmt(latest.stmt.totalIncome)}
            sub={prev ? `vs ${fmt(prev.stmt.totalIncome)} prev period` : undefined}
            positive={true}
          />
          <StatCard
            label={`Expenses — ${latest.label}`}
            value={fmt(latest.stmt.totalExpenses)}
            sub={prev ? `vs ${fmt(prev.stmt.totalExpenses)} prev period` : undefined}
            positive={false}
          />
          <StatCard
            label={`Net Income — ${latest.label}`}
            value={fmtSigned(latest.stmt.netIncome)}
            sub={latest.stmt.totalIncome > 0 ? `${pct(latest.stmt.netIncome, latest.stmt.totalIncome)} margin` : undefined}
            positive={latest.stmt.netIncome >= 0 ? true : false}
          />
        </div>
      )}

      {/* Comparison Table (multi-period) */}
      {statements.length > 1 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Period Comparison</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Account</th>
                  {statements.map(s => (
                    <th key={s.label} className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">{s.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="bg-primary/5">
                  <td colSpan={statements.length + 1} className="px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Revenue</td>
                </tr>
                {/* Collect all unique income account labels */}
                {Array.from(new Set(statements.flatMap(s => s.stmt.incomeLines.map(l => l.label)))).map(label => (
                  <tr key={label} className="border-b border-border/40 hover:bg-muted/20">
                    <td className="px-4 py-2 pl-8 text-muted-foreground">{label}</td>
                    {statements.map(s => {
                      const line = s.stmt.incomeLines.find(l => l.label === label);
                      return <td key={s.label} className="text-right px-4 py-2 text-primary">{line ? fmt(line.amount) : "—"}</td>;
                    })}
                  </tr>
                ))}
                <tr className="border-b border-border font-semibold bg-primary/5">
                  <td className="px-4 py-2">Total Revenue</td>
                  {statements.map(s => <td key={s.label} className="text-right px-4 py-2 text-primary">{fmt(s.stmt.totalIncome)}</td>)}
                </tr>

                <tr className="bg-destructive/5">
                  <td colSpan={statements.length + 1} className="px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expenses</td>
                </tr>
                {Array.from(new Set(statements.flatMap(s => s.stmt.expenseLines.map(l => l.label)))).map(label => (
                  <tr key={label} className="border-b border-border/40 hover:bg-muted/20">
                    <td className="px-4 py-2 pl-8 text-muted-foreground">{label}</td>
                    {statements.map(s => {
                      const line = s.stmt.expenseLines.find(l => l.label === label);
                      return <td key={s.label} className="text-right px-4 py-2 text-destructive">{line ? fmt(line.amount) : "—"}</td>;
                    })}
                  </tr>
                ))}
                <tr className="border-b border-border font-semibold bg-destructive/5">
                  <td className="px-4 py-2">Total Expenses</td>
                  {statements.map(s => <td key={s.label} className="text-right px-4 py-2 text-destructive">{fmt(s.stmt.totalExpenses)}</td>)}
                </tr>

                <tr className="border-t-2 border-border font-bold">
                  <td className="px-4 py-3">Net Income</td>
                  {statements.map(s => (
                    <td key={s.label} className={`text-right px-4 py-3 text-base ${s.stmt.netIncome >= 0 ? "text-primary" : "text-destructive"}`}>
                      {fmtSigned(s.stmt.netIncome)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Individual Period Statements */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Detailed Statements</h2>
        {[...statements].reverse().map(({ label, stmt }) => (
          <StatementCard key={label} stmt={stmt} periodLabel={label} />
        ))}
      </div>
    </div>
  );
}