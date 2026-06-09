import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, parseISO, eachMonthOfInterval, startOfMonth } from "date-fns";
import { FileSpreadsheet, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import * as XLSX from "xlsx";

const fmt = (v) => `₱${(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const CATEGORY_LABELS = {
  project_payment: "Project Payment", material_cost: "Material Cost", labor: "Labor",
  direct_labor: "Direct Labor", equipment: "Equipment", subcontractor: "Subcontractor",
  overhead: "Overhead", operating_expense: "Operating Expense", permits: "Permits",
  insurance: "Insurance", bank_reconciliation: "Bank Reconciliation", fund_transfer: "Fund Transfer", other: "Other",
};

export default function MonthlyTransactionsReport({ dateFrom, dateTo }) {
  const [expandedMonth, setExpandedMonth] = useState(null);
  const [expandedTx, setExpandedTx] = useState(null);

  const { data: allTransactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => base44.entities.Transaction.list("-date", 1000),
  });

  const filtered = useMemo(() => {
    return allTransactions.filter(t => {
      if (!t.date) return false;
      if (dateFrom && t.date < dateFrom) return false;
      if (dateTo && t.date > dateTo) return false;
      return true;
    });
  }, [allTransactions, dateFrom, dateTo]);

  const months = useMemo(() => {
    if (!dateFrom || !dateTo) return [];
    return eachMonthOfInterval({ start: startOfMonth(parseISO(dateFrom)), end: startOfMonth(parseISO(dateTo)) });
  }, [dateFrom, dateTo]);

  const byMonth = useMemo(() => {
    const map = {};
    filtered.forEach(t => {
      if (!t.date) return;
      const key = format(parseISO(t.date), "yyyy-MM");
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [filtered]);

  const totalIncome = filtered.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpenses = filtered.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);

  const handleExport = () => {
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryRows = [["Month", "Transactions", "Income", "Expenses", "Net"]];
    [...months].reverse().forEach(m => {
      const key = format(m, "yyyy-MM");
      const txs = byMonth[key] || [];
      const inc = txs.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
      const exp = txs.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
      summaryRows.push([format(m, "MMMM yyyy"), txs.length, inc, exp, inc - exp]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), "Monthly Summary");

    // Detail sheets per month
    [...months].reverse().forEach(m => {
      const key = format(m, "yyyy-MM");
      const txs = byMonth[key] || [];
      if (txs.length === 0) return;
      const sheetName = format(m, "MMM yyyy");
      const rows = [["Date", "Description", "Type", "Category", "Project / COA", "Amount"]];
      txs.forEach(t => rows.push([
        t.date, t.description || "", t.type || "",
        CATEGORY_LABELS[t.category] || t.category || "",
        t.project_code || t.chart_of_account || "",
        t.type === "income" ? (t.amount || 0) : -(t.amount || 0),
      ]));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), sheetName);
    });

    XLSX.writeFile(wb, `Monthly_Transactions_${dateFrom || "start"}_to_${dateTo || "end"}.xlsx`);
  };

  const orderedMonths = [...months].reverse();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Monthly Transactions</h2>
          <p className="text-sm text-muted-foreground">{filtered.length} transactions across {months.length} months</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
        </Button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-primary/20 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Income</p>
          <p className="text-xl font-bold text-primary">{fmt(totalIncome)}</p>
        </div>
        <div className="bg-card border border-destructive/20 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Expenses</p>
          <p className="text-xl font-bold text-destructive">{fmt(totalExpenses)}</p>
        </div>
        <div className={`bg-card border rounded-2xl p-4 ${totalIncome - totalExpenses >= 0 ? "border-primary/20" : "border-destructive/20"}`}>
          <p className="text-xs text-muted-foreground mb-1">Net</p>
          <p className={`text-xl font-bold ${totalIncome - totalExpenses >= 0 ? "text-primary" : "text-destructive"}`}>{fmt(totalIncome - totalExpenses)}</p>
        </div>
      </div>

      {/* Category breakdown table across all months */}
      {orderedMonths.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Month</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground"># Txns</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-primary">Income</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-destructive">Expenses</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Net</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {orderedMonths.map(m => {
                const key = format(m, "yyyy-MM");
                const label = format(m, "MMMM yyyy");
                const txs = byMonth[key] || [];
                const income = txs.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
                const expenses = txs.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
                const net = income - expenses;
                const isExpanded = expandedMonth === key;

                // Group by category for breakdown
                const byCategory = {};
                txs.forEach(t => {
                  const cat = CATEGORY_LABELS[t.category] || t.category || "Other";
                  if (!byCategory[cat]) byCategory[cat] = { income: 0, expenses: 0, txs: [] };
                  if (t.type === "income") byCategory[cat].income += t.amount || 0;
                  else byCategory[cat].expenses += t.amount || 0;
                  byCategory[cat].txs.push(t);
                });

                return (
                  <>
                    <tr
                      key={key}
                      onClick={() => setExpandedMonth(isExpanded ? null : key)}
                      className={`border-b border-border/50 cursor-pointer hover:bg-muted/30 transition-colors ${isExpanded ? "bg-muted/20" : ""}`}
                    >
                      <td className="px-5 py-3 font-medium text-foreground">{label}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{txs.length}</td>
                      <td className="px-4 py-3 text-right text-primary font-medium">{fmt(income)}</td>
                      <td className="px-4 py-3 text-right text-destructive font-medium">{fmt(expenses)}</td>
                      <td className={`px-5 py-3 text-right font-bold ${net >= 0 ? "text-primary" : "text-destructive"}`}>{net >= 0 ? "+" : ""}{fmt(net)}</td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${key}-detail`} className="border-b border-border bg-muted/10">
                        <td colSpan={6} className="px-5 py-3">
                          {/* Category Breakdown */}
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Breakdown by Category</p>
                          <div className="space-y-1 mb-4">
                            {Object.entries(byCategory).map(([cat, data]) => (
                              <div key={cat} className="flex justify-between text-xs px-2 py-1.5 rounded-lg hover:bg-muted/40">
                                <span className="text-foreground font-medium">{cat}</span>
                                <div className="flex gap-6">
                                  {data.income > 0 && <span className="text-primary">+{fmt(data.income)}</span>}
                                  {data.expenses > 0 && <span className="text-destructive">-{fmt(data.expenses)}</span>}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Transaction List */}
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">All Transactions</p>
                          <div className="overflow-x-auto rounded-xl border border-border">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-border bg-muted/40">
                                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Date</th>
                                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Description</th>
                                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Category</th>
                                  <th className="text-left px-4 py-2 font-medium text-muted-foreground hidden sm:table-cell">Project / COA</th>
                                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[...txs].sort((a, b) => b.date?.localeCompare(a.date)).map(t => (
                                  <tr key={t.id} className="border-b border-border/40 hover:bg-muted/20">
                                    <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{t.date ? format(parseISO(t.date), "MMM d") : "—"}</td>
                                    <td className="px-4 py-2 text-foreground">{t.description || "—"}</td>
                                    <td className="px-4 py-2">
                                      <Badge variant="secondary" className="text-xs">{CATEGORY_LABELS[t.category] || t.category || "—"}</Badge>
                                    </td>
                                    <td className="px-4 py-2 text-muted-foreground hidden sm:table-cell">{t.project_code || t.chart_of_account || "—"}</td>
                                    <td className={`px-4 py-2 text-right font-semibold ${t.type === "income" ? "text-primary" : "text-destructive"}`}>
                                      {t.type === "income" ? "+" : "-"}₱{(t.amount || 0).toLocaleString()}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {months.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">No transactions in this period</div>
      )}
    </div>
  );
}