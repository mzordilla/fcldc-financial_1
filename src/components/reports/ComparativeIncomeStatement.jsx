import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, endOfYear, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as XLSX from "xlsx";
import { fetchAllTransactions } from "@/lib/fetchAllTransactions";
import { buildPeriod, incomeStatementAccountNames } from "./comparativeIncomeStatementUtils";
import ComparativeIncomeStatementTable from "./ComparativeIncomeStatementTable";
import TransactionDrilldownDialog from "./TransactionDrilldownDialog";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function ComparativeIncomeStatement() {
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth()));
  const [projectFilter, setProjectFilter] = useState("all");
  const [taxRate, setTaxRate] = useState(0);
  const [drilldown, setDrilldown] = useState(null);

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => fetchAllTransactions("-date"),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("project_name", 500),
  });

  const { data: chartOfAccounts = [] } = useQuery({
    queryKey: ["chartofaccounts"],
    queryFn: () => base44.entities.ChartOfAccount.list("account_code", 1000),
  });

  const bsAccounts = useMemo(() => incomeStatementAccountNames(chartOfAccounts), [chartOfAccounts]);

  const years = useMemo(() => {
    const set = new Set(transactions.map(t => t.date ? parseInt(t.date.slice(0, 4)) : null).filter(Boolean));
    set.add(new Date().getFullYear());
    return Array.from(set).sort((a, b) => b - a);
  }, [transactions]);

  const filteredTx = useMemo(() => {
    if (projectFilter === "all") return transactions;
    return transactions.filter(t => t.project_code === projectFilter);
  }, [transactions, projectFilter]);

  const periods = useMemo(() => {
    const yearStart = new Date(fiscalYear, 0, 1);
    const months = Array.from({ length: 12 }, (_, i) => {
      const mStart = startOfMonth(addMonths(yearStart, i));
      const mEnd = endOfMonth(mStart);
      return {
        label: MONTH_LABELS[i],
        ...buildPeriod(filteredTx, format(mStart, "yyyy-MM-dd"), format(mEnd, "yyyy-MM-dd"), bsAccounts),
      };
    });
    const today = new Date();
    const ytdEnd = fiscalYear === today.getFullYear() ? today : endOfYear(yearStart);
    const ytd = {
      label: "YTD",
      ...buildPeriod(filteredTx, format(yearStart, "yyyy-MM-dd"), format(ytdEnd, "yyyy-MM-dd"), bsAccounts),
    };
    return selectedMonth === "all" ? [...months, ytd] : [months[Number(selectedMonth)], ytd];
  }, [filteredTx, fiscalYear, selectedMonth, bsAccounts]);

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
    rows.push(["Income Before Tax", ...periods.map(p => p.incomeBeforeTax)]);
    rows.push(["Income Tax", ...periods.map(p => Math.max(0, p.incomeBeforeTax) * taxRate / 100)]);
    rows.push(["Net Income", ...periods.map(p => p.incomeBeforeTax - Math.max(0, p.incomeBeforeTax) * taxRate / 100)]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Income Statement");
    XLSX.writeFile(wb, `Comparative_Income_Statement_${fiscalYear}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Comparative Income Statement</h2>
          <p className="text-sm text-muted-foreground">Monthly columns with Year-to-Date total, grouped by Chart of Accounts</p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={String(fiscalYear)} onValueChange={v => setFiscalYear(parseInt(v))}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Select Month" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {MONTH_LABELS.map((month, index) => <SelectItem key={month} value={String(index)}>{month}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-52"><SelectValue placeholder="All Projects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.filter(p => p.project_code).map(p => (
              <SelectItem key={p.id} value={p.project_code}>{p.project_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground whitespace-nowrap">Tax Rate %</label>
          <input
            type="number"
            step="0.01"
            value={taxRate}
            onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
            className="h-9 w-20 rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground italic">Click any account amount to view its underlying transactions. Note: filtering by Company, Branch, and Cost Center isn't available yet since the app doesn't currently track those dimensions.</p>

      <ComparativeIncomeStatementTable
        periods={periods}
        taxRate={taxRate}
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