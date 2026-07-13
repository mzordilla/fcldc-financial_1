import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, parseISO } from "date-fns";
import { FileSpreadsheet, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import * as XLSX from "xlsx";
import { fetchAllTransactions } from "@/lib/fetchAllTransactions";

const fmt = (v) => `₱${(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const CATEGORY_LABELS = {
  project_payment: "Project Payment", material_cost: "Material Cost", labor: "Labor",
  direct_labor: "Direct Labor", equipment: "Equipment", subcontractor: "Subcontractor",
  overhead: "Overhead", operating_expense: "Operating Expense", permits: "Permits",
  insurance: "Insurance", bank_reconciliation: "Bank Reconciliation", fund_transfer: "Fund Transfer", other: "Other",
};

export default function DailyTransactionsReport({ dateFrom, dateTo }) {
  const [expandedDay, setExpandedDay] = useState(null);

  const { data: allTransactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => fetchAllTransactions("-date"),
  });

  const filtered = useMemo(() => {
    return allTransactions.filter(t => {
      if (!t.date) return false;
      if (dateFrom && t.date < dateFrom) return false;
      if (dateTo && t.date > dateTo) return false;
      return true;
    });
  }, [allTransactions, dateFrom, dateTo]);

  // Group by day
  const byDay = useMemo(() => {
    const map = {};
    filtered.forEach(t => {
      const key = t.date;
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [filtered]);

  const days = useMemo(() => Object.keys(byDay).sort((a, b) => b.localeCompare(a)), [byDay]);

  const totalIncome = filtered.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpenses = filtered.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);

  const handleExport = () => {
    const rows = [["Date", "Description", "Type", "Category", "Project / COA", "Amount"]];
    days.forEach(day => {
      const txs = byDay[day] || [];
      txs.forEach(t => rows.push([
        day,
        t.description || "",
        t.type || "",
        CATEGORY_LABELS[t.category] || t.category || "",
        t.project_code || t.chart_of_account || "",
        t.type === "income" ? (t.amount || 0) : -(t.amount || 0),
      ]));
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daily Transactions");
    XLSX.writeFile(wb, `Daily_Transactions_${dateFrom || "start"}_to_${dateTo || "end"}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Daily Transactions</h2>
          <p className="text-sm text-muted-foreground">{filtered.length} transactions across {days.length} days</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
        </Button>
      </div>

      {/* Summary */}
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

      {days.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">No transactions in this period</div>
      )}

      <div className="space-y-2">
        {days.map(day => {
          const txs = byDay[day];
          const income = txs.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
          const expenses = txs.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
          const net = income - expenses;
          const isExpanded = expandedDay === day;

          return (
            <div key={day} className="bg-card border border-border rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpandedDay(isExpanded ? null : day)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground">{format(parseISO(day), "EEEE, MMMM d, yyyy")}</p>
                    <p className="text-xs text-muted-foreground">{txs.length} transaction{txs.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-5">
                  <span className="text-xs text-primary hidden sm:block">+{fmt(income)}</span>
                  <span className="text-xs text-destructive hidden sm:block">-{fmt(expenses)}</span>
                  <span className={`text-sm font-bold ${net >= 0 ? "text-primary" : "text-destructive"}`}>{net >= 0 ? "+" : ""}{fmt(net)}</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Description</th>
                        <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Category</th>
                        <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground hidden sm:table-cell">Project / COA</th>
                        <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                        <th className="text-right px-5 py-2.5 text-xs font-medium text-muted-foreground">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {txs.map(t => (
                        <tr key={t.id} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="px-5 py-2.5 text-sm">{t.description || "—"}</td>
                          <td className="px-5 py-2.5">
                            <Badge variant="secondary" className="text-xs">{CATEGORY_LABELS[t.category] || t.category || "—"}</Badge>
                          </td>
                          <td className="px-5 py-2.5 text-xs text-muted-foreground hidden sm:table-cell">
                            {t.project_code || t.chart_of_account || "—"}
                          </td>
                          <td className="px-5 py-2.5">
                            <Badge variant="outline" className="text-xs capitalize">{t.status || "—"}</Badge>
                          </td>
                          <td className={`px-5 py-2.5 text-right text-sm font-semibold ${t.type === "income" ? "text-primary" : "text-destructive"}`}>
                            {t.type === "income" ? "+" : "-"}₱{(t.amount || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/30 border-t border-border font-semibold">
                        <td className="px-5 py-2 text-sm" colSpan={3}>Day Total</td>
                        <td />
                        <td className={`px-5 py-2 text-right text-sm ${net >= 0 ? "text-primary" : "text-destructive"}`}>
                          {net >= 0 ? "+" : ""}{fmt(net)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}