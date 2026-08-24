import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as XLSX from "xlsx";
import { format, parseISO, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { fetchAllTransactions } from "@/lib/fetchAllTransactions";
import { buildPeriod } from "./comparativeIncomeStatementUtils";
import ComparativeIncomeStatementTable from "./ComparativeIncomeStatementTable";
import TransactionDrilldownDialog from "./TransactionDrilldownDialog";

const fmt = (v) => `₱${(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const fmtSigned = (v) => (v < 0 ? `-₱${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `₱${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`);

export default function IncomeStatementReport({ dateFrom, dateTo }) {
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [drilldown, setDrilldown] = useState(null);

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => fetchAllTransactions("-date"),
  });

  const periods = useMemo(() => {
    if (!dateFrom || !dateTo) return [];
    const rangeStart = parseISO(dateFrom);
    const rangeEnd = parseISO(dateTo);
    const months = [];
    let cursor = startOfMonth(rangeStart);
    while (cursor <= rangeEnd) {
      const mStart = cursor;
      const mEnd = endOfMonth(cursor);
      const from = mStart < rangeStart ? dateFrom : format(mStart, "yyyy-MM-dd");
      const to = mEnd > rangeEnd ? dateTo : format(mEnd, "yyyy-MM-dd");
      months.push({
        key: format(mStart, "yyyy-MM"),
        label: format(mStart, "MMM yyyy"),
        ...buildPeriod(transactions, from, to),
      });
      cursor = addMonths(cursor, 1);
    }
    if (selectedMonth !== "all") return months.filter(month => month.key === selectedMonth);
    const total = {
      label: "Total",
      ...buildPeriod(transactions, dateFrom, dateTo),
    };
    return [...months, total];
  }, [transactions, dateFrom, dateTo, selectedMonth]);

  const totalPeriod = periods[periods.length - 1];
  const totalIncome = totalPeriod?.totalRevenue + totalPeriod?.totalOtherIncome || 0;
  const totalExpenses = totalPeriod?.totalCOGS + totalPeriod?.totalOpex + totalPeriod?.totalOtherExpense || 0;
  const netIncome = totalPeriod?.incomeBeforeTax || 0;

  const periodLabel = dateFrom && dateTo
    ? `${format(parseISO(dateFrom), "MMMM d, yyyy")} – ${format(parseISO(dateTo), "MMMM d, yyyy")}`
    : "All Periods";

  const handleExport = () => {
    const rows = [["Line Item", ...periods.map(p => p.label)]];
    const addSection = (title, sectionKey, totalKey) => {
      rows.push([title]);
      const allAccounts = Array.from(new Set(periods.flatMap(p => Object.keys(p.buckets[sectionKey]))));
      allAccounts.forEach(acct => {
        rows.push([acct, ...periods.map(p => p.buckets[sectionKey][acct] || 0)]);
      });
      rows.push([`Total ${title}`, ...periods.map(p => p[totalKey])]);
    };
    addSection("Revenue", "revenue", "totalRevenue");
    addSection("Cost of Sales", "cogs", "totalCOGS");
    rows.push(["Gross Profit", ...periods.map(p => p.grossProfit)]);
    addSection("Operating Expenses", "opex", "totalOpex");
    rows.push(["Operating Income", ...periods.map(p => p.operatingIncome)]);
    addSection("Other Income", "otherIncome", "totalOtherIncome");
    addSection("Other Expenses", "otherExpense", "totalOtherExpense");
    rows.push(["Income Before Tax", ...periods.map(p => p.incomeBeforeTax)]);
    rows.push(["Net Income", ...periods.map(p => p.incomeBeforeTax)]);

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
          <p className="text-sm text-muted-foreground">{periodLabel} — monthly comparison</p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
        </Button>
      </div>

      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
        <SelectTrigger className="w-48"><SelectValue placeholder="Select Month" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Months</SelectItem>
          {dateFrom && dateTo && Array.from({ length: Math.max(0, (parseISO(dateTo).getFullYear() - parseISO(dateFrom).getFullYear()) * 12 + parseISO(dateTo).getMonth() - parseISO(dateFrom).getMonth() + 1) }, (_, index) => addMonths(startOfMonth(parseISO(dateFrom)), index)).map(month => (
            <SelectItem key={format(month, "yyyy-MM")} value={format(month, "yyyy-MM")}>{format(month, "MMMM yyyy")}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-primary/20 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-primary">{fmt(totalIncome)}</p>
        </div>
        <div className="bg-card border border-destructive/20 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Expenses</p>
          <p className="text-2xl font-bold text-destructive">{fmt(totalExpenses)}</p>
        </div>
        <div className={`bg-card border rounded-2xl p-4 ${netIncome >= 0 ? "border-primary/20" : "border-destructive/20"}`}>
          <p className="text-xs text-muted-foreground mb-1">Net Income</p>
          <p className={`text-2xl font-bold ${netIncome >= 0 ? "text-primary" : "text-destructive"}`}>
            {fmtSigned(netIncome)}
          </p>
          {totalIncome > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((netIncome / totalIncome) * 100)}% margin
            </p>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground italic">Click any account amount to view its underlying transactions.</p>

      <ComparativeIncomeStatementTable
        periods={periods}
        taxRate={0}
        onDrilldown={(title, txs) => setDrilldown({ title, transactions: txs })}
      />

      <TransactionDrilldownDialog
        open={!!drilldown}
        onOpenChange={(v) => { if (!v) setDrilldown(null); }}
        title={drilldown?.title}
        transactions={drilldown?.transactions || []}
      />
    </div>
  );
}